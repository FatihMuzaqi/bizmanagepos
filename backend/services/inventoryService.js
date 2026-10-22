const { StockMovement, Ingredient, Unit, Outlet, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');
const { recordAuditLog } = require('./auditLogService');

/**
 * Calculate current real-time stock balance for an ingredient in a specific outlet
 * Stock = SUM(IN) + SUM(ADJUSTMENT) - SUM(OUT)
 */
const getCurrentStock = async (businessId, outletId, ingredientId, transaction = null) => {
  const inSum = await StockMovement.sum('quantity', {
    where: {
      business_id: businessId,
      outlet_id: outletId,
      ingredient_id: ingredientId,
      type: 'IN'
    },
    transaction
  }) || 0;

  const outSum = await StockMovement.sum('quantity', {
    where: {
      business_id: businessId,
      outlet_id: outletId,
      ingredient_id: ingredientId,
      type: 'OUT'
    },
    transaction
  }) || 0;

  const adjSum = await StockMovement.sum('quantity', {
    where: {
      business_id: businessId,
      outlet_id: outletId,
      ingredient_id: ingredientId,
      type: 'ADJUSTMENT'
    },
    transaction
  }) || 0;

  const current = Number(inSum) - Number(outSum) + Number(adjSum);
  return parseFloat(current.toFixed(4));
};

/**
 * Record Stock In movement (Purchases, Initial Stock, Restock)
 */
const recordStockIn = async (businessId, userId, data) => {
  const { outlet_id, ingredient_id, quantity, reference_type, reference_id, notes } = data;

  // 1. Verify outlet belongs to business
  const outlet = await Outlet.findOne({
    where: { id: outlet_id, business_id: businessId }
  });
  if (!outlet) {
    throw new NotFoundError('Outlet not found in this business');
  }

  // 2. Verify ingredient belongs to business
  const ingredient = await Ingredient.findOne({
    where: { id: ingredient_id, business_id: businessId, is_active: true }
  });
  if (!ingredient) {
    throw new NotFoundError('Active raw ingredient not found in this business');
  }

  const qty = parseFloat(Math.abs(Number(quantity)).toFixed(4));
  if (qty <= 0) {
    throw new ValidationError('Stock In quantity must be greater than zero');
  }

  return await sequelize.transaction(async (t) => {
    const movement = await StockMovement.create({
      business_id: businessId,
      outlet_id,
      ingredient_id,
      type: 'IN',
      quantity: qty,
      reference_type: reference_type || 'MANUAL_IN',
      reference_id: reference_id || null,
      notes: notes || null,
      created_by: userId
    }, { transaction: t });

    await recordAuditLog({
      business_id: businessId,
      user_id: userId,
      action: 'STOCK_IN',
      entity_type: 'STOCK',
      entity_id: movement.id,
      metadata: { ingredient_id, outlet_id, quantity: qty, reference_type },
      transaction: t
    });

    const newStock = await getCurrentStock(businessId, outlet_id, ingredient_id, t);

    return {
      movement,
      ingredient_id,
      outlet_id,
      current_stock: newStock
    };
  });
};

/**
 * Record Stock Out movement (Usage, Spoilage/Waste, Return)
 * Strictly verifies that stock does not drop below 0
 */
const recordStockOut = async (businessId, userId, data) => {
  const { outlet_id, ingredient_id, quantity, reference_type, reference_id, notes } = data;

  // 1. Verify outlet belongs to business
  const outlet = await Outlet.findOne({
    where: { id: outlet_id, business_id: businessId }
  });
  if (!outlet) {
    throw new NotFoundError('Outlet not found in this business');
  }

  // 2. Verify ingredient belongs to business
  const ingredient = await Ingredient.findOne({
    where: { id: ingredient_id, business_id: businessId, is_active: true }
  });
  if (!ingredient) {
    throw new NotFoundError('Active raw ingredient not found in this business');
  }

  const deductQty = parseFloat(Math.abs(Number(quantity)).toFixed(4));
  if (deductQty <= 0) {
    throw new ValidationError('Stock Out quantity must be greater than zero');
  }

  return await sequelize.transaction(async (t) => {
    const currentStock = await getCurrentStock(businessId, outlet_id, ingredient_id, t);

    if (currentStock < deductQty) {
      throw new ValidationError(
        `Insufficient stock balance for ${ingredient.name}. Current stock: ${currentStock}, Requested deduction: ${deductQty}`
      );
    }

    const movement = await StockMovement.create({
      business_id: businessId,
      outlet_id,
      ingredient_id,
      type: 'OUT',
      quantity: deductQty,
      reference_type: reference_type || 'MANUAL_OUT',
      reference_id: reference_id || null,
      notes: notes || null,
      created_by: userId
    }, { transaction: t });

    await recordAuditLog({
      business_id: businessId,
      user_id: userId,
      action: 'STOCK_OUT',
      entity_type: 'STOCK',
      entity_id: movement.id,
      metadata: { ingredient_id, outlet_id, quantity: deductQty, reference_type },
      transaction: t
    });

    const newStock = await getCurrentStock(businessId, outlet_id, ingredient_id, t);

    return {
      movement,
      ingredient_id,
      outlet_id,
      previous_stock: currentStock,
      current_stock: newStock
    };
  });
};

/**
 * Record Stock Adjustment (Stock Opname / Physical Count Correction)
 */
const recordStockAdjustment = async (businessId, userId, data) => {
  const { outlet_id, ingredient_id, actual_stock, delta_quantity, notes } = data;

  // 1. Verify outlet
  const outlet = await Outlet.findOne({
    where: { id: outlet_id, business_id: businessId }
  });
  if (!outlet) {
    throw new NotFoundError('Outlet not found in this business');
  }

  // 2. Verify ingredient
  const ingredient = await Ingredient.findOne({
    where: { id: ingredient_id, business_id: businessId, is_active: true }
  });
  if (!ingredient) {
    throw new NotFoundError('Active raw ingredient not found in this business');
  }

  return await sequelize.transaction(async (t) => {
    const currentStock = await getCurrentStock(businessId, outlet_id, ingredient_id, t);
    let delta = 0;

    if (actual_stock !== undefined && actual_stock !== null) {
      const target = parseFloat(Number(actual_stock).toFixed(4));
      if (target < 0) {
        throw new ValidationError('Actual physical stock count cannot be negative');
      }
      delta = parseFloat((target - currentStock).toFixed(4));
    } else if (delta_quantity !== undefined && delta_quantity !== null) {
      delta = parseFloat(Number(delta_quantity).toFixed(4));
      if (currentStock + delta < 0) {
        throw new ValidationError(
          `Adjustment would result in negative stock balance (${currentStock + delta}). Current stock: ${currentStock}`
        );
      }
    } else {
      throw new ValidationError('Either actual_stock or delta_quantity must be provided');
    }

    if (delta === 0) {
      return {
        movement: null,
        ingredient_id,
        outlet_id,
        current_stock: currentStock,
        message: 'Stock level already matches the physical count, no adjustment movement needed'
      };
    }

    const movement = await StockMovement.create({
      business_id: businessId,
      outlet_id,
      ingredient_id,
      type: 'ADJUSTMENT',
      quantity: delta,
      reference_type: 'ADJUSTMENT',
      reference_id: null,
      notes: notes || `Stock Opname: adjusted by ${delta > 0 ? '+' : ''}${delta}`,
      created_by: userId
    }, { transaction: t });

    await recordAuditLog({
      business_id: businessId,
      user_id: userId,
      action: 'STOCK_ADJUSTMENT',
      entity_type: 'STOCK',
      entity_id: movement.id,
      metadata: { ingredient_id, outlet_id, delta, actual_stock },
      transaction: t
    });

    const newStock = await getCurrentStock(businessId, outlet_id, ingredient_id, t);

    return {
      movement,
      ingredient_id,
      outlet_id,
      previous_stock: currentStock,
      adjustment_delta: delta,
      current_stock: newStock
    };
  });
};

/**
 * Get current stock levels for all ingredients in an outlet
 */
const getOutletStockList = async (businessId, outletId, query = {}) => {
  const outlet = await Outlet.findOne({
    where: { id: outletId, business_id: businessId }
  });
  if (!outlet) {
    throw new NotFoundError('Outlet not found in this business');
  }

  const where = { business_id: businessId };
  if (query.is_active !== undefined) {
    where.is_active = query.is_active === 'true' || query.is_active === true;
  } else {
    where.is_active = true;
  }

  if (query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { sku: { [Op.like]: `%${query.search}%` } }
    ];
  }

  const ingredients = await Ingredient.findAll({
    where,
    include: [
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'name', 'symbol']
      }
    ],
    order: [['name', 'ASC']]
  });

  const stockList = await Promise.all(
    ingredients.map(async (ing) => {
      const currentStock = await getCurrentStock(businessId, outletId, ing.id);
      const minStock = parseFloat(ing.minimum_stock);

      let status = 'NORMAL';
      if (currentStock <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (currentStock <= minStock) {
        status = 'LOW_STOCK';
      }

      return {
        ingredient_id: ing.id,
        name: ing.name,
        sku: ing.sku,
        unit: ing.unit,
        minimum_stock: minStock,
        cost_per_unit: parseFloat(ing.cost_per_unit),
        current_stock: currentStock,
        status
      };
    })
  );

  let filtered = stockList;
  if (query.status) {
    const statusUpper = query.status.toUpperCase();
    filtered = stockList.filter(item => item.status === statusUpper);
  }

  return {
    outlet: {
      id: outlet.id,
      name: outlet.name,
      code: outlet.code
    },
    items: filtered,
    totalItems: filtered.length
  };
};

/**
 * Get stock info for a single ingredient in an outlet
 */
const getIngredientStock = async (businessId, outletId, ingredientId) => {
  const outlet = await Outlet.findOne({
    where: { id: outletId, business_id: businessId }
  });
  if (!outlet) {
    throw new NotFoundError('Outlet not found in this business');
  }

  const ingredient = await Ingredient.findOne({
    where: { id: ingredientId, business_id: businessId },
    include: [
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'name', 'symbol']
      }
    ]
  });
  if (!ingredient) {
    throw new NotFoundError('Ingredient not found in this business');
  }

  const currentStock = await getCurrentStock(businessId, outletId, ingredientId);
  const minStock = parseFloat(ingredient.minimum_stock);

  let status = 'NORMAL';
  if (currentStock <= 0) {
    status = 'OUT_OF_STOCK';
  } else if (currentStock <= minStock) {
    status = 'LOW_STOCK';
  }

  return {
    outlet: {
      id: outlet.id,
      name: outlet.name,
      code: outlet.code
    },
    ingredient: {
      id: ingredient.id,
      name: ingredient.name,
      sku: ingredient.sku,
      unit: ingredient.unit,
      minimum_stock: minStock,
      cost_per_unit: parseFloat(ingredient.cost_per_unit)
    },
    current_stock: currentStock,
    status
  };
};

/**
 * List stock movements history with filters and pagination
 */
const listStockMovements = async (businessId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const where = { business_id: businessId };

  if (query.outlet_id) {
    where.outlet_id = query.outlet_id;
  }

  if (query.ingredient_id) {
    where.ingredient_id = query.ingredient_id;
  }

  if (query.type) {
    where.type = query.type.toUpperCase();
  }

  if (query.reference_type) {
    where.reference_type = query.reference_type;
  }

  if (query.start_date && query.end_date) {
    where.created_at = {
      [Op.between]: [new Date(query.start_date), new Date(query.end_date)]
    };
  } else if (query.start_date) {
    where.created_at = { [Op.gte]: new Date(query.start_date) };
  } else if (query.end_date) {
    where.created_at = { [Op.lte]: new Date(query.end_date) };
  }

  const { rows: movements, count: totalItems } = await StockMovement.findAndCountAll({
    where,
    include: [
      {
        model: Outlet,
        as: 'outlet',
        attributes: ['id', 'name', 'code']
      },
      {
        model: Ingredient,
        as: 'ingredient',
        attributes: ['id', 'name', 'sku'],
        include: [
          {
            model: Unit,
            as: 'unit',
            attributes: ['id', 'name', 'symbol']
          }
        ]
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email']
      }
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset
  });

  return { movements, totalItems, page, limit };
};

module.exports = {
  getCurrentStock,
  recordStockIn,
  recordStockOut,
  recordStockAdjustment,
  getOutletStockList,
  getIngredientStock,
  listStockMovements
};

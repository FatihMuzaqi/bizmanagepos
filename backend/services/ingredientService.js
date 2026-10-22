const { Ingredient, Unit, RecipeItem, StockMovement } = require('../models');
const { Op } = require('sequelize');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errors');

/**
 * List ingredients with pagination, search, and unit inclusion
 */
const listIngredients = async (businessId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const where = { business_id: businessId };

  if (query.is_active !== undefined) {
    where.is_active = query.is_active === 'true' || query.is_active === true;
  }

  if (query.unit_id) {
    where.unit_id = query.unit_id;
  }

  if (query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { sku: { [Op.like]: `%${query.search}%` } }
    ];
  }

  const { rows: ingredients, count: totalItems } = await Ingredient.findAndCountAll({
    where,
    include: [
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'name', 'symbol']
      }
    ],
    order: [['name', 'ASC']],
    limit,
    offset
  });

  return { ingredients, totalItems, page, limit };
};

/**
 * Get ingredient by ID with unit details
 */
const getIngredientById = async (businessId, ingredientId) => {
  const ingredient = await Ingredient.findOne({
    where: {
      id: ingredientId,
      business_id: businessId
    },
    include: [
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'name', 'symbol']
      }
    ]
  });

  if (!ingredient) {
    throw new NotFoundError('Ingredient not found');
  }

  return ingredient;
};

/**
 * Create a new raw ingredient
 */
const createIngredient = async (businessId, data) => {
  // 1. Verify Unit belongs to this business
  const unit = await Unit.findOne({
    where: {
      id: data.unit_id,
      business_id: businessId
    }
  });

  if (!unit) {
    throw new NotFoundError('Measurement unit not found in this business');
  }

  // 2. Check duplicate name
  const existingName = await Ingredient.findOne({
    where: {
      business_id: businessId,
      name: data.name.trim()
    }
  });

  if (existingName) {
    throw new ConflictError(`Ingredient with name '${data.name}' already exists`);
  }

  // 3. Check duplicate SKU if provided
  if (data.sku && data.sku.trim()) {
    const existingSku = await Ingredient.findOne({
      where: {
        business_id: businessId,
        sku: data.sku.trim()
      }
    });

    if (existingSku) {
      throw new ConflictError(`Ingredient with SKU '${data.sku}' already exists`);
    }
  }

  const ingredient = await Ingredient.create({
    business_id: businessId,
    unit_id: data.unit_id,
    name: data.name.trim(),
    sku: data.sku ? data.sku.trim() : null,
    minimum_stock: data.minimum_stock !== undefined ? data.minimum_stock : 0.0000,
    cost_per_unit: data.cost_per_unit !== undefined ? data.cost_per_unit : 0.0000,
    is_active: data.is_active !== undefined ? data.is_active : true
  });

  return getIngredientById(businessId, ingredient.id);
};

/**
 * Update an existing ingredient
 */
const updateIngredient = async (businessId, ingredientId, data) => {
  const ingredient = await getIngredientById(businessId, ingredientId);

  // 1. Check unit if updated
  if (data.unit_id && data.unit_id !== ingredient.unit_id) {
    const unit = await Unit.findOne({
      where: {
        id: data.unit_id,
        business_id: businessId
      }
    });

    if (!unit) {
      throw new NotFoundError('Measurement unit not found in this business');
    }
  }

  // 2. Check duplicate name
  if (data.name && data.name.trim().toLowerCase() !== ingredient.name.toLowerCase()) {
    const existingName = await Ingredient.findOne({
      where: {
        business_id: businessId,
        name: data.name.trim(),
        id: { [Op.ne]: ingredientId }
      }
    });

    if (existingName) {
      throw new ConflictError(`Ingredient with name '${data.name}' already exists`);
    }
  }

  // 3. Check duplicate SKU
  if (data.sku && data.sku.trim() && data.sku.trim() !== ingredient.sku) {
    const existingSku = await Ingredient.findOne({
      where: {
        business_id: businessId,
        sku: data.sku.trim(),
        id: { [Op.ne]: ingredientId }
      }
    });

    if (existingSku) {
      throw new ConflictError(`Ingredient with SKU '${data.sku}' already exists`);
    }
  }

  await ingredient.update({
    unit_id: data.unit_id !== undefined ? data.unit_id : ingredient.unit_id,
    name: data.name !== undefined ? data.name.trim() : ingredient.name,
    sku: data.sku !== undefined ? (data.sku ? data.sku.trim() : null) : ingredient.sku,
    minimum_stock: data.minimum_stock !== undefined ? data.minimum_stock : ingredient.minimum_stock,
    cost_per_unit: data.cost_per_unit !== undefined ? data.cost_per_unit : ingredient.cost_per_unit,
    is_active: data.is_active !== undefined ? data.is_active : ingredient.is_active
  });

  return getIngredientById(businessId, ingredient.id);
};

/**
 * Delete or deactivate an ingredient
 */
const deleteIngredient = async (businessId, ingredientId) => {
  const ingredient = await getIngredientById(businessId, ingredientId);

  // Check if ingredient is used in recipes or movements
  const hasRecipes = await RecipeItem.count({ where: { ingredient_id: ingredientId } });
  const hasMovements = await StockMovement.count({ where: { ingredient_id: ingredientId } });

  if (hasRecipes > 0 || hasMovements > 0) {
    // Deactivate instead of hard deleting to preserve audit history and recipe integrity
    await ingredient.update({ is_active: false });
    return { deactivated: true, message: 'Ingredient deactivated because it has linked recipes or stock movement history' };
  }

  await ingredient.destroy();
  return { deleted: true, message: 'Ingredient deleted successfully' };
};

module.exports = {
  listIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient
};

const {
  Transaction,
  TransactionItem,
  TransactionItemModifier,
  Payment,
  Product,
  ProductVariant,
  Modifier,
  ModifierOption,
  Recipe,
  RecipeItem,
  Ingredient,
  Unit,
  Outlet,
  User,
  StockMovement,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const { NotFoundError, ValidationError, BadRequestError, ForbiddenError } = require('../utils/customErrors');
const { getCurrentStock } = require('./inventoryService');
const { getUserAllowedOutlets } = require('./rbacService');
const { recordAuditLog } = require('./auditLogService');

/**
 * Standard eager loading options for Transactions
 */
const transactionIncludes = [
  {
    model: Outlet,
    as: 'outlet',
    attributes: ['id', 'name', 'code', 'address', 'phone']
  },
  {
    model: User,
    as: 'cashier',
    attributes: ['id', 'name', 'email']
  },
  {
    model: TransactionItem,
    as: 'items',
    include: [
      {
        model: TransactionItemModifier,
        as: 'modifiers',
        attributes: ['id', 'modifier_id', 'modifier_option_id', 'name', 'price']
      }
    ]
  },
  {
    model: Payment,
    as: 'payment',
    attributes: ['id', 'method', 'amount', 'paid_amount', 'change_amount', 'status', 'paid_at']
  }
];

/**
 * Helper to generate a unique invoice number: INV-YYYYMMDD-XXXXXX
 */
const generateInvoiceNumber = async (businessId, transaction = null) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  const todayCount = await Transaction.count({
    where: {
      business_id: businessId,
      invoice_number: {
        [Op.like]: `INV-${datePrefix}-%`
      }
    },
    transaction
  });

  const sequence = String(todayCount + 1).padStart(6, '0');
  return `INV-${datePrefix}-${sequence}`;
};

/**
 * Create a new POS transaction with full server-side price calculation,
 * payment verification, and automatic recipe stock deduction.
 */
const createTransaction = async (businessId, userId, isOwner, data) => {
  const { outlet_id, items, discount = 0, tax = 0, note, payment } = data;

  // 1. Verify outlet belongs to business & user has access
  const outlet = await Outlet.findOne({
    where: { id: outlet_id, business_id: businessId, is_active: true }
  });
  if (!outlet) {
    throw new NotFoundError('Outlet not found or inactive');
  }

  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
  if (!allowedOutletIds.includes(Number(outlet_id))) {
    throw new ForbiddenError('You do not have access to process transactions in this outlet');
  }

  // 2. Start atomic transaction for price calculation, stock validation, and record insertion
  return await sequelize.transaction(async (t) => {
    let subtotal = 0;
    const preparedItems = [];
    const requiredIngredients = new Map(); // ingredientId -> { ingredient_id, name, requiredQty }

    for (const item of items) {
      // 2a. Fetch Product
      const product = await Product.findOne({
        where: { id: item.product_id, business_id: businessId, is_active: true },
        transaction: t
      });
      if (!product) {
        throw new NotFoundError(`Product ID ${item.product_id} not found or inactive`);
      }

      let unitPrice = parseFloat(product.selling_price);
      let productName = product.name;
      let variantName = null;

      // 2b. Fetch Variant if provided
      if (item.variant_id) {
        const variant = await ProductVariant.findOne({
          where: { id: item.variant_id, product_id: product.id, is_active: true },
          transaction: t
        });
        if (!variant) {
          throw new NotFoundError(`Product variant ID ${item.variant_id} not found or inactive for product '${product.name}'`);
        }
        unitPrice = parseFloat(variant.selling_price);
        variantName = variant.name;
      }

      // 2c. Fetch Modifiers if provided
      const preparedModifiers = [];
      let totalModifierPrice = 0;

      if (item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          const optionId = mod.modifier_option_id || mod.option_id || mod.id;
          const modOption = await ModifierOption.findOne({
            where: { id: optionId, is_active: true },
            include: [
              {
                model: Modifier,
                as: 'modifier',
                where: { business_id: businessId, is_active: true }
              }
            ],
            transaction: t
          });

          if (!modOption) {
            throw new NotFoundError(`Modifier option ID ${optionId} not found or inactive`);
          }

          const modPrice = parseFloat(modOption.price_adjustment !== undefined ? modOption.price_adjustment : (modOption.price || 0)) || 0.00;
          totalModifierPrice += modPrice;
          preparedModifiers.push({
            modifier_id: modOption.modifier_id,
            modifier_option_id: modOption.id,
            name: `${modOption.modifier.name}: ${modOption.name}`,
            price: modPrice
          });
        }
      }

      const itemQuantity = parseFloat(Number(item.quantity).toFixed(4));
      const itemSingleTotal = unitPrice + totalModifierPrice;
      const itemSubtotal = parseFloat((itemSingleTotal * itemQuantity).toFixed(2));
      subtotal += itemSubtotal;

      preparedItems.push({
        product_id: product.id,
        variant_id: item.variant_id || null,
        product_name: productName,
        variant_name: variantName,
        quantity: itemQuantity,
        unit_price: unitPrice,
        subtotal: itemSubtotal,
        modifiers: preparedModifiers
      });

      // 2d. Recipe Lookup for Inventory Deduction
      // Look for recipe matching specific variant first, otherwise fallback to base product recipe
      let recipe = null;
      if (item.variant_id) {
        recipe = await Recipe.findOne({
          where: { business_id: businessId, product_id: product.id, product_variant_id: item.variant_id, is_active: true },
          include: [
            {
              model: RecipeItem,
              as: 'items',
              include: [{ model: Ingredient, as: 'ingredient', attributes: ['id', 'name'] }]
            }
          ],
          transaction: t
        });
      }

      if (!recipe) {
        recipe = await Recipe.findOne({
          where: { business_id: businessId, product_id: product.id, product_variant_id: null, is_active: true },
          include: [
            {
              model: RecipeItem,
              as: 'items',
              include: [{ model: Ingredient, as: 'ingredient', attributes: ['id', 'name'] }]
            }
          ],
          transaction: t
        });
      }

      if (recipe && recipe.items && recipe.items.length > 0) {
        for (const rItem of recipe.items) {
          const reqQty = parseFloat(rItem.quantity) * itemQuantity;
          const ingId = rItem.ingredient_id;
          const ingName = rItem.ingredient ? rItem.ingredient.name : `Ingredient #${ingId}`;

          if (requiredIngredients.has(ingId)) {
            const existing = requiredIngredients.get(ingId);
            existing.requiredQty += reqQty;
          } else {
            requiredIngredients.set(ingId, {
              ingredient_id: ingId,
              name: ingName,
              requiredQty: reqQty
            });
          }
        }
      }
    }

    subtotal = parseFloat(subtotal.toFixed(2));
    const discountAmount = parseFloat(Math.min(subtotal, Math.max(0, Number(discount) || 0)).toFixed(2));
    const taxAmount = parseFloat(Math.max(0, Number(tax) || 0).toFixed(2));
    const total = parseFloat(Math.max(0, subtotal - discountAmount + taxAmount).toFixed(2));

    // 3. Payment Verification
    const rawMethod = payment.method || payment.payment_method;
    const paymentMethod = rawMethod === 'DEBIT' ? 'OTHER' : (rawMethod || 'CASH');
    const rawPaid = payment.paid_amount !== undefined ? payment.paid_amount : (payment.amount_paid !== undefined ? payment.amount_paid : total);
    const paidAmount = parseFloat(Number(rawPaid).toFixed(2));
    let changeAmount = 0.00;

    if (paymentMethod === 'CASH') {
      if (paidAmount < total) {
        throw new BadRequestError(`Insufficient payment amount. Total: ${total}, Paid: ${paidAmount}`);
      }
      changeAmount = parseFloat((paidAmount - total).toFixed(2));
    } else {
      changeAmount = 0.00;
    }

    // 4. Stock Validation across all aggregated ingredients
    for (const [ingId, reqData] of requiredIngredients) {
      const availableStock = await getCurrentStock(businessId, outlet_id, ingId, t);
      if (availableStock < reqData.requiredQty) {
        const err = new BadRequestError(
          `Insufficient stock for ingredient '${reqData.name}'. Required: ${reqData.requiredQty}, Available: ${availableStock}`
        );
        err.details = {
          ingredient: reqData.name,
          required: reqData.requiredQty,
          available: availableStock
        };
        throw err;
      }
    }

    // 5. Generate Invoice Number & Create Transaction Record
    const invoiceNumber = await generateInvoiceNumber(businessId, t);

    const createdTransaction = await Transaction.create({
      business_id: businessId,
      outlet_id,
      user_id: userId,
      invoice_number: invoiceNumber,
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
      payment_status: 'PAID',
      transaction_status: 'COMPLETED',
      note: note || null
    }, { transaction: t });

    // 6. Create Transaction Items & Item Modifiers
    for (const pItem of preparedItems) {
      const itemRecord = await TransactionItem.create({
        transaction_id: createdTransaction.id,
        product_id: pItem.product_id,
        variant_id: pItem.variant_id,
        product_name: pItem.product_name,
        variant_name: pItem.variant_name,
        quantity: pItem.quantity,
        unit_price: pItem.unit_price,
        subtotal: pItem.subtotal
      }, { transaction: t });

      if (pItem.modifiers && pItem.modifiers.length > 0) {
        const modRecords = pItem.modifiers.map(m => ({
          transaction_item_id: itemRecord.id,
          modifier_id: m.modifier_id,
          modifier_option_id: m.modifier_option_id,
          name: m.name,
          price: m.price
        }));
        await TransactionItemModifier.bulkCreate(modRecords, { transaction: t });
      }
    }

    // 7. Create Payment Record
    await Payment.create({
      transaction_id: createdTransaction.id,
      method: paymentMethod,
      amount: total,
      paid_amount: paidAmount,
      change_amount: changeAmount,
      status: 'PAID',
      paid_at: new Date()
    }, { transaction: t });

    // 8. Create Stock Movements OUT for all recipe ingredients
    for (const [ingId, reqData] of requiredIngredients) {
      await StockMovement.create({
        business_id: businessId,
        outlet_id,
        ingredient_id: ingId,
        type: 'OUT',
        quantity: parseFloat(reqData.requiredQty.toFixed(4)),
        reference_type: 'SALE',
        reference_id: createdTransaction.id,
        notes: `Sale #${invoiceNumber}`,
        created_by: userId
      }, { transaction: t });
    }

    // 9. Record Audit Log
    await recordAuditLog({
      business_id: businessId,
      user_id: userId,
      action: 'TRANSACTION_CREATED',
      entity_type: 'TRANSACTION',
      entity_id: createdTransaction.id,
      metadata: {
        invoice_number: invoiceNumber,
        total,
        payment_method: paymentMethod,
        items_count: preparedItems.length
      },
      transaction: t
    });

    // 10. Return fully populated transaction
    return await Transaction.findOne({
      where: { id: createdTransaction.id },
      include: transactionIncludes,
      transaction: t
    });
  });
};

/**
 * Cancel a completed transaction and perform automatic inventory reversal
 */
const cancelTransaction = async (businessId, userId, isOwner, transactionId, reason) => {
  const transactionRecord = await Transaction.findOne({
    where: {
      id: transactionId,
      business_id: businessId
    },
    include: transactionIncludes
  });

  if (!transactionRecord) {
    throw new NotFoundError('Transaction not found in this business');
  }

  // Check outlet access
  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
  if (!allowedOutletIds.includes(Number(transactionRecord.outlet_id))) {
    throw new ForbiddenError('You do not have access to manage transactions in this outlet');
  }

  if (transactionRecord.transaction_status === 'CANCELLED') {
    throw new ValidationError('Transaction is already cancelled');
  }

  return await sequelize.transaction(async (t) => {
    // 1. Update Transaction Status
    const cancellationNote = reason ? `Cancelled: ${reason}` : 'Transaction cancelled';
    const updatedNote = transactionRecord.note
      ? `${transactionRecord.note} | ${cancellationNote}`
      : cancellationNote;

    await transactionRecord.update({
      transaction_status: 'CANCELLED',
      payment_status: 'REFUNDED',
      note: updatedNote
    }, { transaction: t });

    // 2. Update Payment Status if exists
    await Payment.update(
      { status: 'REFUNDED' },
      { where: { transaction_id: transactionRecord.id }, transaction: t }
    );

    // 3. Stock Reversal (Create IN movements for all original SALE OUT movements)
    const saleMovements = await StockMovement.findAll({
      where: {
        business_id: businessId,
        outlet_id: transactionRecord.outlet_id,
        reference_type: 'SALE',
        reference_id: transactionRecord.id,
        type: 'OUT'
      },
      transaction: t
    });

    for (const sm of saleMovements) {
      await StockMovement.create({
        business_id: businessId,
        outlet_id: sm.outlet_id,
        ingredient_id: sm.ingredient_id,
        type: 'IN',
        quantity: sm.quantity,
        reference_type: 'SALE_CANCELLED',
        reference_id: transactionRecord.id,
        notes: `Stock reversal for cancelled transaction #${transactionRecord.invoice_number}`,
        created_by: userId
      }, { transaction: t });
    }

    // 4. Record Audit Log
    await recordAuditLog({
      business_id: businessId,
      user_id: userId,
      action: 'TRANSACTION_CANCELLED',
      entity_type: 'TRANSACTION',
      entity_id: transactionRecord.id,
      metadata: {
        invoice_number: transactionRecord.invoice_number,
        total: transactionRecord.total,
        reason
      },
      transaction: t
    });

    return await Transaction.findOne({
      where: { id: transactionRecord.id },
      include: transactionIncludes,
      transaction: t
    });
  });
};

/**
 * List transactions with filtering and pagination
 */
const listTransactions = async (businessId, userId, isOwner, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
  if (allowedOutletIds.length === 0) {
    return { transactions: [], totalItems: 0, page, limit };
  }

  const where = {
    business_id: businessId,
    outlet_id: { [Op.in]: allowedOutletIds }
  };

  if (query.outlet_id) {
    if (!allowedOutletIds.includes(Number(query.outlet_id))) {
      throw new ForbiddenError('You do not have access to view transactions from this outlet');
    }
    where.outlet_id = query.outlet_id;
  }

  if (query.status || query.transaction_status) {
    where.transaction_status = (query.status || query.transaction_status).toUpperCase();
  }

  if (query.payment_status) {
    where.payment_status = query.payment_status.toUpperCase();
  }

  if (query.invoice_number) {
    where.invoice_number = { [Op.like]: `%${query.invoice_number}%` };
  }

  if (query.date_from && query.date_to) {
    where.created_at = {
      [Op.between]: [new Date(query.date_from), new Date(query.date_to)]
    };
  } else if (query.date_from) {
    where.created_at = { [Op.gte]: new Date(query.date_from) };
  } else if (query.date_to) {
    where.created_at = { [Op.lte]: new Date(query.date_to) };
  }

  const { rows: transactions, count: totalItems } = await Transaction.findAndCountAll({
    where,
    include: transactionIncludes,
    order: [['created_at', 'DESC']],
    limit,
    offset
  });

  return { transactions, totalItems, page, limit };
};

/**
 * Get single transaction detail with receipt snapshot data
 */
const getTransactionById = async (businessId, userId, isOwner, transactionId) => {
  const transaction = await Transaction.findOne({
    where: {
      id: transactionId,
      business_id: businessId
    },
    include: transactionIncludes
  });

  if (!transaction) {
    throw new NotFoundError('Transaction not found in this business');
  }

  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
  if (!allowedOutletIds.includes(Number(transaction.outlet_id))) {
    throw new ForbiddenError('You do not have access to view this transaction');
  }

  return transaction;
};

module.exports = {
  createTransaction,
  cancelTransaction,
  listTransactions,
  getTransactionById
};

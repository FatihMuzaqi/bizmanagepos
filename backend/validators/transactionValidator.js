const Joi = require('joi');

const transactionModifierSchema = Joi.object({
  modifier_option_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Modifier option ID is required',
    'number.base': 'Modifier option ID must be a valid number'
  })
});

const transactionItemSchema = Joi.object({
  product_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Product ID is required',
    'number.base': 'Product ID must be a valid number'
  }),
  variant_id: Joi.number().integer().positive().optional().allow(null),
  quantity: Joi.number().positive().required().messages({
    'number.positive': 'Quantity must be greater than zero',
    'any.required': 'Quantity is required'
  }),
  modifiers: Joi.array().items(transactionModifierSchema).optional().default([])
});

const createTransactionSchema = Joi.object({
  outlet_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Outlet ID is required',
    'number.base': 'Outlet ID must be a valid number'
  }),
  items: Joi.array().items(transactionItemSchema).min(1).required().messages({
    'array.min': 'Transaction must have at least one item',
    'any.required': 'Transaction items are required'
  }),
  discount: Joi.number().min(0).optional().default(0).messages({
    'number.min': 'Discount cannot be negative'
  }),
  tax: Joi.number().min(0).optional().default(0).messages({
    'number.min': 'Tax cannot be negative'
  }),
  note: Joi.string().max(1000).optional().allow('', null),
  payment: Joi.object({
    method: Joi.string().valid('CASH', 'TRANSFER', 'QRIS', 'DEBIT', 'OTHER').optional(),
    payment_method: Joi.string().valid('CASH', 'TRANSFER', 'QRIS', 'DEBIT', 'OTHER').optional(),
    paid_amount: Joi.number().min(0).optional(),
    amount_paid: Joi.number().min(0).optional()
  }).custom((val, helpers) => {
    const rawMethod = val.method || val.payment_method;
    if (!rawMethod) {
      return helpers.message('Payment method is required');
    }
    const rawPaid = val.paid_amount !== undefined ? val.paid_amount : val.amount_paid;
    if (rawPaid === undefined || rawPaid === null) {
      return helpers.message('Paid amount is required');
    }
    // Normalize into standard keys expected by backend
    val.method = rawMethod === 'DEBIT' ? 'OTHER' : rawMethod;
    val.paid_amount = Number(rawPaid);
    val.payment_method = val.method;
    val.amount_paid = val.paid_amount;
    return val;
  }).required().messages({
    'any.required': 'Payment information is required'
  })
});

const cancelTransactionSchema = Joi.object({
  reason: Joi.string().max(500).optional().allow('', null)
});

module.exports = {
  createTransactionSchema,
  cancelTransactionSchema
};

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
    method: Joi.string().valid('CASH', 'TRANSFER', 'QRIS', 'OTHER').required().messages({
      'any.only': 'Payment method must be one of CASH, TRANSFER, QRIS, OTHER',
      'any.required': 'Payment method is required'
    }),
    paid_amount: Joi.number().min(0).required().messages({
      'number.min': 'Paid amount cannot be negative',
      'any.required': 'Paid amount is required'
    })
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

const Joi = require('joi');

const createExpenseCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'Category name is required',
    'string.max': 'Category name cannot exceed 100 characters'
  }),
  description: Joi.string().max(500).optional().allow('', null)
});

const updateExpenseCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional().allow('', null),
  is_active: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided to update expense category'
});

const createExpenseSchema = Joi.object({
  outlet_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Outlet ID is required',
    'number.base': 'Outlet ID must be a valid number'
  }),
  category_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Category ID is required',
    'number.base': 'Category ID must be a valid number'
  }),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Amount must be greater than zero',
    'any.required': 'Amount is required'
  }),
  expense_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({
    'string.pattern.base': 'Expense date must be in YYYY-MM-DD format'
  }),
  description: Joi.string().max(1000).optional().allow('', null)
});

const updateExpenseSchema = Joi.object({
  outlet_id: Joi.number().integer().positive().optional(),
  category_id: Joi.number().integer().positive().optional(),
  amount: Joi.number().positive().optional(),
  expense_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: Joi.string().max(1000).optional().allow('', null),
  status: Joi.string().valid('RECORDED', 'CANCELLED').optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided to update expense'
});

const cancelExpenseSchema = Joi.object({
  reason: Joi.string().max(500).optional().allow('', null)
});

module.exports = {
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  createExpenseSchema,
  updateExpenseSchema,
  cancelExpenseSchema
};

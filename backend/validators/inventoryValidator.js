const Joi = require('joi');

// Unit Validation Schemas
const createUnitSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'Unit name is required',
    'string.max': 'Unit name cannot exceed 100 characters'
  }),
  symbol: Joi.string().min(1).max(20).required().messages({
    'string.empty': 'Unit symbol is required',
    'string.max': 'Unit symbol cannot exceed 20 characters'
  })
});

const updateUnitSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  symbol: Joi.string().min(1).max(20).optional(),
  is_active: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided to update unit'
});

// Ingredient Validation Schemas
const createIngredientSchema = Joi.object({
  name: Joi.string().min(1).max(150).required().messages({
    'string.empty': 'Ingredient name is required',
    'string.max': 'Ingredient name cannot exceed 150 characters'
  }),
  unit_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Unit ID is required',
    'number.base': 'Unit ID must be a valid number'
  }),
  sku: Joi.string().max(50).optional().allow('', null),
  minimum_stock: Joi.number().min(0).optional().default(0).messages({
    'number.min': 'Minimum stock cannot be negative'
  }),
  cost_per_unit: Joi.number().min(0).optional().default(0).messages({
    'number.min': 'Cost per unit cannot be negative'
  })
});

const updateIngredientSchema = Joi.object({
  name: Joi.string().min(1).max(150).optional(),
  unit_id: Joi.number().integer().positive().optional(),
  sku: Joi.string().max(50).optional().allow('', null),
  minimum_stock: Joi.number().min(0).optional(),
  cost_per_unit: Joi.number().min(0).optional(),
  is_active: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided to update ingredient'
});

// Stock Operations Schemas
const stockInSchema = Joi.object({
  outlet_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Outlet ID is required'
  }),
  ingredient_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Ingredient ID is required'
  }),
  quantity: Joi.number().positive().required().messages({
    'number.positive': 'Quantity must be greater than zero',
    'any.required': 'Quantity is required'
  }),
  reference_type: Joi.string().max(50).optional().default('MANUAL_IN'),
  reference_id: Joi.number().integer().positive().optional().allow(null),
  notes: Joi.string().max(1000).optional().allow('', null)
});

const stockOutSchema = Joi.object({
  outlet_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Outlet ID is required'
  }),
  ingredient_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Ingredient ID is required'
  }),
  quantity: Joi.number().positive().required().messages({
    'number.positive': 'Quantity must be greater than zero',
    'any.required': 'Quantity is required'
  }),
  reference_type: Joi.string().max(50).optional().default('MANUAL_OUT'),
  reference_id: Joi.number().integer().positive().optional().allow(null),
  notes: Joi.string().max(1000).optional().allow('', null)
});

const stockAdjustmentSchema = Joi.object({
  outlet_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Outlet ID is required'
  }),
  ingredient_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Ingredient ID is required'
  }),
  actual_stock: Joi.number().min(0).optional(),
  delta_quantity: Joi.number().optional(),
  notes: Joi.string().max(1000).optional().allow('', null)
}).or('actual_stock', 'delta_quantity').messages({
  'object.missing': 'Either actual_stock or delta_quantity must be provided for stock adjustment'
});

module.exports = {
  createUnitSchema,
  updateUnitSchema,
  createIngredientSchema,
  updateIngredientSchema,
  stockInSchema,
  stockOutSchema,
  stockAdjustmentSchema
};

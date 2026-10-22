const Joi = require('joi');

// Category Validation Schemas
const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Category name is required',
    'string.min': 'Category name must be at least 2 characters',
    'string.max': 'Category name cannot exceed 100 characters'
  }),
  description: Joi.string().max(1000).optional().allow('', null),
  image: Joi.string().max(255).optional().allow('', null)
});

const updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    'string.min': 'Category name must be at least 2 characters',
    'string.max': 'Category name cannot exceed 100 characters'
  }),
  description: Joi.string().max(1000).optional().allow('', null),
  image: Joi.string().max(255).optional().allow('', null),
  is_active: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided to update category'
});

// Product Validation Schemas
const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(150).required().messages({
    'string.empty': 'Product name is required',
    'string.min': 'Product name must be at least 2 characters',
    'string.max': 'Product name cannot exceed 150 characters'
  }),
  category_id: Joi.number().integer().positive().optional().allow(null),
  sku: Joi.string().max(50).optional().allow('', null),
  description: Joi.string().max(2000).optional().allow('', null),
  image: Joi.string().max(255).optional().allow('', null),
  cost_price: Joi.number().min(0).optional().default(0.00).messages({
    'number.min': 'Cost price cannot be negative'
  }),
  selling_price: Joi.number().min(0).required().messages({
    'number.min': 'Selling price cannot be negative',
    'any.required': 'Selling price is required'
  }),
  track_stock: Joi.boolean().optional().default(false),
  variants: Joi.array().items(
    Joi.object({
      name: Joi.string().min(1).max(100).required(),
      sku: Joi.string().max(50).optional().allow('', null),
      cost_price: Joi.number().min(0).optional().default(0.00),
      selling_price: Joi.number().min(0).required(),
      is_default: Joi.boolean().optional().default(false)
    })
  ).optional(),
  modifier_ids: Joi.array().items(Joi.number().integer().positive()).optional()
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(150).optional(),
  category_id: Joi.number().integer().positive().optional().allow(null),
  sku: Joi.string().max(50).optional().allow('', null),
  description: Joi.string().max(2000).optional().allow('', null),
  image: Joi.string().max(255).optional().allow('', null),
  cost_price: Joi.number().min(0).optional(),
  selling_price: Joi.number().min(0).optional(),
  track_stock: Joi.boolean().optional(),
  is_active: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided to update product'
});

// Product Variant Validation Schemas
const createVariantSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'Variant name is required'
  }),
  sku: Joi.string().max(50).optional().allow('', null),
  cost_price: Joi.number().min(0).optional().default(0.00),
  selling_price: Joi.number().min(0).required().messages({
    'any.required': 'Selling price for variant is required',
    'number.min': 'Selling price cannot be negative'
  }),
  is_default: Joi.boolean().optional().default(false)
});

const updateVariantSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  sku: Joi.string().max(50).optional().allow('', null),
  cost_price: Joi.number().min(0).optional(),
  selling_price: Joi.number().min(0).optional(),
  is_default: Joi.boolean().optional(),
  is_active: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided to update variant'
});

// Modifier Validation Schemas
const createModifierSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Modifier name is required'
  }),
  type: Joi.string().valid('SINGLE', 'MULTIPLE').optional().default('SINGLE'),
  is_required: Joi.boolean().optional().default(false),
  min_selection: Joi.number().integer().min(0).optional().default(0),
  max_selection: Joi.number().integer().min(1).optional().default(1),
  options: Joi.array().items(
    Joi.object({
      name: Joi.string().min(1).max(100).required().messages({
        'string.empty': 'Option name is required'
      }),
      price_adjustment: Joi.number().min(0).optional().default(0.00),
      is_default: Joi.boolean().optional().default(false)
    })
  ).min(1).required().messages({
    'array.min': 'Modifier must have at least one option'
  })
});

const updateModifierSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  type: Joi.string().valid('SINGLE', 'MULTIPLE').optional(),
  is_required: Joi.boolean().optional(),
  min_selection: Joi.number().integer().min(0).optional(),
  max_selection: Joi.number().integer().min(1).optional(),
  is_active: Joi.boolean().optional(),
  options: Joi.array().items(
    Joi.object({
      id: Joi.number().integer().positive().optional(),
      name: Joi.string().min(1).max(100).required(),
      price_adjustment: Joi.number().min(0).optional().default(0.00),
      is_default: Joi.boolean().optional().default(false),
      is_active: Joi.boolean().optional().default(true)
    })
  ).min(1).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided to update modifier'
});

const attachProductModifierSchema = Joi.object({
  modifier_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Modifier ID is required'
  })
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  updateVariantSchema,
  createModifierSchema,
  updateModifierSchema,
  attachProductModifierSchema
};

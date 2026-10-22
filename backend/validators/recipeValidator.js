const Joi = require('joi');

const recipeItemSchema = Joi.object({
  ingredient_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Ingredient ID is required',
    'number.base': 'Ingredient ID must be a valid number'
  }),
  quantity: Joi.number().positive().required().messages({
    'number.positive': 'Ingredient quantity must be greater than zero',
    'any.required': 'Ingredient quantity is required'
  })
});

const createRecipeSchema = Joi.object({
  product_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Product ID is required',
    'number.base': 'Product ID must be a valid number'
  }),
  product_variant_id: Joi.number().integer().positive().optional().allow(null),
  instructions: Joi.string().max(2000).optional().allow('', null),
  items: Joi.array().items(recipeItemSchema).min(1).required().messages({
    'array.min': 'Recipe must contain at least one ingredient item',
    'any.required': 'Recipe items are required'
  })
});

const updateRecipeSchema = Joi.object({
  product_id: Joi.number().integer().positive().optional(),
  product_variant_id: Joi.number().integer().positive().optional().allow(null),
  instructions: Joi.string().max(2000).optional().allow('', null),
  is_active: Joi.boolean().optional(),
  items: Joi.array().items(recipeItemSchema).min(1).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided to update recipe'
});

module.exports = {
  createRecipeSchema,
  updateRecipeSchema
};

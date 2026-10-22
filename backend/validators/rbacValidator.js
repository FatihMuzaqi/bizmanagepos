const Joi = require('joi');

const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Role name is required',
    'string.min': 'Role name must be at least 2 characters',
    'string.max': 'Role name cannot exceed 50 characters'
  }),
  description: Joi.string().max(255).optional().allow('', null),
  permission_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required().messages({
    'array.base': 'Permission IDs must be an array of numbers',
    'array.min': 'Role must contain at least one permission'
  })
});

const updateRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Role name must be at least 2 characters',
    'string.max': 'Role name cannot exceed 50 characters'
  }),
  description: Joi.string().max(255).optional().allow('', null),
  permission_ids: Joi.array().items(Joi.number().integer().positive()).min(1).optional().messages({
    'array.min': 'Role must contain at least one permission'
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided to update role'
});

module.exports = {
  createRoleSchema,
  updateRoleSchema
};

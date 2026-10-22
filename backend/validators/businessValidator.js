const Joi = require('joi');

const createBusinessSchema = Joi.object({
  name: Joi.string().min(2).max(150).required().messages({
    'string.empty': 'Business name is required'
  }),
  legal_name: Joi.string().max(150).optional().allow('', null),
  logo: Joi.string().max(255).optional().allow('', null),
  initial_outlet_name: Joi.string().min(2).max(100).optional().default('Main Outlet')
});

const updateBusinessSchema = Joi.object({
  name: Joi.string().min(2).max(150).optional().messages({
    'string.min': 'Business name must be at least 2 characters'
  }),
  legal_name: Joi.string().max(150).optional().allow('', null),
  logo: Joi.string().max(255).optional().allow('', null)
}).min(1).messages({
  'object.min': 'At least one field must be provided to update business'
});

const selectBusinessSchema = Joi.object({
  business_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Business ID must be a number',
    'any.required': 'Business ID is required'
  })
});

const addMemberSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'User email is required',
    'string.email': 'Valid email is required'
  }),
  name: Joi.string().min(2).max(100).optional().allow('', null),
  phone: Joi.string().max(25).optional().allow('', null),
  password: Joi.string().min(6).max(100).optional().allow('', null),
  role_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Role ID must be a number',
    'any.required': 'Role ID is required'
  }),
  outlet_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required().messages({
    'array.base': 'Outlet IDs must be an array of numbers',
    'array.min': 'Member must be assigned to at least one outlet'
  })
});

const updateMemberSchema = Joi.object({
  role_id: Joi.number().integer().positive().optional().messages({
    'number.base': 'Role ID must be a number'
  }),
  outlet_ids: Joi.array().items(Joi.number().integer().positive()).optional().messages({
    'array.base': 'Outlet IDs must be an array of numbers'
  }),
  is_active: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided to update member'
});

const assignOutletsSchema = Joi.object({
  outlet_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required().messages({
    'array.base': 'Outlet IDs must be an array of numbers',
    'array.min': 'Provide at least one outlet ID to assign'
  })
});

module.exports = {
  createBusinessSchema,
  updateBusinessSchema,
  selectBusinessSchema,
  addMemberSchema,
  updateMemberSchema,
  assignOutletsSchema
};

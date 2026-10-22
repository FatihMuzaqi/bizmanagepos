const Joi = require('joi');

const createOutletSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Outlet name is required',
    'string.min': 'Outlet name must be at least 2 characters',
    'string.max': 'Outlet name cannot exceed 100 characters'
  }),
  code: Joi.string().max(20).optional().allow('', null).messages({
    'string.max': 'Outlet code cannot exceed 20 characters'
  }),
  address: Joi.string().optional().allow('', null),
  phone: Joi.string().pattern(/^[0-9+]{8,20}$/).optional().allow('', null).messages({
    'string.pattern.base': 'Phone number must contain between 8 and 20 digits'
  })
});

const updateOutletSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    'string.min': 'Outlet name must be at least 2 characters',
    'string.max': 'Outlet name cannot exceed 100 characters'
  }),
  code: Joi.string().max(20).optional().allow('', null),
  address: Joi.string().optional().allow('', null),
  phone: Joi.string().pattern(/^[0-9+]{8,20}$/).optional().allow('', null).messages({
    'string.pattern.base': 'Phone number must contain between 8 and 20 digits'
  }),
  is_active: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided to update outlet'
});

module.exports = {
  createOutletSchema,
  updateOutletSchema
};

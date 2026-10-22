const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 100 characters'
  }),
  email: Joi.string().email().max(150).required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address'
  }),
  phone: Joi.string().pattern(/^[0-9+]{8,20}$/).optional().allow('', null).messages({
    'string.pattern.base': 'Phone number must contain between 8 and 20 digits'
  }),
  password: Joi.string().min(6).max(50).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters'
  }),
  business_name: Joi.string().min(2).max(150).required().messages({
    'string.empty': 'Business name is required to initialize your primary business'
  }),
  outlet_name: Joi.string().min(2).max(100).optional().default('Outlet Pusat')
});

const loginSchema = Joi.object({
  email: Joi.string().trim().required().messages({
    'string.empty': 'Email or phone number is required',
    'any.required': 'Email or phone number is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required'
  })
});

const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required().messages({
    'string.empty': 'Refresh token is required'
  })
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters'
  }),
  phone: Joi.string().pattern(/^[0-9+]{8,20}$/).optional().allow('', null).messages({
    'string.pattern.base': 'Phone number must contain between 8 and 20 digits'
  })
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required().messages({
    'string.empty': 'Current password is required'
  }),
  new_password: Joi.string().min(6).max(50).required().messages({
    'string.empty': 'New password is required',
    'string.min': 'New password must be at least 6 characters'
  }),
  new_password_confirmation: Joi.string().valid(Joi.ref('new_password')).required().messages({
    'any.only': 'Password confirmation does not match new password',
    'string.empty': 'Password confirmation is required'
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema
};

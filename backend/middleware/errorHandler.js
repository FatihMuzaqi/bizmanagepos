'use strict';
const { errorResponse } = require('../utils/apiResponse');
const { AppError } = require('../utils/customErrors');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Global centralized production-safe error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // If response headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  const logMeta = {
    requestId: req.requestId || null,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.headers['x-forwarded-for'],
    userId: req.user?.id || null,
    businessId: req.headers['x-business-id'] || req.business?.id || null,
    errorName: err.name,
    errorMessage: err.message,
    stack: err.stack
  };

  // 1. Operational App Errors (Domain-level exceptions)
  if (err instanceof AppError) {
    logger.warn('OPERATIONAL_ERROR', `${err.errorCode}: ${err.message}`, logMeta);
    return errorResponse(res, err.message, err.statusCode, err.errorCode, err.errors);
  }

  // 2. Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    logger.warn('DB_VALIDATION_ERROR', err.message, logMeta);
    const formattedErrors = err.errors.map((e) => ({
      field: e.path,
      message: e.message
    }));
    return errorResponse(res, 'Database validation error', 422, 'VALIDATION_ERROR', formattedErrors);
  }

  // 3. Sequelize Unique Constraint Error
  if (err.name === 'SequelizeUniqueConstraintError') {
    logger.warn('DB_UNIQUE_ERROR', err.message, logMeta);
    const formattedErrors = err.errors.map((e) => ({
      field: e.path,
      message: `${e.path} already exists`
    }));
    return errorResponse(res, 'Resource with provided unique attribute already exists', 409, 'DUPLICATE_ENTRY', formattedErrors);
  }

  // 4. Sequelize Foreign Key Constraint Error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    logger.warn('DB_FOREIGN_KEY_ERROR', err.message, logMeta);
    return errorResponse(res, 'Invalid foreign key reference in request', 400, 'FOREIGN_KEY_ERROR');
  }

  // 5. JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    logger.security('AUTH_INVALID_TOKEN', 'Invalid JWT token supplied', logMeta);
    return errorResponse(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    logger.security('AUTH_TOKEN_EXPIRED', 'Expired JWT token supplied', logMeta);
    return errorResponse(res, 'Authentication token has expired', 401, 'TOKEN_EXPIRED');
  }

  // 6. Malformed JSON Body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn('MALFORMED_JSON', 'Malformed JSON payload in request body', logMeta);
    return errorResponse(res, 'Malformed JSON payload in request body', 400, 'BAD_REQUEST');
  }

  // 7. Unhandled Server Exceptions (500)
  logger.error('UNHANDLED_EXCEPTION', err.message || 'Internal server error', logMeta);

  const message = env.IS_PRODUCTION 
    ? 'Internal server error' 
    : (err.message || 'Internal Server Error');

  return errorResponse(
    res, 
    message, 
    500, 
    'INTERNAL_SERVER_ERROR', 
    env.IS_PRODUCTION ? null : { stack: err.stack }
  );
};

module.exports = errorHandler;

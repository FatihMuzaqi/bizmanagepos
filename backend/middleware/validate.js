const { ValidationError } = require('../utils/customErrors');

/**
 * Validate incoming request against a Joi schema
 * @param {Object} schema - Joi schema object or { body, query, params }
 * @param {string} source - 'body' | 'query' | 'params' (default 'body' if schema is standard Joi object)
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    // If schema has body/query/params properties
    if (schema.body || schema.query || schema.params) {
      const targets = ['body', 'query', 'params'];
      const allErrors = [];

      for (const target of targets) {
        if (schema[target]) {
          const { error, value } = schema[target].validate(req[target], {
            abortEarly: false,
            stripUnknown: true
          });

          if (error) {
            const formatted = error.details.map((d) => ({
              field: d.path.join('.'),
              message: d.message.replace(/['"]/g, '')
            }));
            allErrors.push(...formatted);
          } else {
            req[target] = value;
          }
        }
      }

      if (allErrors.length > 0) {
        return next(new ValidationError('Request validation failed', allErrors));
      }

      return next();
    }

    // Single source validation (e.g. only body)
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const formattedErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));

      return next(new ValidationError('Request validation failed', formattedErrors));
    }

    req[source] = value;
    return next();
  };
};

module.exports = validate;

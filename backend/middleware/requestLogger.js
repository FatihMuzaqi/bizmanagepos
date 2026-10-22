'use strict';
const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Production-ready HTTP Request Logger Middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = process.hrtime();
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(2, 10);
  req.requestId = requestId;

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const durationMs = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);

    const logMeta = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: `${durationMs}ms`,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      businessId: req.headers['x-business-id'] || req.business?.id || null,
      outletId: req.headers['x-outlet-id'] || null,
      userId: req.user?.id || null
    };

    if (res.statusCode >= 500) {
      logger.error('HTTP_REQUEST', `${req.method} ${req.originalUrl} -> ${res.statusCode} in ${durationMs}ms`, logMeta);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP_REQUEST', `${req.method} ${req.originalUrl} -> ${res.statusCode} in ${durationMs}ms`, logMeta);
    } else {
      // Info level for 2xx / 3xx
      if (env.NODE_ENV !== 'test') {
        logger.info('HTTP_REQUEST', `${req.method} ${req.originalUrl} -> ${res.statusCode} in ${durationMs}ms`, logMeta);
      }
    }
  });

  next();
};

module.exports = requestLogger;

'use strict';
const fs = require('fs');
const path = require('path');
const env = require('../config/env');

const LOGS_DIR = path.resolve(__dirname, '../logs');
if (!fs.existsSync(LOGS_DIR)) {
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create logs directory:', err.message);
  }
}

const SENSITIVE_KEYS = new Set([
  'password',
  'old_password',
  'new_password',
  'confirm_password',
  'token',
  'access_token',
  'refresh_token',
  'jwt',
  'secret',
  'authorization',
  'cookie',
  'credit_card',
  'cvv',
  'pin'
]);

/**
 * Recursively sanitize sensitive data from objects before logging
 */
const sanitizeData = (data, depth = 0) => {
  if (depth > 5 || data === null || data === undefined) return data;
  if (typeof data === 'string') {
    // Check if string looks like a JWT token (header.payload.signature)
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(data)) {
      return '[REDACTED_JWT]';
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1));
  }
  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value, depth + 1);
      }
    }
    return sanitized;
  }
  return data;
};

/**
 * Write log entry to log files
 */
const writeToFile = (filename, formattedMessage) => {
  try {
    const filePath = path.join(LOGS_DIR, filename);
    fs.appendFileSync(filePath, formattedMessage + '\n', 'utf8');
  } catch (err) {
    // Ignore file write errors so application flow is never disrupted
  }
};

const formatLog = (level, category, message, meta = null) => {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = meta ? sanitizeData(meta) : null;
  const entry = {
    timestamp,
    level: level.toUpperCase(),
    category,
    message,
    ...(sanitizedMeta ? { meta: sanitizedMeta } : {})
  };

  const jsonString = JSON.stringify(entry);
  writeToFile('app.log', jsonString);
  if (level.toUpperCase() === 'ERROR') {
    writeToFile('error.log', jsonString);
  }

  // Console output
  if (env.NODE_ENV !== 'test') {
    const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : level === 'security' ? '\x1b[35m' : '\x1b[36m';
    const reset = '\x1b[0m';
    console.log(`${color}[${timestamp}] [${level.toUpperCase()}] [${category}]${reset} ${message} ${sanitizedMeta ? JSON.stringify(sanitizedMeta) : ''}`);
  }

  return entry;
};

const logger = {
  info: (category, message, meta) => formatLog('info', category, message, meta),
  warn: (category, message, meta) => formatLog('warn', category, message, meta),
  error: (category, message, meta) => formatLog('error', category, message, meta),
  security: (category, message, meta) => formatLog('security', category, message, meta),
  audit: (category, message, meta) => formatLog('audit', category, message, meta),
  sanitize: sanitizeData
};

module.exports = logger;

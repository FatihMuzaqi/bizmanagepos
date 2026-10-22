const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generate Access Token (Short-lived)
 * @param {Object} payload 
 * @returns {string}
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT.ACCESS_SECRET, {
    expiresIn: env.JWT.ACCESS_EXPIRES_IN
  });
};

/**
 * Generate Refresh Token (Long-lived)
 * @param {Object} payload 
 * @returns {string}
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT.REFRESH_SECRET, {
    expiresIn: env.JWT.REFRESH_EXPIRES_IN
  });
};

/**
 * Verify Access Token
 * @param {string} token 
 * @returns {Object}
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT.ACCESS_SECRET);
};

/**
 * Verify Refresh Token
 * @param {string} token 
 * @returns {Object}
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT.REFRESH_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};

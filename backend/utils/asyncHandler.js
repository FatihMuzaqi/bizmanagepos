/**
 * Wraps asynchronous route handlers to automatically catch rejections
 * and pass them to the Express error middleware.
 * 
 * @param {Function} fn - Async controller function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

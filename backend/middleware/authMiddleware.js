const { verifyAccessToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../utils/customErrors');
const { User } = require('../models');

/**
 * Authentication Middleware
 * Validates the JWT Bearer Access Token in the Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header. Use Bearer <token>', 'NO_TOKEN');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Access token is required', 'NO_TOKEN');
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token has expired', 'TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid access token', 'INVALID_TOKEN');
    }

    // Verify user exists and is active
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'email', 'name', 'is_active']
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedError('User account not found or deactivated', 'USER_INACTIVE');
    }

    // Attach user to request context
    req.user = {
      id: Number(user.id),
      email: user.email,
      name: user.name
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;

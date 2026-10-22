const { verifyAccessToken } = require('../utils/jwt');
const { UnauthorizedError, ForbiddenError } = require('../utils/customErrors');

/**
 * Developer / Superadmin Authentication Middleware
 * Accepts either:
 * 1. Bearer JWT Token with isDeveloper: true
 * 2. Header 'X-Developer-Key' matching DEVELOPER_SECRET_KEY
 */
const developerAuth = (req, res, next) => {
  try {
    // 1. Check custom header X-Developer-Key
    const devKey = req.headers['x-developer-key'];
    const expectedKey = process.env.DEVELOPER_SECRET_KEY || 'developer_super_secret_2026';
    if (devKey && devKey === expectedKey) {
      req.developer = { isDeveloper: true, email: 'developer@bizmanage.local', role: 'DEVELOPER' };
      return next();
    }

    // 2. Check Authorization Bearer Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Akses developer diperlukan. Kirim Bearer token atau header X-Developer-Key.', 'NO_DEVELOPER_AUTH');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Sesi developer telah berakhir, silakan login ulang.', 'TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Token developer tidak valid.', 'INVALID_TOKEN');
    }

    if (!decoded.isDeveloper) {
      throw new ForbiddenError('Akses ditolak: Hanya developer/superadmin yang memiliki izin ke dashboard ini.', 'FORBIDDEN_DEVELOPER');
    }

    req.developer = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = developerAuth;

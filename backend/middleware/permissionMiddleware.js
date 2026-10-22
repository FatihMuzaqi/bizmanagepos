const { ForbiddenError } = require('../utils/customErrors');

/**
 * Permission Middleware (WHAT Dimension)
 * Checks if the user has the required granular permission or is the business owner
 * 
 * @param {string|string[]} requiredPermissions - Single permission or array of allowed permissions
 */
const requirePermission = (requiredPermissions) => {
  return (req, res, next) => {
    // 1. Safety check that tenant context was loaded
    if (!req.business || !req.userPermissions) {
      return next(new ForbiddenError('Tenant authorization context missing', 'AUTH_CONTEXT_MISSING'));
    }

    // 2. Owners have unrestricted access to all permissions
    if (req.business.isOwner || req.userPermissions.includes('*')) {
      return next();
    }

    // 3. Normalize requiredPermissions to array
    const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    // 4. Check if user has at least one of the required permissions
    const hasPermission = perms.some((perm) => req.userPermissions.includes(perm));

    if (!hasPermission) {
      return next(
        new ForbiddenError(
          `Permission denied. Required permission: ${perms.join(' or ')}`,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
};

module.exports = requirePermission;

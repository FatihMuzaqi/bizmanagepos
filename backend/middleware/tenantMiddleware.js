const { Business, BusinessUser } = require('../models');
const { ForbiddenError, BadRequestError } = require('../utils/customErrors');
const { getUserPermissionsInBusiness, getUserAllowedOutlets } = require('../services/rbacService');

/**
 * Tenant Context Middleware
 * Enforces business tenant isolation and loads user's dynamic permissions and allowed outlets
 */
const tenantContext = async (req, res, next) => {
  try {
    // Extract business ID from Header > Params > Query
    const rawBusinessId = req.headers['x-business-id'] || req.params.businessId || req.query.business_id;

    if (!rawBusinessId) {
      throw new BadRequestError(
        'Business context is required. Provide X-Business-Id header or businessId route parameter.',
        'BUSINESS_CONTEXT_REQUIRED'
      );
    }

    const businessId = Number(rawBusinessId);
    if (isNaN(businessId)) {
      throw new BadRequestError('Invalid Business ID format', 'INVALID_BUSINESS_ID');
    }

    // 1. Verify business exists and is active
    const business = await Business.findOne({
      where: {
        id: businessId,
        is_active: true
      }
    });

    if (!business) {
      throw new ForbiddenError('Business not found or inactive', 'BUSINESS_NOT_FOUND');
    }

    // 2. Verify authenticated user is an active member of this business
    const businessUser = await BusinessUser.findOne({
      where: {
        business_id: businessId,
        user_id: req.user.id,
        is_active: true
      }
    });

    if (!businessUser) {
      throw new ForbiddenError(
        'Tenant access denied. You are not a member of this business.',
        'TENANT_ACCESS_DENIED'
      );
    }

    // 3. Load user's RBAC permissions and allowed outlets
    const { isOwner, permissions, roles } = await getUserPermissionsInBusiness(req.user.id, businessId);
    const allowedOutlets = await getUserAllowedOutlets(req.user.id, businessId, isOwner);

    // 4. Attach tenant context to request
    req.business = {
      id: businessId,
      name: business.name,
      isOwner
    };
    req.userPermissions = permissions;
    req.userRoles = roles;
    req.allowedOutlets = allowedOutlets;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = tenantContext;

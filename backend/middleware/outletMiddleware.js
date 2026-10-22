const { ForbiddenError, BadRequestError } = require('../utils/customErrors');
const { Outlet } = require('../models');

/**
 * Outlet Scope Middleware (WHERE Dimension)
 * Validates that the targeted outlet exists in the business and the user is authorized to access it
 */
const requireOutlet = async (req, res, next) => {
  try {
    const rawOutletId = req.headers['x-outlet-id'] || req.params.outletId || req.body.outlet_id || req.query.outlet_id;

    if (!rawOutletId) {
      throw new BadRequestError(
        'Outlet context is required. Provide X-Outlet-Id header or outletId parameter.',
        'OUTLET_CONTEXT_REQUIRED'
      );
    }

    const outletId = Number(rawOutletId);
    if (isNaN(outletId)) {
      throw new BadRequestError('Invalid Outlet ID format', 'INVALID_OUTLET_ID');
    }

    // 1. Verify outlet belongs to current business
    const outlet = await Outlet.findOne({
      where: {
        id: outletId,
        business_id: req.business.id,
        is_active: true
      }
    });

    if (!outlet) {
      throw new ForbiddenError(
        'Outlet not found or does not belong to this business',
        'OUTLET_NOT_FOUND'
      );
    }

    // 2. If user is not owner, check user_outlets assignment
    if (!req.business.isOwner) {
      const isAllowed = req.allowedOutlets && req.allowedOutlets.includes(outletId);
      if (!isAllowed) {
        throw new ForbiddenError(
          'Access denied. You are not assigned to this outlet.',
          'OUTLET_ACCESS_DENIED'
        );
      }
    }

    // 3. Attach outlet context to request
    req.outlet = {
      id: outletId,
      name: outlet.name,
      code: outlet.code
    };
    req.outletId = outletId;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = requireOutlet;

const subscriptionService = require('../services/subscriptionService');
const { ForbiddenError } = require('../utils/customErrors');

/**
 * Middleware to ensure the business has an active or trial subscription
 */
const requireActiveSubscription = async (req, res, next) => {
  try {
    if (!req.business || !req.business.id) {
      return next();
    }

    const subscription = await subscriptionService.getActiveSubscription(req.business.id);

    if (subscription.status !== 'TRIAL' && subscription.status !== 'ACTIVE') {
      throw new ForbiddenError(
        'Subscription is expired or inactive. Please upgrade or renew your plan to continue.',
        'SUBSCRIPTION_EXPIRED'
      );
    }

    req.subscription = subscription;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to enforce specific subscription plan limits before mutating resources
 * @param {'max_users'|'max_outlets'|'max_products'|'max_transactions'} limitType
 */
const enforceLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      if (!req.business || !req.business.id) {
        return next();
      }

      await subscriptionService.checkSubscriptionLimit(req.business.id, limitType);
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  requireActiveSubscription,
  enforceLimit
};

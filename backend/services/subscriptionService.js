const {
  Subscription,
  SubscriptionPlan,
  SubscriptionInvoice,
  Business,
  User,
  BusinessUser,
  Outlet,
  Product,
  Transaction,
  sequelize
} = require('../models');
const { NotFoundError, ForbiddenError, ValidationError, BadRequestError } = require('../utils/customErrors');
const { recordAuditLog } = require('./auditLogService');
const midtransService = require('./midtransService');

/**
 * Automatically create a free trial subscription for a newly registered business
 */
const createTrialSubscription = async (businessId, transaction = null) => {
  let plan = await SubscriptionPlan.findOne({
    where: { code: 'FREE_TRIAL', is_active: true },
    transaction
  });

  if (!plan) {
    plan = await SubscriptionPlan.findOne({
      where: { is_active: true },
      order: [['price', 'ASC']],
      transaction
    });
  }

  if (!plan) {
    throw new NotFoundError('No active subscription plans found in system');
  }

  const durationDays = plan.duration_days || 30;
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

  return await Subscription.create({
    business_id: businessId,
    plan_id: plan.id,
    status: 'TRIAL',
    starts_at: startsAt,
    trial_ends_at: endsAt,
    ends_at: endsAt
  }, { transaction });
};

/**
 * Get active business subscription and dynamically evaluate expiration
 */
const getActiveSubscription = async (businessId, transaction = null) => {
  let subscription = await Subscription.findOne({
    where: { business_id: businessId },
    include: [
      {
        model: SubscriptionPlan,
        as: 'plan'
      }
    ],
    order: [['id', 'DESC']],
    transaction
  });

  // If business doesn't have a subscription yet, provision free trial
  if (!subscription) {
    const createdSub = await createTrialSubscription(businessId, transaction);
    subscription = await Subscription.findOne({
      where: { id: createdSub.id },
      include: [{ model: SubscriptionPlan, as: 'plan' }],
      transaction
    });
  }

  // Check expiration
  const now = new Date();
  if (
    (subscription.status === 'TRIAL' || subscription.status === 'ACTIVE') &&
    now > new Date(subscription.ends_at)
  ) {
    await subscription.update({ status: 'EXPIRED' }, { transaction });
    subscription.status = 'EXPIRED';
  }

  return subscription;
};

/**
 * Check if business can perform an action based on subscription status and quota limits
 * @param {number|string} businessId
 * @param {'max_users'|'max_outlets'|'max_products'|'max_transactions'} limitType
 */
const checkSubscriptionLimit = async (businessId, limitType, transaction = null) => {
  const subscription = await getActiveSubscription(businessId, transaction);

  if (subscription.status !== 'TRIAL' && subscription.status !== 'ACTIVE') {
    throw new ForbiddenError(
      'Subscription is expired or inactive. Please upgrade or renew your subscription plan.',
      'SUBSCRIPTION_EXPIRED'
    );
  }

  const plan = subscription.plan;
  const limit = plan ? plan[limitType] : 1;

  // -1 indicates unlimited capacity
  if (limit === -1) {
    return true;
  }

  let currentCount = 0;
  let limitName = 'Resource';

  switch (limitType) {
    case 'max_users': {
      currentCount = await BusinessUser.count({
        where: { business_id: businessId, is_active: true },
        transaction
      });
      limitName = 'User limit reached for current subscription plan.';
      break;
    }
    case 'max_outlets': {
      currentCount = await Outlet.count({
        where: { business_id: businessId, is_active: true },
        transaction
      });
      limitName = 'Outlet limit reached for current subscription plan.';
      break;
    }
    case 'max_products': {
      currentCount = await Product.count({
        where: { business_id: businessId, is_active: true },
        transaction
      });
      limitName = 'Product limit reached for current subscription plan.';
      break;
    }
    case 'max_transactions': {
      currentCount = await Transaction.count({
        where: { business_id: businessId },
        transaction
      });
      limitName = 'Transaction limit reached for current subscription plan.';
      break;
    }
    default:
      break;
  }

  if (currentCount >= limit) {
    throw new ForbiddenError(
      `${limitName} (${currentCount}/${limit}). Please upgrade your plan.`,
      'SUBSCRIPTION_LIMIT_REACHED'
    );
  }

  return true;
};

/**
 * Get full subscription overview with current usage metrics
 */
const getSubscriptionOverview = async (businessId) => {
  const subscription = await getActiveSubscription(businessId);
  const plan = subscription.plan;

  const [usersCount, outletsCount, productsCount, transactionsCount] = await Promise.all([
    BusinessUser.count({ where: { business_id: businessId, is_active: true } }),
    Outlet.count({ where: { business_id: businessId, is_active: true } }),
    Product.count({ where: { business_id: businessId, is_active: true } }),
    Transaction.count({ where: { business_id: businessId } })
  ]);

  return {
    subscription: {
      id: subscription.id,
      status: subscription.status,
      starts_at: subscription.starts_at,
      trial_ends_at: subscription.trial_ends_at,
      ends_at: subscription.ends_at,
      plan: {
        id: plan.id,
        name: plan.name,
        code: plan.code,
        price: parseFloat(plan.price),
        duration_days: plan.duration_days,
        limits: {
          max_users: plan.max_users,
          max_outlets: plan.max_outlets,
          max_products: plan.max_products,
          max_transactions: plan.max_transactions
        }
      }
    },
    usage: {
      users: { current: usersCount, max: plan.max_users },
      outlets: { current: outletsCount, max: plan.max_outlets },
      products: { current: productsCount, max: plan.max_products },
      transactions: { current: transactionsCount, max: plan.max_transactions }
    }
  };
};

/**
 * List all available subscription plans
 */
const listPlans = async () => {
  return await SubscriptionPlan.findAll({
    where: { is_active: true },
    order: [['price', 'ASC']]
  });
};

/**
 * Upgrade business subscription plan (Simulated upgrade for SaaS testing)
 */
const upgradeSubscription = async (businessId, planId, newStatus = 'ACTIVE') => {
  const plan = await SubscriptionPlan.findOne({
    where: { id: planId, is_active: true }
  });

  if (!plan) {
    throw new NotFoundError('Subscription plan not found or inactive');
  }

  const durationDays = plan.duration_days || 30;
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const subscription = await Subscription.create({
    business_id: businessId,
    plan_id: plan.id,
    status: newStatus,
    starts_at: startsAt,
    trial_ends_at: null,
    ends_at: endsAt
  });

  await recordAuditLog({
    business_id: businessId,
    action: 'SUBSCRIPTION_UPGRADED',
    entity_type: 'SUBSCRIPTION',
    entity_id: subscription.id,
    metadata: { plan_id: plan.id, plan_name: plan.name, new_status: newStatus }
  });

  return await getSubscriptionOverview(businessId);
};

/**
 * Create Midtrans Snap Checkout for Subscription
 * @param {number|string} businessId
 * @param {number|string} planId
 * @param {Object} currentUser
 * @returns {Promise<{ invoice: Object, token: string, redirect_url: string }>}
 */
const createCheckoutSession = async (businessId, planId, currentUser) => {
  const plan = await SubscriptionPlan.findOne({
    where: { id: planId, is_active: true }
  });

  if (!plan) {
    throw new NotFoundError('Paket langganan tidak ditemukan atau sedang tidak aktif.');
  }

  const amount = parseFloat(plan.price);

  // If free plan (Rp 0), activate directly without Midtrans
  if (amount <= 0) {
    const overview = await upgradeSubscription(businessId, plan.id, 'ACTIVE');
    return {
      is_free: true,
      message: 'Paket gratis berhasil diaktifkan.',
      overview
    };
  }

  // Generate unique order ID with prefix INV-SUB
  const timestamp = Date.now();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderId = `INV-SUB-${timestamp}-${randomSuffix}`;

  // Call Midtrans Snap to create payment token & redirect URL
  const snapResult = await midtransService.createSnapTransaction({
    orderId,
    grossAmount: amount,
    itemDetails: [
      {
        id: `PLAN-${plan.id}`,
        price: Math.round(amount),
        quantity: 1,
        name: `Langganan ${plan.name}`.substring(0, 50)
      }
    ],
    customerDetails: {
      name: currentUser?.name || 'Owner',
      email: currentUser?.email || 'owner@bizmanage.id',
      phone: currentUser?.phone || '08123456789'
    }
  });

  // Record pending invoice in database
  const invoice = await SubscriptionInvoice.create({
    order_id: orderId,
    business_id: businessId,
    plan_id: plan.id,
    amount: amount,
    status: 'PENDING',
    snap_token: snapResult.token,
    snap_redirect_url: snapResult.redirect_url
  });

  await recordAuditLog({
    business_id: businessId,
    action: 'SUBSCRIPTION_CHECKOUT_CREATED',
    entity_type: 'SUBSCRIPTION_INVOICE',
    entity_id: invoice.id,
    metadata: { order_id: orderId, plan_id: plan.id, amount }
  });

  return {
    is_free: false,
    order_id: orderId,
    token: snapResult.token,
    redirect_url: snapResult.redirect_url,
    amount: amount,
    plan: {
      id: plan.id,
      name: plan.name,
      price: amount,
      duration_days: plan.duration_days
    }
  };
};

/**
 * Process successful payment and activate subscription
 * @param {Object} invoice
 * @param {Object} [notification]
 * @param {Object} [transaction]
 */
const processPaymentSuccess = async (invoice, notification = null, transaction = null) => {
  if (invoice.status === 'PAID') {
    return invoice;
  }

  const plan = await SubscriptionPlan.findByPk(invoice.plan_id, { transaction });
  if (!plan) {
    throw new NotFoundError('Paket langganan dari invoice tidak ditemukan.');
  }

  const durationDays = plan.duration_days || 30;
  const now = new Date();

  // Find existing subscription to check if extending
  const currentSub = await Subscription.findOne({
    where: { business_id: invoice.business_id },
    order: [['id', 'DESC']],
    transaction
  });

  let startsAt = now;
  let endsAt;

  if (currentSub && (currentSub.status === 'ACTIVE' || currentSub.status === 'TRIAL') && new Date(currentSub.ends_at) > now) {
    // Extend from existing active ends_at
    endsAt = new Date(new Date(currentSub.ends_at).getTime() + durationDays * 24 * 60 * 60 * 1000);
  } else {
    // Fresh start from today
    endsAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  }

  // Create new active subscription record
  const newSub = await Subscription.create({
    business_id: invoice.business_id,
    plan_id: plan.id,
    status: 'ACTIVE',
    starts_at: startsAt,
    trial_ends_at: null,
    ends_at: endsAt
  }, { transaction });

  // Update invoice status to PAID
  await invoice.update({
    status: 'PAID',
    paid_at: now,
    payment_type: notification?.payment_type || invoice.payment_type || 'midtrans',
    subscription_id: newSub.id,
    midtrans_response: notification || invoice.midtrans_response
  }, { transaction });

  await recordAuditLog({
    business_id: invoice.business_id,
    action: 'SUBSCRIPTION_PAYMENT_SUCCESS',
    entity_type: 'SUBSCRIPTION_INVOICE',
    entity_id: invoice.id,
    metadata: {
      order_id: invoice.order_id,
      amount: invoice.amount,
      plan_id: plan.id,
      subscription_id: newSub.id,
      ends_at: endsAt
    },
    transaction
  });

  return invoice;
};

/**
 * Handle Midtrans Webhook Notification
 * @param {Object} notification
 */
const handleMidtransNotification = async (notification) => {
  // 1. Verify Midtrans signature
  const isValid = midtransService.verifyNotificationSignature(notification);
  if (!isValid) {
    console.warn(`[MIDTRANS WEBHOOK WARNING] Invalid signature received for order ${notification?.order_id}`);
    throw new BadRequestError('Signature notifikasi Midtrans tidak valid.', 'INVALID_MIDTRANS_SIGNATURE');
  }

  const { order_id, transaction_status, fraud_status, payment_type } = notification;

  // 2. Find invoice
  const invoice = await SubscriptionInvoice.findOne({
    where: { order_id },
    include: [{ model: SubscriptionPlan, as: 'plan' }]
  });

  if (!invoice) {
    console.warn(`[MIDTRANS WEBHOOK] Invoice with order_id ${order_id} not found.`);
    throw new NotFoundError(`Invoice dengan order ID "${order_id}" tidak ditemukan.`);
  }

  // 3. Process status according to Midtrans specs
  if (
    transaction_status === 'settlement' ||
    (transaction_status === 'capture' && fraud_status === 'accept')
  ) {
    await processPaymentSuccess(invoice, notification);
    return { status: 'PAID', message: 'Pembayaran berhasil dikonfirmasi dan langganan aktif.' };
  } else if (transaction_status === 'pending') {
    await invoice.update({
      payment_type: payment_type || invoice.payment_type,
      midtrans_response: notification
    });
    return { status: 'PENDING', message: 'Menunggu pembayaran diselesaikan oleh pengguna.' };
  } else if (transaction_status === 'expire') {
    await invoice.update({
      status: 'EXPIRED',
      midtrans_response: notification
    });
    return { status: 'EXPIRED', message: 'Pembayaran kadaluarsa.' };
  } else if (['cancel', 'deny'].includes(transaction_status)) {
    await invoice.update({
      status: 'FAILED',
      midtrans_response: notification
    });
    return { status: 'FAILED', message: 'Pembayaran dibatalkan atau ditolak.' };
  }

  return { status: invoice.status, message: `Status transaksi: ${transaction_status}` };
};

/**
 * Check and Synchronize Payment Status directly with Midtrans API
 * @param {string} orderId
 * @param {number|string} [businessId]
 */
const checkPaymentStatus = async (orderId, businessId = null) => {
  const where = { order_id: orderId };
  if (businessId) {
    where.business_id = businessId;
  }

  const invoice = await SubscriptionInvoice.findOne({
    where,
    include: [
      { model: SubscriptionPlan, as: 'plan' },
      { model: Subscription, as: 'subscription' }
    ]
  });

  if (!invoice) {
    throw new NotFoundError(`Invoice dengan nomor "${orderId}" tidak ditemukan.`);
  }

  // If already paid, return immediately
  if (invoice.status === 'PAID') {
    return {
      order_id: invoice.order_id,
      status: invoice.status,
      amount: invoice.amount,
      paid_at: invoice.paid_at,
      payment_type: invoice.payment_type,
      plan: invoice.plan,
      subscription: invoice.subscription
    };
  }

  // Query Midtrans API directly
  try {
    const midtransRes = await midtransService.checkTransactionStatus(orderId);
    const txStatus = midtransRes.transaction_status;
    const fraudStatus = midtransRes.fraud_status;

    if (
      txStatus === 'settlement' ||
      (txStatus === 'capture' && fraudStatus === 'accept')
    ) {
      await processPaymentSuccess(invoice, midtransRes);
      await invoice.reload({
        include: [
          { model: SubscriptionPlan, as: 'plan' },
          { model: Subscription, as: 'subscription' }
        ]
      });
    } else if (txStatus === 'expire') {
      await invoice.update({ status: 'EXPIRED', midtrans_response: midtransRes });
    } else if (['cancel', 'deny'].includes(txStatus)) {
      await invoice.update({ status: 'FAILED', midtrans_response: midtransRes });
    }
  } catch (err) {
    // If status check fails (e.g. order not yet created in Midtrans or sandbox/prod mismatch), log but return current state
    console.warn(`Midtrans direct check notice for ${orderId}:`, err.message);
  }

  return {
    order_id: invoice.order_id,
    status: invoice.status,
    amount: invoice.amount,
    paid_at: invoice.paid_at,
    payment_type: invoice.payment_type,
    snap_token: invoice.snap_token,
    snap_redirect_url: invoice.snap_redirect_url,
    plan: invoice.plan,
    subscription: invoice.subscription
  };
};

/**
 * List all invoices for a business
 * @param {number|string} businessId
 */
const listInvoices = async (businessId) => {
  return await SubscriptionInvoice.findAll({
    where: { business_id: businessId },
    order: [['id', 'DESC']],
    include: [
      { model: SubscriptionPlan, as: 'plan', attributes: ['id', 'name', 'code', 'price'] }
    ]
  });
};

module.exports = {
  createTrialSubscription,
  getActiveSubscription,
  checkSubscriptionLimit,
  getSubscriptionOverview,
  listPlans,
  upgradeSubscription,
  createCheckoutSession,
  handleMidtransNotification,
  checkPaymentStatus,
  listInvoices
};


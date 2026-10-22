const {
  User,
  Business,
  BusinessUser,
  Outlet,
  Subscription,
  SubscriptionPlan,
  SubscriptionInvoice,
  Transaction,
  Payment,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const { generateAccessToken } = require('../utils/jwt');
const { UnauthorizedError, NotFoundError, BadRequestError } = require('../utils/customErrors');
const { comparePassword } = require('../utils/password');

const DEVELOPER_DEFAULT_EMAIL = process.env.DEVELOPER_EMAIL || 'developer@bizmanage.local';
const DEVELOPER_DEFAULT_PASSWORD = process.env.DEVELOPER_PASSWORD || 'Developer#2026!';
const DEVELOPER_SECRET_KEY = process.env.DEVELOPER_SECRET_KEY || 'developer_super_secret_2026';

/**
 * Developer Authentication Login
 */
const developerLogin = async ({ email, password, developerKey }) => {
  // Option 1: Fast Master Key Access
  if (developerKey && developerKey === DEVELOPER_SECRET_KEY) {
    const token = generateAccessToken({
      isDeveloper: true,
      email: DEVELOPER_DEFAULT_EMAIL,
      name: 'System Developer'
    });
    return {
      token,
      developer: {
        email: DEVELOPER_DEFAULT_EMAIL,
        name: 'System Developer',
        role: 'SUPERADMIN'
      }
    };
  }

  // Option 2: Default Developer Credentials Check
  if (email === DEVELOPER_DEFAULT_EMAIL && password === DEVELOPER_DEFAULT_PASSWORD) {
    const token = generateAccessToken({
      isDeveloper: true,
      email: DEVELOPER_DEFAULT_EMAIL,
      name: 'System Developer'
    });
    return {
      token,
      developer: {
        email: DEVELOPER_DEFAULT_EMAIL,
        name: 'System Developer',
        role: 'SUPERADMIN'
      }
    };
  }

  // Option 3: Check database user if marked as developer
  if (email && password) {
    const user = await User.findOne({ where: { email } });
    if (user && user.is_active) {
      const isMatch = await comparePassword(password, user.password);
      if (isMatch && (user.email.includes('dev') || user.email.includes('admin'))) {
        const token = generateAccessToken({
          isDeveloper: true,
          userId: user.id,
          email: user.email,
          name: user.name
        });
        return {
          token,
          developer: {
            email: user.email,
            name: user.name,
            role: 'DEVELOPER'
          }
        };
      }
    }
  }

  throw new UnauthorizedError('Kredensial developer tidak valid. Silakan periksa email, password, atau master key developer Anda.', 'INVALID_DEV_CREDENTIALS');
};

/**
 * System-Wide Monitoring Statistics
 */
const getSystemStats = async () => {
  const [
    totalUsers,
    totalBusinesses,
    totalOutlets,
    totalTransactions,
    transactionSumResult,
    activeSubsCount,
    trialSubsCount,
    expiredSubsCount,
    plans,
    planStats,
    recentTransactions,
    recentBusinesses
  ] = await Promise.all([
    User.count(),
    Business.count(),
    Outlet.count(),
    Transaction.count(),
    Transaction.findAll({
      attributes: [[sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue']],
      raw: true
    }),
    Subscription.count({ where: { status: 'ACTIVE' } }),
    Subscription.count({ where: { status: 'TRIAL' } }),
    Subscription.count({ where: { status: 'EXPIRED' } }),
    SubscriptionPlan.findAll({ where: { is_active: true } }),
    SubscriptionPlan.findAll({
      where: { is_active: true },
      attributes: [
        'id',
        'name',
        'code',
        'price',
        [sequelize.fn('COUNT', sequelize.col('subscriptions.id')), 'subscriptionCount']
      ],
      include: [{ model: Subscription, as: 'subscriptions', attributes: [] }],
      group: ['SubscriptionPlan.id', 'SubscriptionPlan.name', 'SubscriptionPlan.code', 'SubscriptionPlan.price'],
      raw: true
    }),
    Transaction.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        { model: Business, as: 'business', attributes: ['id', 'name'] },
        { model: Outlet, as: 'outlet', attributes: ['id', 'name'] }
      ]
    }),
    Business.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
        { model: Outlet, as: 'outlets', attributes: ['id', 'name'] }
      ]
    })
  ]);

  const totalRevenue = parseFloat(transactionSumResult[0]?.totalRevenue || 0);

  // Calculate Estimated Monthly Recurring Revenue (MRR) based on active subscriptions
  const activeSubsWithPlan = await Subscription.findAll({
    where: { status: 'ACTIVE' },
    include: [{ model: SubscriptionPlan, as: 'plan', attributes: ['price'] }]
  });
  const mrr = activeSubsWithPlan.reduce((acc, curr) => {
    return acc + (curr.plan ? parseFloat(curr.plan.price || 0) : 0);
  }, 0);

  // Latest 5 Registered Users
  const recentUsers = await User.findAll({
    limit: 5,
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'name', 'email', 'phone', 'is_active', 'createdAt']
  });

  // Latest 5 Subscriptions
  const recentSubscriptions = await Subscription.findAll({
    limit: 5,
    order: [['createdAt', 'DESC']],
    include: [
      { model: Business, as: 'business', attributes: ['id', 'name'] },
      { model: SubscriptionPlan, as: 'plan', attributes: ['id', 'name', 'code', 'price'] }
    ]
  });

  const dbConfig = sequelize.config || {};

  return {
    overview: {
      totalUsers,
      totalBusinesses,
      totalOutlets,
      totalTransactions,
      totalRevenue,
      mrr,
      subscriptions: {
        active: activeSubsCount,
        trial: trialSubsCount,
        expired: expiredSubsCount,
        total: activeSubsCount + trialSubsCount + expiredSubsCount
      }
    },
    databaseInfo: {
      name: dbConfig.database || 'bizmanage_db',
      host: `${dbConfig.host || '127.0.0.1'}:${dbConfig.port || 3306}`,
      dialect: 'MySQL',
      status: 'Terhubung (Live MySQL Database)',
      lastSync: new Date().toISOString()
    },
    planDistribution: planStats.map(p => ({
      id: p.id,
      name: p.name,
      code: p.code,
      price: parseFloat(p.price || 0),
      count: parseInt(p.subscriptionCount || 0, 10)
    })),
    plansCount: plans.length,
    recentUsers,
    recentSubscriptions,
    recentTransactions,
    recentBusinesses: recentBusinesses.map(b => ({
      id: b.id,
      name: b.name,
      owner: b.owner?.name || '-',
      ownerEmail: b.owner?.email || '-',
      outletsCount: b.outlets?.length || 0,
      createdAt: b.createdAt
    }))
  };
};

/**
 * List Registered Users with Search & Pagination
 */
const listUsers = async ({ page = 1, limit = 15, search = '' }) => {
  const offset = (Number(page) - 1) * Number(limit);
  const where = {};

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } }
    ];
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    distinct: true,
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'name', 'email', 'phone', 'is_active', 'createdAt', 'updatedAt'],
    include: [
      {
        model: Business,
        as: 'ownedBusinesses',
        attributes: ['id', 'name', 'is_active', 'createdAt'],
        include: [
          {
            model: Subscription,
            as: 'subscriptions',
            limit: 1,
            order: [['id', 'DESC']],
            include: [{ model: SubscriptionPlan, as: 'plan', attributes: ['id', 'name', 'price', 'code'] }]
          }
        ]
      }
    ]
  });

  return {
    users: rows,
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / Number(limit))
  };
};

/**
 * Toggle User Active Status
 */
const toggleUserStatus = async (userId, isActive) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('User tidak ditemukan.');
  }

  await user.update({ is_active: isActive });
  return user;
};

/**
 * List All Businesses with Subscriptions & Metrics
 */
const listBusinesses = async ({ page = 1, limit = 15, search = '', status = '' }) => {
  const offset = (Number(page) - 1) * Number(limit);
  const where = {};

  if (search) {
    where.name = { [Op.like]: `%${search}%` };
  }

  const { rows, count } = await Business.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    distinct: true,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: User,
        as: 'owner',
        attributes: ['id', 'name', 'email', 'phone']
      },
      {
        model: Outlet,
        as: 'outlets',
        attributes: ['id', 'name', 'code', 'is_active']
      },
      {
        model: Subscription,
        as: 'subscriptions',
        limit: 1,
        order: [['id', 'DESC']],
        include: [
          {
            model: SubscriptionPlan,
            as: 'plan'
          }
        ]
      }
    ]
  });

  return {
    businesses: rows,
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / Number(limit))
  };
};

/**
 * List All Subscriptions
 */
const listSubscriptions = async ({ page = 1, limit = 20, status = '' }) => {
  const offset = (Number(page) - 1) * Number(limit);
  const where = {};

  if (status && status !== 'ALL') {
    where.status = status;
  }

  const { rows, count } = await Subscription.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: Business,
        as: 'business',
        attributes: ['id', 'name'],
        include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }]
      },
      {
        model: SubscriptionPlan,
        as: 'plan'
      }
    ]
  });

  return {
    subscriptions: rows,
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / Number(limit))
  };
};

/**
 * Manually update/extend subscription
 */
const updateSubscription = async (id, data) => {
  const sub = await Subscription.findByPk(id, {
    include: [{ model: SubscriptionPlan, as: 'plan' }]
  });

  if (!sub) {
    throw new NotFoundError('Langganan tidak ditemukan.');
  }

  const updates = {};
  if (data.status) updates.status = data.status;
  if (data.plan_id) updates.plan_id = Number(data.plan_id);

  // Extend duration
  if (data.extend_days) {
    const currentEnd = new Date(sub.ends_at);
    const newEnd = new Date(currentEnd.getTime() + Number(data.extend_days) * 24 * 60 * 60 * 1000);
    updates.ends_at = newEnd;
    if (sub.status === 'TRIAL') {
      updates.trial_ends_at = newEnd;
    }
    // If it was expired but now in future, set to ACTIVE or TRIAL
    if (newEnd > new Date() && sub.status === 'EXPIRED') {
      updates.status = 'ACTIVE';
    }
  }

  if (data.ends_at) {
    updates.ends_at = new Date(data.ends_at);
  }

  await sub.update(updates);
  return await Subscription.findByPk(id, {
    include: [
      { model: Business, as: 'business', attributes: ['id', 'name'] },
      { model: SubscriptionPlan, as: 'plan' }
    ]
  });
};

/**
 * SaaS Plans Management (Developer can adjust pricing and limits)
 */
const listPlans = async () => {
  return await SubscriptionPlan.findAll({
    where: { is_active: true },
    order: [['price', 'ASC']]
  });
};

const createPlan = async (data) => {
  const {
    name,
    code,
    description,
    price = 0,
    duration_days = 30,
    max_users = -1,
    max_outlets = 1,
    max_products = -1,
    max_transactions = -1,
    is_active = true
  } = data;

  if (!name || !code) {
    throw new BadRequestError('Nama paket dan kode paket wajib diisi.');
  }

  const existing = await SubscriptionPlan.findOne({ where: { code } });
  if (existing) {
    throw new BadRequestError(`Kode paket "${code}" sudah digunakan.`);
  }

  return await SubscriptionPlan.create({
    name,
    code,
    description,
    price: Number(price),
    duration_days: Number(duration_days),
    max_users: Number(max_users),
    max_outlets: Number(max_outlets),
    max_products: Number(max_products),
    max_transactions: Number(max_transactions),
    is_active: Boolean(is_active)
  });
};

const updatePlan = async (id, data) => {
  const plan = await SubscriptionPlan.findByPk(id);
  if (!plan) {
    throw new NotFoundError('Paket langganan tidak ditemukan.');
  }

  const updates = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.price !== undefined) updates.price = Number(data.price);
  if (data.duration_days !== undefined) updates.duration_days = Number(data.duration_days);
  if (data.max_users !== undefined) updates.max_users = Number(data.max_users);
  if (data.max_outlets !== undefined) updates.max_outlets = Number(data.max_outlets);
  if (data.max_products !== undefined) updates.max_products = Number(data.max_products);
  if (data.max_transactions !== undefined) updates.max_transactions = Number(data.max_transactions);
  if (data.is_active !== undefined) updates.is_active = Boolean(data.is_active);

  await plan.update(updates);
  return plan;
};

const deletePlan = async (id) => {
  const plan = await SubscriptionPlan.findByPk(id);
  if (!plan) {
    throw new NotFoundError('Paket langganan tidak ditemukan.');
  }

  // Soft deactivate
  await plan.update({ is_active: false });
  return { message: 'Paket berhasil dinonaktifkan.' };
};

/**
 * List all subscription invoices with search and filters (Developer monitoring)
 */
const listInvoices = async ({ page = 1, limit = 15, status = '' }) => {
  const offset = (Number(page) - 1) * Number(limit);
  const where = {};
  if (status && status !== 'ALL') {
    where.status = status;
  }

  const { rows, count } = await SubscriptionInvoice.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: Business,
        as: 'business',
        attributes: ['id', 'name'],
        include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email', 'phone'] }]
      },
      {
        model: SubscriptionPlan,
        as: 'plan',
        attributes: ['id', 'name', 'code', 'price']
      }
    ]
  });

  return {
    invoices: rows,
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / Number(limit))
  };
};

module.exports = {
  developerLogin,
  getSystemStats,
  listUsers,
  toggleUserStatus,
  listBusinesses,
  listSubscriptions,
  updateSubscription,
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  listInvoices
};


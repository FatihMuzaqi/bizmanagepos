const { 
  User, 
  Business, 
  BusinessUser, 
  Outlet, 
  UserOutlet, 
  Role,
  Unit,
  sequelize 
} = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } = require('../utils/customErrors');
const { initializeDefaultRolesForBusiness } = require('./rbacService');
const { Op } = require('sequelize');
const { recordAuditLog } = require('./auditLogService');

/**
 * Register a new user and initialize primary business, outlet, and default roles
 * @param {Object} payload 
 */
const registerUser = async (payload) => {
  const { name, email, phone, password, business_name, outlet_name = 'Outlet Pusat' } = payload;

  // 1. Check if email already exists
  const existingEmail = await User.findOne({ where: { email } });
  if (existingEmail) {
    throw new ConflictError('Email is already registered', 'EMAIL_ALREADY_EXISTS');
  }

  // 2. Check if phone already exists
  if (phone) {
    const existingPhone = await User.findOne({ where: { phone } });
    if (existingPhone) {
      throw new ConflictError('Phone number is already registered', 'PHONE_ALREADY_EXISTS');
    }
  }

  // 3. Hash password
  const hashedPassword = await hashPassword(password);

  // 4. Execute atomic database transaction
  const result = await sequelize.transaction(async (t) => {
    // Create User
    const user = await User.create({
      name,
      email,
      phone: phone || null,
      password: hashedPassword,
      is_active: true
    }, { transaction: t });

    // Create Primary Business
    const business = await Business.create({
      owner_id: user.id,
      name: business_name,
      is_active: true
    }, { transaction: t });

    // Associate User with Business as Owner
    await BusinessUser.create({
      business_id: business.id,
      user_id: user.id,
      is_owner: true,
      is_active: true
    }, { transaction: t });

    // Create Initial Outlet
    const outlet = await Outlet.create({
      business_id: business.id,
      name: outlet_name,
      code: 'OUT-01',
      is_active: true
    }, { transaction: t });

    // Associate User with Initial Outlet
    await UserOutlet.create({
      user_id: user.id,
      outlet_id: outlet.id
    }, { transaction: t });

    // Initialize Default Roles (Admin & Cashier) for this business
    await initializeDefaultRolesForBusiness(business.id, t);

    // Initialize Default Measurement Units for this business
    const defaultUnits = [
      { business_id: business.id, name: 'Gram', symbol: 'gr', is_active: true },
      { business_id: business.id, name: 'Milliliter', symbol: 'ml', is_active: true },
      { business_id: business.id, name: 'Pieces', symbol: 'pcs', is_active: true },
      { business_id: business.id, name: 'Kilogram', symbol: 'kg', is_active: true },
      { business_id: business.id, name: 'Liter', symbol: 'L', is_active: true },
      { business_id: business.id, name: 'Cup', symbol: 'cup', is_active: true },
      { business_id: business.id, name: 'Sachet', symbol: 'sct', is_active: true }
    ];
    await Unit.bulkCreate(defaultUnits, { transaction: t });

    // Provision Free Trial Subscription (14 Days)
    const { createTrialSubscription } = require('./subscriptionService');
    await createTrialSubscription(business.id, t);

    // Generate JWT tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save refresh token to user
    await user.update({ refresh_token: refreshToken }, { transaction: t });

    // Record Audit Log for Business Creation
    await recordAuditLog({
      business_id: business.id,
      user_id: user.id,
      action: 'BUSINESS_CREATED',
      entity_type: 'BUSINESS',
      entity_id: business.id,
      metadata: { name: business.name, owner_email: user.email },
      transaction: t
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      business: {
        id: business.id,
        name: business.name,
        is_owner: true
      },
      outlet: {
        id: outlet.id,
        name: outlet.name,
        code: outlet.code
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken
      }
    };
  });

  return result;
};

/**
 * Login user and generate access/refresh tokens
 * @param {Object} credentials 
 */
const loginUser = async ({ email, password }) => {
  const identifier = (email || '').trim();

  // 1. Find user by email (case-insensitive) OR phone number
  const user = await User.findOne({
    where: {
      [Op.or]: [
        sequelize.where(
          sequelize.fn('LOWER', sequelize.col('email')),
          identifier.toLowerCase()
        ),
        { phone: identifier }
      ]
    }
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (!user.is_active) {
    throw new UnauthorizedError('User account is deactivated. Please contact support.', 'ACCOUNT_DEACTIVATED');
  }

  // 2. Verify password
  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // 3. Fetch businesses user belongs to
  const businessMemberships = await BusinessUser.findAll({
    where: {
      user_id: user.id,
      is_active: true
    },
    include: [
      {
        model: Business,
        as: 'business',
        where: { is_active: true },
        attributes: ['id', 'name', 'logo']
      },
      {
        model: Role,
        as: 'roles',
        attributes: ['id', 'name']
      }
    ]
  });

  const businesses = businessMemberships.map((bm) => ({
    id: bm.business.id,
    name: bm.business.name,
    logo: bm.business.logo,
    is_owner: bm.is_owner,
    roles: bm.is_owner ? ['Owner'] : (bm.roles || []).map(r => r.name)
  }));

  // 4. Generate tokens
  const tokenPayload = {
    userId: user.id,
    email: user.email
  };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // 5. Update refresh token in database
  await user.update({ refresh_token: refreshToken });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone
    },
    businesses,
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken
    }
  };
};

/**
 * Refresh access token using a valid refresh token
 * @param {string} refreshToken 
 */
const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token is required', 'TOKEN_REQUIRED');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const user = await User.findOne({
    where: {
      id: decoded.userId,
      refresh_token: refreshToken,
      is_active: true
    }
  });

  if (!user) {
    throw new UnauthorizedError('Refresh token revoked or invalid session', 'REVOKED_REFRESH_TOKEN');
  }

  // Generate new token pair (Rotating refresh token for security)
  const tokenPayload = {
    userId: user.id,
    email: user.email
  };
  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  await user.update({ refresh_token: newRefreshToken });

  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken
  };
};

/**
 * Invalidate user refresh token (Logout)
 * @param {number|string} userId 
 */
const logoutUser = async (userId) => {
  await User.update(
    { refresh_token: null },
    { where: { id: userId } }
  );
  return true;
};

/**
 * Get current user profile with businesses
 * @param {number|string} userId 
 */
const getUserProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'name', 'email', 'phone', 'is_active', 'created_at']
  });

  if (!user) {
    throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  const businessMemberships = await BusinessUser.findAll({
    where: {
      user_id: user.id,
      is_active: true
    },
    include: [
      {
        model: Business,
        as: 'business',
        where: { is_active: true },
        attributes: ['id', 'name', 'legal_name', 'logo']
      },
      {
        model: Role,
        as: 'roles',
        attributes: ['id', 'name']
      }
    ]
  });

  const businesses = businessMemberships.map((bm) => ({
    id: bm.business.id,
    name: bm.business.name,
    legal_name: bm.business.legal_name,
    logo: bm.business.logo,
    is_owner: bm.is_owner,
    roles: bm.is_owner ? ['Owner'] : (bm.roles || []).map(r => r.name)
  }));

  return {
    user,
    businesses
  };
};

/**
 * Update user profile (name, phone)
 * @param {number|string} userId 
 * @param {Object} payload 
 */
const updateProfile = async (userId, { name, phone }) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  // Check phone uniqueness if changing phone
  if (phone && phone !== user.phone) {
    const existingPhone = await User.findOne({
      where: {
        phone,
        id: { [Op.ne]: userId }
      }
    });
    if (existingPhone) {
      throw new ConflictError('Phone number is already in use by another user', 'PHONE_ALREADY_EXISTS');
    }
  }

  await user.update({
    name: name || user.name,
    phone: phone !== undefined ? phone : user.phone
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    is_active: user.is_active
  };
};

/**
 * Change user password
 * @param {number|string} userId 
 * @param {Object} payload 
 */
const changePassword = async (userId, { current_password, new_password }) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  // Verify current password
  const isMatch = await comparePassword(current_password, user.password);
  if (!isMatch) {
    throw new BadRequestError('Current password does not match', 'INVALID_CURRENT_PASSWORD');
  }

  // Hash new password
  const hashedPassword = await hashPassword(new_password);

  // Update password and invalidate refresh token
  await user.update({
    password: hashedPassword,
    refresh_token: null
  });

  return true;
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getUserProfile,
  updateProfile,
  changePassword
};

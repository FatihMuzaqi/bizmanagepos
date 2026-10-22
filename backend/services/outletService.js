const { Outlet, UserOutlet, User, BusinessUser, Role, sequelize } = require('../models');
const { NotFoundError, ForbiddenError, BadRequestError, ConflictError } = require('../utils/customErrors');
const { getUserAllowedOutlets } = require('./rbacService');
const { Op } = require('sequelize');

/**
 * List outlets in active business accessible to the user
 * @param {number|string} businessId 
 * @param {number|string} userId 
 * @param {boolean} isOwner 
 */
const listOutlets = async (businessId, userId, isOwner) => {
  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);

  if (allowedOutletIds.length === 0) {
    return [];
  }

  const outlets = await Outlet.findAll({
    where: {
      id: allowedOutletIds,
      business_id: businessId,
      is_active: true
    },
    include: [
      {
        model: User,
        as: 'users',
        attributes: ['id', 'name', 'email', 'phone', 'is_active'],
        through: { attributes: [] },
        include: [
          {
            model: BusinessUser,
            as: 'businessMemberships',
            where: { business_id: businessId, is_active: true },
            required: false,
            include: [
              {
                model: Role,
                as: 'roles',
                attributes: ['id', 'name']
              }
            ]
          }
        ]
      }
    ],
    order: [['name', 'ASC']]
  });

  const formattedOutlets = outlets.map((o) => {
    const json = o.toJSON();
    const cashiers = (json.users || [])
      .filter((u) => u.is_active)
      .map((u) => {
        const membership = (u.businessMemberships || []).find((bm) => bm.business_id == businessId);
        const isUserOwner = membership?.is_owner === true;
        const roles = isUserOwner
          ? ['Owner']
          : (membership?.roles || []).map((r) => r.name);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          is_owner: isUserOwner,
          role: roles.join(', ') || 'Kasir'
        };
      });

    return {
      ...json,
      cashiers,
      users: cashiers
    };
  });

  return formattedOutlets;
};

/**
 * Get outlet detail by ID with tenant and access verification
 * @param {number|string} businessId 
 * @param {number|string} outletId 
 * @param {number|string} userId 
 * @param {boolean} isOwner 
 */
const getOutletById = async (businessId, outletId, userId, isOwner) => {
  const outlet = await Outlet.findOne({
    where: {
      id: outletId,
      business_id: businessId
    },
    include: [
      {
        model: User,
        as: 'users',
        attributes: ['id', 'name', 'email', 'phone', 'is_active'],
        through: { attributes: [] },
        include: [
          {
            model: BusinessUser,
            as: 'businessMemberships',
            where: { business_id: businessId, is_active: true },
            required: false,
            include: [
              {
                model: Role,
                as: 'roles',
                attributes: ['id', 'name']
              }
            ]
          }
        ]
      }
    ]
  });

  if (!outlet) {
    throw new NotFoundError('Outlet not found in this business', 'OUTLET_NOT_FOUND');
  }

  // If user is not owner, verify user has access to this outlet (WHERE dimension)
  if (!isOwner) {
    const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
    if (!allowedOutletIds.includes(Number(outletId))) {
      throw new ForbiddenError('You do not have access to this outlet', 'OUTLET_ACCESS_DENIED');
    }
  }

  const json = outlet.toJSON();
  const cashiers = (json.users || [])
    .filter((u) => u.is_active)
    .map((u) => {
      const membership = (u.businessMemberships || []).find((bm) => bm.business_id == businessId);
      const isUserOwner = membership?.is_owner === true;
      const roles = isUserOwner
        ? ['Owner']
        : (membership?.roles || []).map((r) => r.name);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        is_owner: isUserOwner,
        role: roles.join(', ') || 'Kasir'
      };
    });

  return {
    ...json,
    cashiers,
    users: cashiers
  };
};

/**
 * Create a new outlet in active business
 * @param {number|string} businessId 
 * @param {Object} payload 
 */
const createOutlet = async (businessId, payload) => {
  const { name, code, address, phone } = payload;

  // Check code uniqueness within this business if provided
  if (code) {
    const existingCode = await Outlet.findOne({
      where: {
        business_id: businessId,
        code
      }
    });

    if (existingCode) {
      throw new ConflictError(`Outlet with code "${code}" already exists in this business`, 'OUTLET_CODE_EXISTS');
    }
  }

  const outlet = await Outlet.create({
    business_id: businessId,
    name,
    code: code || null,
    address: address || null,
    phone: phone || null,
    is_active: true
  });

  return outlet;
};

/**
 * Update outlet information
 * @param {number|string} businessId 
 * @param {number|string} outletId 
 * @param {Object} payload 
 */
const updateOutlet = async (businessId, outletId, payload) => {
  const { name, code, address, phone, is_active } = payload;

  const outlet = await Outlet.findOne({
    where: {
      id: outletId,
      business_id: businessId
    }
  });

  if (!outlet) {
    throw new NotFoundError('Outlet not found in this business', 'OUTLET_NOT_FOUND');
  }

  // Check code uniqueness if changing code
  if (code && code !== outlet.code) {
    const existingCode = await Outlet.findOne({
      where: {
        business_id: businessId,
        code,
        id: { [Op.ne]: outletId }
      }
    });

    if (existingCode) {
      throw new ConflictError(`Outlet with code "${code}" already exists in this business`, 'OUTLET_CODE_EXISTS');
    }
  }

  await outlet.update({
    name: name !== undefined ? name : outlet.name,
    code: code !== undefined ? code : outlet.code,
    address: address !== undefined ? address : outlet.address,
    phone: phone !== undefined ? phone : outlet.phone,
    is_active: is_active !== undefined ? is_active : outlet.is_active
  });

  return outlet;
};

/**
 * Deactivate / Delete an outlet
 * @param {number|string} businessId 
 * @param {number|string} outletId 
 */
const deleteOutlet = async (businessId, outletId) => {
  const outlet = await Outlet.findOne({
    where: {
      id: outletId,
      business_id: businessId
    }
  });

  if (!outlet) {
    throw new NotFoundError('Outlet not found in this business', 'OUTLET_NOT_FOUND');
  }

  // Prevent deleting if this is the only active outlet in the business
  const activeOutletsCount = await Outlet.count({
    where: {
      business_id: businessId,
      is_active: true
    }
  });

  if (activeOutletsCount <= 1 && outlet.is_active) {
    throw new BadRequestError(
      'Cannot delete or deactivate the last remaining active outlet of the business',
      'CANNOT_DELETE_LAST_OUTLET'
    );
  }

  // Soft deactivate
  await outlet.update({ is_active: false });

  return true;
};

module.exports = {
  listOutlets,
  getOutletById,
  createOutlet,
  updateOutlet,
  deleteOutlet
};

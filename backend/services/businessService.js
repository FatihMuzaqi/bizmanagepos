const { 
  User,
  Business, 
  BusinessUser, 
  Outlet, 
  UserOutlet, 
  Role, 
  UserRole,
  Permission,
  sequelize 
} = require('../models');
const { NotFoundError, ForbiddenError, BadRequestError, ConflictError } = require('../utils/customErrors');
const { initializeDefaultRolesForBusiness, getUserPermissionsInBusiness, getUserAllowedOutlets } = require('./rbacService');
const { Op } = require('sequelize');
const { recordAuditLog } = require('./auditLogService');

/**
 * Create a new business under an existing user
 * @param {number|string} userId 
 * @param {Object} payload 
 */
const createBusiness = async (userId, payload) => {
  const { name, legal_name, logo, initial_outlet_name = 'Main Outlet' } = payload;

  const result = await sequelize.transaction(async (t) => {
    // 1. Create Business
    const business = await Business.create({
      owner_id: userId,
      name,
      legal_name: legal_name || null,
      logo: logo || null,
      is_active: true
    }, { transaction: t });

    // 2. Add User as Owner in BusinessUser
    await BusinessUser.create({
      business_id: business.id,
      user_id: userId,
      is_owner: true,
      is_active: true
    }, { transaction: t });

    // 3. Create Initial Outlet
    const outlet = await Outlet.create({
      business_id: business.id,
      name: initial_outlet_name,
      code: 'OUT-01',
      is_active: true
    }, { transaction: t });

    // 4. Associate User with Initial Outlet
    await UserOutlet.create({
      user_id: userId,
      outlet_id: outlet.id
    }, { transaction: t });

    // 5. Initialize default roles for this business
    await initializeDefaultRolesForBusiness(business.id, t);

    // 6. Provision Free Trial Subscription
    const { createTrialSubscription } = require('./subscriptionService');
    await createTrialSubscription(business.id, t);

    await recordAuditLog({
      business_id: business.id,
      user_id: userId,
      action: 'BUSINESS_CREATED',
      entity_type: 'BUSINESS',
      entity_id: business.id,
      metadata: { name: business.name },
      transaction: t
    });

    return {
      business,
      outlet
    };
  });

  return result;
};

/**
 * Get all businesses associated with a user
 * @param {number|string} userId 
 */
const getUserBusinesses = async (userId) => {
  const businessMemberships = await BusinessUser.findAll({
    where: {
      user_id: userId,
      is_active: true
    },
    include: [
      {
        model: Business,
        as: 'business',
        where: { is_active: true }
      },
      {
        model: Role,
        as: 'roles',
        attributes: ['id', 'name']
      }
    ]
  });

  return businessMemberships.map((bm) => ({
    id: bm.business.id,
    name: bm.business.name,
    legal_name: bm.business.legal_name,
    logo: bm.business.logo,
    is_owner: bm.is_owner,
    roles: bm.is_owner ? ['Owner'] : (bm.roles || []).map(r => r.name)
  }));
};

/**
 * Select/Switch business context and return active authorization profile
 * @param {number|string} userId 
 * @param {number|string} businessId 
 */
const selectBusinessContext = async (userId, businessId) => {
  const business = await Business.findOne({
    where: {
      id: businessId,
      is_active: true
    }
  });

  if (!business) {
    throw new NotFoundError('Business not found or inactive', 'BUSINESS_NOT_FOUND');
  }

  const businessUser = await BusinessUser.findOne({
    where: {
      user_id: userId,
      business_id: businessId,
      is_active: true
    }
  });

  if (!businessUser) {
    throw new ForbiddenError('You are not an active member of this business', 'TENANT_ACCESS_DENIED');
  }

  const { isOwner, permissions, roles } = await getUserPermissionsInBusiness(userId, businessId);
  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);

  const outlets = await Outlet.findAll({
    where: {
      id: allowedOutletIds,
      business_id: businessId,
      is_active: true
    },
    attributes: ['id', 'name', 'code', 'address', 'phone']
  });

  return {
    business: {
      id: business.id,
      name: business.name,
      legal_name: business.legal_name,
      logo: business.logo,
      is_owner: isOwner
    },
    roles,
    permissions,
    outlets
  };
};

/**
 * Get business details
 * @param {number|string} businessId 
 */
const getBusinessDetail = async (businessId) => {
  const business = await Business.findByPk(businessId, {
    attributes: ['id', 'name', 'legal_name', 'logo', 'owner_id', 'is_active', 'created_at']
  });

  if (!business) {
    throw new NotFoundError('Business not found', 'BUSINESS_NOT_FOUND');
  }

  const outletCount = await Outlet.count({
    where: { business_id: businessId, is_active: true }
  });

  const memberCount = await BusinessUser.count({
    where: { business_id: businessId, is_active: true }
  });

  return {
    ...business.toJSON(),
    stats: {
      total_active_outlets: outletCount,
      total_active_members: memberCount
    }
  };
};

/**
 * Update business profile
 * @param {number|string} businessId 
 * @param {Object} payload 
 */
const updateBusinessProfile = async (businessId, payload) => {
  const { name, legal_name, logo } = payload;
  const business = await Business.findByPk(businessId);
  
  if (!business) {
    throw new NotFoundError('Business not found', 'BUSINESS_NOT_FOUND');
  }

  await business.update({
    name: name !== undefined ? name : business.name,
    legal_name: legal_name !== undefined ? legal_name : business.legal_name,
    logo: logo !== undefined ? logo : business.logo
  });

  return business;
};

/**
 * Get all members/employees in a business
 * @param {number|string} businessId 
 */
const getBusinessMembers = async (businessId) => {
  const members = await BusinessUser.findAll({
    where: {
      business_id: businessId
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone', 'is_active']
      },
      {
        model: Role,
        as: 'roles',
        attributes: ['id', 'name', 'description']
      }
    ]
  });

  const formattedMembers = await Promise.all(
    members.map(async (m) => {
      const isOwner = m.is_owner;
      const outlets = await getUserAllowedOutlets(m.user_id, businessId, isOwner);
      const outletDetails = await Outlet.findAll({
        where: { id: outlets, business_id: businessId },
        attributes: ['id', 'name', 'code']
      });

      return {
        id: m.id,
        user_id: m.user_id,
        name: m.user.name,
        email: m.user.email,
        phone: m.user.phone,
        is_owner: m.is_owner,
        is_active: m.is_active,
        roles: m.is_owner ? [{ id: 0, name: 'Owner' }] : (m.roles || []).map(r => ({ id: r.id, name: r.name })),
        outlets: outletDetails
      };
    })
  );

  return formattedMembers;
};

/**
 * Get member detail by user ID in a business
 * @param {number|string} businessId 
 * @param {number|string} memberUserId 
 */
const getMemberById = async (businessId, memberUserId) => {
  const member = await BusinessUser.findOne({
    where: {
      business_id: businessId,
      user_id: memberUserId
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone', 'is_active']
      },
      {
        model: Role,
        as: 'roles',
        attributes: ['id', 'name', 'description']
      }
    ]
  });

  if (!member) {
    throw new NotFoundError('Member not found in this business', 'MEMBER_NOT_FOUND');
  }

  const outlets = await getUserAllowedOutlets(memberUserId, businessId, member.is_owner);
  const outletDetails = await Outlet.findAll({
    where: { id: outlets, business_id: businessId },
    attributes: ['id', 'name', 'code']
  });

  return {
    id: member.id,
    user_id: member.user_id,
    name: member.user.name,
    email: member.user.email,
    phone: member.user.phone,
    is_owner: member.is_owner,
    is_active: member.is_active,
    roles: member.is_owner ? [{ id: 0, name: 'Owner' }] : (member.roles || []).map(r => ({ id: r.id, name: r.name })),
    outlets: outletDetails
  };
};

/**
 * Add an existing user as member to business with assigned role and outlets
 * @param {number|string} businessId 
 * @param {Object} payload 
 */
const addBusinessMember = async (businessId, payload) => {
  const { email, role_id, outlet_ids, name, phone, password } = payload;
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Find user by email or create new user if password provided
  let user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    if (password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await User.create({
        name: (name && name.trim().length > 0) ? name.trim() : normalizedEmail.split('@')[0],
        email: normalizedEmail,
        phone: phone ? phone.trim() : null,
        password: hashedPassword,
        is_active: true
      });
    } else {
      throw new NotFoundError(`User with email "${email}" not found. The user must register first.`, 'USER_NOT_FOUND');
    }
  }

  // 2. Check if user already in business
  const existingMember = await BusinessUser.findOne({
    where: {
      business_id: businessId,
      user_id: user.id
    }
  });

  if (existingMember && existingMember.is_active) {
    throw new ConflictError('User is already an active member of this business', 'MEMBER_ALREADY_EXISTS');
  }

  // 3. Verify role belongs to this business
  const role = await Role.findOne({
    where: {
      id: role_id,
      business_id: businessId
    }
  });

  if (!role) {
    throw new BadRequestError('Invalid role for this business', 'INVALID_ROLE');
  }

  // 4. Verify all outlets belong to this business
  const validOutlets = await Outlet.findAll({
    where: {
      id: outlet_ids,
      business_id: businessId,
      is_active: true
    },
    attributes: ['id']
  });

  if (validOutlets.length !== outlet_ids.length) {
    throw new BadRequestError('One or more outlet IDs are invalid for this business', 'INVALID_OUTLETS');
  }

  // 5. Execute atomic transaction
  const result = await sequelize.transaction(async (t) => {
    let member = existingMember;
    if (!member) {
      member = await BusinessUser.create({
        business_id: businessId,
        user_id: user.id,
        is_owner: false,
        is_active: true
      }, { transaction: t });
    } else {
      await member.update({ is_active: true }, { transaction: t });
    }

    // Assign Role
    await UserRole.destroy({ where: { business_user_id: member.id }, transaction: t });
    await UserRole.create({
      business_user_id: member.id,
      role_id: role.id
    }, { transaction: t });

    // Assign Outlets
    await UserOutlet.destroy({
      where: {
        user_id: user.id,
        outlet_id: {
          [Op.in]: validOutlets.map(o => o.id)
        }
      },
      transaction: t
    });

    const userOutletRecords = validOutlets.map(o => ({
      user_id: user.id,
      outlet_id: o.id
    }));
    await UserOutlet.bulkCreate(userOutletRecords, { transaction: t });

    await recordAuditLog({
      business_id: businessId,
      action: 'MEMBER_ADDED',
      entity_type: 'MEMBER',
      entity_id: user.id,
      metadata: { email: user.email, role_id: role.id, role_name: role.name },
      transaction: t
    });

    return {
      id: member.id,
      user_id: user.id,
      name: user.name,
      email: user.email,
      role: { id: role.id, name: role.name },
      outlets: validOutlets.map(o => o.id)
    };
  });

  return result;
};

/**
 * Update member role and/or assigned outlets
 * @param {number|string} businessId 
 * @param {number|string} memberUserId 
 * @param {Object} payload 
 */
const updateBusinessMember = async (businessId, memberUserId, payload) => {
  const { role_id, outlet_ids, is_active } = payload;

  const member = await BusinessUser.findOne({
    where: {
      business_id: businessId,
      user_id: memberUserId
    }
  });

  if (!member) {
    throw new NotFoundError('Member not found in this business', 'MEMBER_NOT_FOUND');
  }

  if (member.is_owner && is_active === false) {
    throw new ForbiddenError('Cannot deactivate the business owner', 'CANNOT_DEACTIVATE_OWNER');
  }

  await sequelize.transaction(async (t) => {
    // 1. Update active status if provided
    if (is_active !== undefined) {
      await member.update({ is_active }, { transaction: t });
    }

    // 2. Update Role if provided and not owner
    if (role_id && !member.is_owner) {
      const role = await Role.findOne({
        where: { id: role_id, business_id: businessId }
      });
      if (!role) {
        throw new BadRequestError('Invalid role ID for this business', 'INVALID_ROLE');
      }

      await UserRole.destroy({ where: { business_user_id: member.id }, transaction: t });
      await UserRole.create({
        business_user_id: member.id,
        role_id: role.id
      }, { transaction: t });
    }

    // 3. Update Outlets if provided and not owner
    if (outlet_ids && Array.isArray(outlet_ids) && !member.is_owner) {
      const validOutlets = await Outlet.findAll({
        where: {
          id: outlet_ids,
          business_id: businessId,
          is_active: true
        }
      });

      if (validOutlets.length !== outlet_ids.length) {
        throw new BadRequestError('One or more outlet IDs are invalid for this business', 'INVALID_OUTLETS');
      }

      // Remove current outlet associations for this business
      const currentBusinessOutlets = await Outlet.findAll({
        where: { business_id: businessId },
        attributes: ['id']
      });
      const currentOutletIds = currentBusinessOutlets.map(o => o.id);

      await UserOutlet.destroy({
        where: {
          user_id: memberUserId,
          outlet_id: { [Op.in]: currentOutletIds }
        },
        transaction: t
      });

      const userOutletRecords = validOutlets.map(o => ({
        user_id: memberUserId,
        outlet_id: o.id
      }));
      await UserOutlet.bulkCreate(userOutletRecords, { transaction: t });
    }

    await recordAuditLog({
      business_id: businessId,
      action: 'MEMBER_ROLE_UPDATED',
      entity_type: 'MEMBER',
      entity_id: memberUserId,
      metadata: { role_id, is_active },
      transaction: t
    });
  });

  return await getMemberById(businessId, memberUserId);
};

/**
 * Remove member from business
 * @param {number|string} businessId 
 * @param {number|string} memberUserId 
 */
const removeBusinessMember = async (businessId, memberUserId) => {
  const member = await BusinessUser.findOne({
    where: {
      business_id: businessId,
      user_id: memberUserId
    }
  });

  if (!member) {
    throw new NotFoundError('Member not found in this business', 'MEMBER_NOT_FOUND');
  }

  if (member.is_owner) {
    throw new ForbiddenError('Cannot remove the business owner', 'CANNOT_REMOVE_OWNER');
  }

  await member.update({ is_active: false });

  await recordAuditLog({
    business_id: businessId,
    action: 'MEMBER_REMOVED',
    entity_type: 'MEMBER',
    entity_id: memberUserId,
    metadata: { user_id: memberUserId }
  });

  return true;
};

/**
 * Assign user to one or more outlets in active business
 * @param {number|string} businessId 
 * @param {number|string} memberUserId 
 * @param {number[]} outletIds 
 */
const assignUserToOutlets = async (businessId, memberUserId, outletIds) => {
  const member = await BusinessUser.findOne({
    where: { business_id: businessId, user_id: memberUserId, is_active: true }
  });

  if (!member) {
    throw new NotFoundError('Member not found or inactive in this business', 'MEMBER_NOT_FOUND');
  }

  // Validate outlets
  const validOutlets = await Outlet.findAll({
    where: {
      id: outletIds,
      business_id: businessId,
      is_active: true
    }
  });

  if (validOutlets.length !== outletIds.length) {
    throw new BadRequestError('One or more outlet IDs are invalid for this business', 'INVALID_OUTLETS');
  }

  // Add associations (ignoring existing)
  for (const outlet of validOutlets) {
    const existing = await UserOutlet.findOne({
      where: { user_id: memberUserId, outlet_id: outlet.id }
    });
    if (!existing) {
      await UserOutlet.create({
        user_id: memberUserId,
        outlet_id: outlet.id
      });
    }
  }

  return await getUserAssignedOutlets(businessId, memberUserId);
};

/**
 * Remove user access from a specific outlet in active business
 * @param {number|string} businessId 
 * @param {number|string} memberUserId 
 * @param {number|string} outletId 
 */
const removeUserFromOutlet = async (businessId, memberUserId, outletId) => {
  const member = await BusinessUser.findOne({
    where: { business_id: businessId, user_id: memberUserId, is_active: true }
  });

  if (!member) {
    throw new NotFoundError('Member not found or inactive in this business', 'MEMBER_NOT_FOUND');
  }

  // Verify outlet belongs to this business
  const outlet = await Outlet.findOne({
    where: { id: outletId, business_id: businessId }
  });

  if (!outlet) {
    throw new NotFoundError('Outlet not found in this business', 'OUTLET_NOT_FOUND');
  }

  await UserOutlet.destroy({
    where: {
      user_id: memberUserId,
      outlet_id: outletId
    }
  });

  return true;
};

/**
 * Get assigned outlets for a specific user in this business
 * @param {number|string} businessId 
 * @param {number|string} memberUserId 
 */
const getUserAssignedOutlets = async (businessId, memberUserId) => {
  const member = await BusinessUser.findOne({
    where: { business_id: businessId, user_id: memberUserId }
  });

  if (!member) {
    throw new NotFoundError('Member not found in this business', 'MEMBER_NOT_FOUND');
  }

  const allowedOutletIds = await getUserAllowedOutlets(memberUserId, businessId, member.is_owner);
  const outlets = await Outlet.findAll({
    where: {
      id: allowedOutletIds,
      business_id: businessId
    },
    attributes: ['id', 'name', 'code', 'address', 'phone', 'is_active']
  });

  return outlets;
};

module.exports = {
  createBusiness,
  getUserBusinesses,
  selectBusinessContext,
  getBusinessDetail,
  updateBusinessProfile,
  getBusinessMembers,
  getMemberById,
  addBusinessMember,
  updateBusinessMember,
  removeBusinessMember,
  assignUserToOutlets,
  removeUserFromOutlet,
  getUserAssignedOutlets
};

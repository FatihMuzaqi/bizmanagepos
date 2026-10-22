const { 
  Role, 
  Permission, 
  RolePermission, 
  BusinessUser, 
  UserRole, 
  Outlet, 
  UserOutlet,
  sequelize 
} = require('../models');
const { NotFoundError, ForbiddenError, BadRequestError, ConflictError } = require('../utils/customErrors');
const { Op } = require('sequelize');
const { recordAuditLog } = require('./auditLogService');

/**
 * Initialize default template roles for a newly created business
 * @param {number|string} businessId 
 * @param {Object} [transaction] - Optional Sequelize transaction
 */
const initializeDefaultRolesForBusiness = async (businessId, transaction = null) => {
  const options = transaction ? { transaction } : {};

  // Fetch all master permissions
  const allPermissions = await Permission.findAll(options);

  // 1. Create Admin Role
  const adminRole = await Role.create({
    business_id: businessId,
    name: 'Admin',
    is_system_default: true,
    description: 'Administrator with access to catalog, inventory, sales, expenses, and reports'
  }, options);

  // Filter admin permissions (all except subscription management & business deletion)
  const adminExcludedGroups = ['subscription'];
  const adminPerms = allPermissions.filter(p => !adminExcludedGroups.includes(p.group) && p.name !== 'business.delete');
  
  if (adminPerms.length > 0) {
    const adminRolePermRecords = adminPerms.map(p => ({
      role_id: adminRole.id,
      permission_id: p.id
    }));
    await RolePermission.bulkCreate(adminRolePermRecords, options);
  }

  // 2. Create Cashier Role
  const cashierRole = await Role.create({
    business_id: businessId,
    name: 'Cashier',
    is_system_default: true,
    description: 'Front-line cashier with POS, catalog viewing, and sales creation permissions'
  }, options);

  const cashierPermNames = [
    'dashboard.view',
    'outlet.view',
    'product.view',
    'sales.view',
    'sales.create'
  ];
  const cashierPerms = allPermissions.filter(p => cashierPermNames.includes(p.name));

  if (cashierPerms.length > 0) {
    const cashierRolePermRecords = cashierPerms.map(p => ({
      role_id: cashierRole.id,
      permission_id: p.id
    }));
    await RolePermission.bulkCreate(cashierRolePermRecords, options);
  }

  return {
    adminRole,
    cashierRole
  };
};

/**
 * Get all available system master permissions
 */
const getAllPermissions = async () => {
  const permissions = await Permission.findAll({
    order: [['group', 'ASC'], ['name', 'ASC']]
  });

  // Group by category for easier UI consumption
  const grouped = {};
  for (const perm of permissions) {
    if (!grouped[perm.group]) {
      grouped[perm.group] = [];
    }
    grouped[perm.group].push({
      id: perm.id,
      name: perm.name,
      description: perm.description
    });
  }

  return {
    total: permissions.length,
    grouped,
    list: permissions
  };
};

/**
 * Get all roles for a business with assigned permissions and active user count
 * @param {number|string} businessId 
 */
const getRolesInBusiness = async (businessId) => {
  const roles = await Role.findAll({
    where: { business_id: businessId },
    include: [
      {
        model: Permission,
        as: 'permissions',
        through: { attributes: [] },
        attributes: ['id', 'name', 'group', 'description']
      }
    ],
    order: [['is_system_default', 'DESC'], ['name', 'ASC']]
  });

  // Attach user count per role
  const rolesWithCount = await Promise.all(
    roles.map(async (role) => {
      const userCount = await UserRole.count({
        where: { role_id: role.id }
      });
      return {
        id: role.id,
        name: role.name,
        is_system_default: role.is_system_default,
        description: role.description,
        user_count: userCount,
        permissions_count: role.permissions ? role.permissions.length : 0,
        permissions: role.permissions || []
      };
    })
  );

  return rolesWithCount;
};

/**
 * Get role details by ID in a business
 * @param {number|string} businessId 
 * @param {number|string} roleId 
 */
const getRoleById = async (businessId, roleId) => {
  const role = await Role.findOne({
    where: {
      id: roleId,
      business_id: businessId
    },
    include: [
      {
        model: Permission,
        as: 'permissions',
        through: { attributes: [] },
        attributes: ['id', 'name', 'group', 'description']
      }
    ]
  });

  if (!role) {
    throw new NotFoundError('Role not found in this business', 'ROLE_NOT_FOUND');
  }

  const userCount = await UserRole.count({
    where: { role_id: role.id }
  });

  return {
    id: role.id,
    name: role.name,
    is_system_default: role.is_system_default,
    description: role.description,
    user_count: userCount,
    permissions: role.permissions || []
  };
};

/**
 * Create a custom dynamic role for a business
 * @param {number|string} businessId 
 * @param {Object} payload 
 */
const createCustomRole = async (businessId, payload) => {
  const { name, description, permission_ids } = payload;

  // 1. Check if role name already exists in this business
  const existingRole = await Role.findOne({
    where: {
      business_id: businessId,
      name
    }
  });

  if (existingRole) {
    throw new ConflictError(`Role with name "${name}" already exists in this business`, 'ROLE_NAME_EXISTS');
  }

  // 2. Validate permission IDs
  const validPermissions = await Permission.findAll({
    where: { id: permission_ids }
  });

  if (validPermissions.length !== permission_ids.length) {
    throw new BadRequestError('One or more permission IDs are invalid', 'INVALID_PERMISSIONS');
  }

  // 3. Create role and associate permissions atomically
  const result = await sequelize.transaction(async (t) => {
    const role = await Role.create({
      business_id: businessId,
      name,
      description: description || null,
      is_system_default: false
    }, { transaction: t });

    const rolePermRecords = validPermissions.map(p => ({
      role_id: role.id,
      permission_id: p.id
    }));

    await RolePermission.bulkCreate(rolePermRecords, { transaction: t });

    await recordAuditLog({
      business_id: businessId,
      action: 'ROLE_CREATED',
      entity_type: 'ROLE',
      entity_id: role.id,
      metadata: { name: role.name, permissions_count: validPermissions.length },
      transaction: t
    });

    return {
      id: role.id,
      name: role.name,
      is_system_default: role.is_system_default,
      description: role.description,
      permissions: validPermissions.map(p => ({ id: p.id, name: p.name, group: p.group }))
    };
  });

  return result;
};

/**
 * Update an existing role in a business
 * @param {number|string} businessId 
 * @param {number|string} roleId 
 * @param {Object} payload 
 */
const updateRole = async (businessId, roleId, payload) => {
  const { name, description, permission_ids } = payload;

  const role = await Role.findOne({
    where: { id: roleId, business_id: businessId }
  });

  if (!role) {
    throw new NotFoundError('Role not found in this business', 'ROLE_NOT_FOUND');
  }

  // Check unique name if changing
  if (name && name !== role.name) {
    const existingRole = await Role.findOne({
      where: {
        business_id: businessId,
        name,
        id: { [Op.ne]: roleId }
      }
    });

    if (existingRole) {
      throw new ConflictError(`Role with name "${name}" already exists in this business`, 'ROLE_NAME_EXISTS');
    }
  }

  await sequelize.transaction(async (t) => {
    await role.update({
      name: name || role.name,
      description: description !== undefined ? description : role.description
    }, { transaction: t });

    if (permission_ids && Array.isArray(permission_ids)) {
      const validPermissions = await Permission.findAll({
        where: { id: permission_ids }
      });

      if (validPermissions.length !== permission_ids.length) {
        throw new BadRequestError('One or more permission IDs are invalid', 'INVALID_PERMISSIONS');
      }

      await RolePermission.destroy({
        where: { role_id: roleId },
        transaction: t
      });

      const rolePermRecords = validPermissions.map(p => ({
        role_id: roleId,
        permission_id: p.id
      }));

      await RolePermission.bulkCreate(rolePermRecords, { transaction: t });
    }

    await recordAuditLog({
      business_id: businessId,
      action: 'ROLE_UPDATED',
      entity_type: 'ROLE',
      entity_id: role.id,
      metadata: { name: role.name },
      transaction: t
    });
  });

  return await getRoleById(businessId, roleId);
};

/**
 * Delete a custom role from a business
 * @param {number|string} businessId 
 * @param {number|string} roleId 
 */
const deleteRole = async (businessId, roleId) => {
  const role = await Role.findOne({
    where: { id: roleId, business_id: businessId }
  });

  if (!role) {
    throw new NotFoundError('Role not found in this business', 'ROLE_NOT_FOUND');
  }

  // Prevent deleting system default template roles
  if (role.is_system_default) {
    throw new ForbiddenError('Cannot delete system default template roles (Admin, Cashier)', 'CANNOT_DELETE_DEFAULT_ROLE');
  }

  // Check if role is currently assigned to any users
  const assignedUsersCount = await UserRole.count({
    where: { role_id: roleId }
  });

  if (assignedUsersCount > 0) {
    throw new BadRequestError(
      `Cannot delete role because it is currently assigned to ${assignedUsersCount} active user(s). Please reassign users first.`,
      'ROLE_IN_USE'
    );
  }

  await Role.destroy({ where: { id: roleId } });

  await recordAuditLog({
    business_id: businessId,
    action: 'ROLE_DELETED',
    entity_type: 'ROLE',
    entity_id: roleId,
    metadata: { name: role.name }
  });

  return true;
};

/**
 * Get aggregated permissions for a user within a specific business
 * @param {number|string} userId 
 * @param {number|string} businessId 
 * @returns {Promise<{ isOwner: boolean, permissions: string[], roles: string[] }>}
 */
const getUserPermissionsInBusiness = async (userId, businessId) => {
  const businessUser = await BusinessUser.findOne({
    where: {
      user_id: userId,
      business_id: businessId,
      is_active: true
    },
    include: [
      {
        model: Role,
        as: 'roles',
        include: [
          {
            model: Permission,
            as: 'permissions'
          }
        ]
      }
    ]
  });

  if (!businessUser) {
    return {
      isOwner: false,
      permissions: [],
      roles: []
    };
  }

  // If user is owner of the business, they have unrestricted access
  if (businessUser.is_owner) {
    return {
      isOwner: true,
      permissions: ['*'],
      roles: ['Owner']
    };
  }

  // Aggregate unique permissions and role names
  const roleNames = [];
  const permissionSet = new Set();

  if (businessUser.roles && Array.isArray(businessUser.roles)) {
    for (const role of businessUser.roles) {
      roleNames.push(role.name);
      if (role.permissions && Array.isArray(role.permissions)) {
        for (const perm of role.permissions) {
          permissionSet.add(perm.name);
        }
      }
    }
  }

  return {
    isOwner: false,
    permissions: Array.from(permissionSet),
    roles: roleNames
  };
};

/**
 * Get allowed outlet IDs for a user within a specific business
 * @param {number|string} userId 
 * @param {number|string} businessId 
 * @param {boolean} isOwner 
 * @returns {Promise<number[]>}
 */
const getUserAllowedOutlets = async (userId, businessId, isOwner = false) => {
  // If owner, return all active outlet IDs for this business
  if (isOwner) {
    const outlets = await Outlet.findAll({
      where: {
        business_id: businessId,
        is_active: true
      },
      attributes: ['id']
    });
    return outlets.map(o => Number(o.id));
  }

  // Otherwise, return outlets explicitly assigned to the user
  const userOutlets = await UserOutlet.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Outlet,
        as: 'outlet',
        where: {
          business_id: businessId,
          is_active: true
        },
        attributes: ['id']
      }
    ]
  });

  return userOutlets.map(uo => Number(uo.outlet_id));
};

/**
 * Get current user's effective permissions and accessible outlets for the active business
 * @param {number|string} userId 
 * @param {number|string} businessId 
 */
const getUserEffectivePermissions = async (userId, businessId) => {
  const { isOwner, permissions, roles } = await getUserPermissionsInBusiness(userId, businessId);
  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);

  let finalPermissions = permissions;

  // If owner, expand '*' to full list of all system permission names for UI display convenience
  if (isOwner) {
    const allPerms = await Permission.findAll({ attributes: ['name'] });
    finalPermissions = allPerms.map(p => p.name);
  }

  const outlets = await Outlet.findAll({
    where: {
      id: allowedOutletIds,
      business_id: businessId,
      is_active: true
    },
    attributes: ['id', 'name', 'code', 'address', 'phone']
  });

  return {
    is_owner: isOwner,
    roles,
    permissions: finalPermissions,
    outlets
  };
};

module.exports = {
  initializeDefaultRolesForBusiness,
  getAllPermissions,
  getRolesInBusiness,
  getRoleById,
  createCustomRole,
  updateRole,
  deleteRole,
  getUserPermissionsInBusiness,
  getUserAllowedOutlets,
  getUserEffectivePermissions
};

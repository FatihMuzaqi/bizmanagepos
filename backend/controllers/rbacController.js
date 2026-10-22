const rbacService = require('../services/rbacService');
const { successResponse, createdResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get all available master permissions
 */
const getPermissions = asyncHandler(async (req, res) => {
  const permissions = await rbacService.getAllPermissions();
  return successResponse(res, 'Permissions retrieved successfully', permissions);
});

/**
 * Get all roles for active business
 */
const getRoles = asyncHandler(async (req, res) => {
  const roles = await rbacService.getRolesInBusiness(req.business.id);
  return successResponse(res, 'Roles retrieved successfully', roles);
});

/**
 * Get role details by ID
 */
const getRoleDetail = asyncHandler(async (req, res) => {
  const role = await rbacService.getRoleById(req.business.id, req.params.id);
  return successResponse(res, 'Role details retrieved successfully', role);
});

/**
 * Create a new custom role
 */
const createRole = asyncHandler(async (req, res) => {
  const role = await rbacService.createCustomRole(req.business.id, req.body);
  return createdResponse(res, 'Custom role created successfully', role);
});

/**
 * Update an existing role
 */
const updateRole = asyncHandler(async (req, res) => {
  const role = await rbacService.updateRole(req.business.id, req.params.id, req.body);
  return successResponse(res, 'Role updated successfully', role);
});

/**
 * Delete a custom role
 */
const deleteRole = asyncHandler(async (req, res) => {
  await rbacService.deleteRole(req.business.id, req.params.id);
  return successResponse(res, 'Role deleted successfully');
});

/**
 * Get current authenticated user's effective permissions for active business
 */
const getMyPermissions = asyncHandler(async (req, res) => {
  const effective = await rbacService.getUserEffectivePermissions(req.user.id, req.business.id);
  return successResponse(res, 'Effective permissions retrieved successfully', effective);
});

module.exports = {
  getPermissions,
  getRoles,
  getRoleDetail,
  createRole,
  updateRole,
  deleteRole,
  getMyPermissions
};

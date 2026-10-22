const businessService = require('../services/businessService');
const { successResponse, createdResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get active business profile details
 */
const getBusiness = asyncHandler(async (req, res) => {
  const business = await businessService.getBusinessDetail(req.business.id);
  return successResponse(res, 'Business details retrieved successfully', business);
});

/**
 * Update active business profile
 */
const updateBusiness = asyncHandler(async (req, res) => {
  const updated = await businessService.updateBusinessProfile(req.business.id, req.body);
  return successResponse(res, 'Business profile updated successfully', updated);
});

/**
 * Create a new business under current authenticated user
 */
const createBusiness = asyncHandler(async (req, res) => {
  const result = await businessService.createBusiness(req.user.id, req.body);
  return createdResponse(res, 'Business created successfully', result);
});

/**
 * Get all businesses associated with authenticated user
 */
const getMyBusinesses = asyncHandler(async (req, res) => {
  const businesses = await businessService.getUserBusinesses(req.user.id);
  return successResponse(res, 'Businesses retrieved successfully', businesses);
});

/**
 * Select/Switch business context and get authorization profile
 */
const selectBusiness = asyncHandler(async (req, res) => {
  const { business_id } = req.body;
  const context = await businessService.selectBusinessContext(req.user.id, business_id);
  return successResponse(res, 'Business context selected successfully', context);
});

/**
 * Get all members/staff in active business
 */
const getMembers = asyncHandler(async (req, res) => {
  const members = await businessService.getBusinessMembers(req.business.id);
  return successResponse(res, 'Business members retrieved successfully', members);
});

/**
 * Get member detail by user ID in active business
 */
const getMemberDetail = asyncHandler(async (req, res) => {
  const member = await businessService.getMemberById(req.business.id, req.params.userId);
  return successResponse(res, 'Member detail retrieved successfully', member);
});

/**
 * Add a new member/staff to active business
 */
const addMember = asyncHandler(async (req, res) => {
  const result = await businessService.addBusinessMember(req.business.id, req.body);
  return createdResponse(res, 'Member added to business successfully', result);
});

/**
 * Update an existing member's role and/or outlet assignments
 */
const updateMember = asyncHandler(async (req, res) => {
  const updated = await businessService.updateBusinessMember(req.business.id, req.params.userId, req.body);
  return successResponse(res, 'Member updated successfully', updated);
});

/**
 * Remove a member from active business
 */
const removeMember = asyncHandler(async (req, res) => {
  await businessService.removeBusinessMember(req.business.id, req.params.userId);
  return successResponse(res, 'Member removed from business successfully');
});

/**
 * Get assigned outlets for a specific user in active business
 */
const getUserOutlets = asyncHandler(async (req, res) => {
  const outlets = await businessService.getUserAssignedOutlets(req.business.id, req.params.userId);
  return successResponse(res, 'User outlets retrieved successfully', outlets);
});

/**
 * Assign user to outlets in active business
 */
const assignUserOutlets = asyncHandler(async (req, res) => {
  const { outlet_ids } = req.body;
  const outlets = await businessService.assignUserToOutlets(req.business.id, req.params.userId, outlet_ids);
  return successResponse(res, 'Outlets assigned to user successfully', outlets);
});

/**
 * Remove user access from a specific outlet in active business
 */
const removeUserOutlet = asyncHandler(async (req, res) => {
  await businessService.removeUserFromOutlet(req.business.id, req.params.userId, req.params.outletId);
  return successResponse(res, 'User removed from outlet successfully');
});

module.exports = {
  getBusiness,
  updateBusiness,
  createBusiness,
  getMyBusinesses,
  selectBusiness,
  getMembers,
  getMemberDetail,
  addMember,
  updateMember,
  removeMember,
  getUserOutlets,
  assignUserOutlets,
  removeUserOutlet
};

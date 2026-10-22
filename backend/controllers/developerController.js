const developerService = require('../services/developerService');
const { successResponse, createdResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Developer Login
 */
const login = asyncHandler(async (req, res) => {
  const result = await developerService.developerLogin(req.body);
  return successResponse(res, 'Login developer berhasil', result);
});

/**
 * Get Overall Dashboard Stats
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await developerService.getSystemStats();
  return successResponse(res, 'Statistik sistem berhasil diambil', stats);
});

/**
 * Get List of Registered Users
 */
const getUsers = asyncHandler(async (req, res) => {
  const data = await developerService.listUsers(req.query);
  return successResponse(res, 'Daftar user berhasil diambil', data);
});

/**
 * Toggle User Active Status
 */
const toggleUser = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await developerService.toggleUserStatus(req.params.id, isActive);
  return successResponse(res, `Status user berhasil diubah menjadi ${isActive ? 'Aktif' : 'Nonaktif'}`, user);
});

/**
 * Get List of Businesses
 */
const getBusinesses = asyncHandler(async (req, res) => {
  const data = await developerService.listBusinesses(req.query);
  return successResponse(res, 'Daftar bisnis berhasil diambil', data);
});

/**
 * Get List of Subscriptions
 */
const getSubscriptions = asyncHandler(async (req, res) => {
  const data = await developerService.listSubscriptions(req.query);
  return successResponse(res, 'Daftar langganan berhasil diambil', data);
});

/**
 * Update / Extend Subscription
 */
const updateSubscription = asyncHandler(async (req, res) => {
  const sub = await developerService.updateSubscription(req.params.id, req.body);
  return successResponse(res, 'Data langganan berhasil diperbarui', sub);
});

/**
 * Get List of SaaS Plans
 */
const getPlans = asyncHandler(async (req, res) => {
  const plans = await developerService.listPlans();
  return successResponse(res, 'Daftar paket SaaS berhasil diambil', plans);
});

/**
 * Create a new SaaS Plan
 */
const createPlan = asyncHandler(async (req, res) => {
  const plan = await developerService.createPlan(req.body);
  return createdResponse(res, 'Paket SaaS baru berhasil ditambahkan', plan);
});

/**
 * Update SaaS Plan (Price, Quotas, Name, etc.)
 */
const updatePlan = asyncHandler(async (req, res) => {
  const plan = await developerService.updatePlan(req.params.id, req.body);
  return successResponse(res, `Paket ${plan.name} berhasil diperbarui dengan harga Rp ${plan.price}`, plan);
});

/**
 * Delete / Deactivate SaaS Plan
 */
const deletePlan = asyncHandler(async (req, res) => {
  const result = await developerService.deletePlan(req.params.id);
  return successResponse(res, 'Paket berhasil dinonaktifkan', result);
});

/**
 * Get SaaS Invoices List
 */
const getInvoices = asyncHandler(async (req, res) => {
  const data = await developerService.listInvoices(req.query);
  return successResponse(res, 'Daftar invoice langganan berhasil diambil', data);
});

module.exports = {
  login,
  getStats,
  getUsers,
  toggleUser,
  getBusinesses,
  getSubscriptions,
  updateSubscription,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getInvoices
};


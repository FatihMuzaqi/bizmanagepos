const authService = require("../services/authService");
const { successResponse, createdResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Handle User Registration
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  return createdResponse(
    res,
    "User registered and business initialized successfully",
    result,
  );
});

/**
 * Handle User Login
 */
const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);
  return successResponse(res, "Login successful", result);
});

/**
 * Handle Token Refresh
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  const result = await authService.refreshAccessToken(refresh_token);
  return successResponse(res, "Token refreshed successfully", result);
});

/**
 * Handle User Logout
 */
const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.user.id);
  return successResponse(res, "Logged out successfully");
});

/**
 * Get Authenticated User Profile & Active Memberships
 */
const getMe = asyncHandler(async (req, res) => {
  const result = await authService.getUserProfile(req.user.id);
  return successResponse(res, "Profile retrieved successfully", result);
});

/**
 * Update Current User Profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const result = await authService.updateProfile(req.user.id, req.body);
  return successResponse(res, "Profile updated successfully", result);
});

/**
 * Change Current User Password
 */
const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  return successResponse(
    res,
    "Password changed successfully. Please login again with your new password.",
  );
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
};

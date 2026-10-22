'use strict';
const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');

// Only authorized users with business.view (or business owner) can view audit logs
router.get(
  '/',
  authenticate,
  tenantContext,
  requirePermission('business.view'),
  auditLogController.getAuditLogs
);

module.exports = router;

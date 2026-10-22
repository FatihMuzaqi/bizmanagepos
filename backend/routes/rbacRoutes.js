const express = require('express');
const router = express.Router();
const rbacController = require('../controllers/rbacController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');
const validate = require('../middleware/validate');
const { createRoleSchema, updateRoleSchema } = require('../validators/rbacValidator');

// Helper middleware bundle for protected RBAC routes
const rbacAuth = [authenticate, tenantContext];

// Dynamic Roles CRUD
router.get('/', rbacAuth, requirePermission('role.view'), rbacController.getRoles);
router.post('/', rbacAuth, requirePermission('role.manage'), validate(createRoleSchema), rbacController.createRole);
router.get('/:id', rbacAuth, requirePermission('role.view'), rbacController.getRoleDetail);
router.put('/:id', rbacAuth, requirePermission('role.manage'), validate(updateRoleSchema), rbacController.updateRole);
router.delete('/:id', rbacAuth, requirePermission('role.manage'), rbacController.deleteRole);

module.exports = router;

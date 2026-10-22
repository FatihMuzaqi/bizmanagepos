const express = require('express');
const router = express.Router();
const outletController = require('../controllers/outletController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');
const validate = require('../middleware/validate');
const { createOutletSchema, updateOutletSchema } = require('../validators/outletValidator');

const { enforceLimit } = require('../middleware/subscriptionMiddleware');

// All outlet routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

// Outlet CRUD Endpoints
router.get('/', requirePermission(['outlet.view', 'sales.create']), outletController.getOutlets);
router.post('/', requirePermission('outlet.create'), enforceLimit('max_outlets'), validate(createOutletSchema), outletController.createOutlet);
router.get('/:id', requirePermission('outlet.view'), outletController.getOutletDetail);
router.put('/:id', requirePermission('outlet.update'), validate(updateOutletSchema), outletController.updateOutlet);
router.delete('/:id', requirePermission('outlet.delete'), outletController.deleteOutlet);

module.exports = router;

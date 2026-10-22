const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const outletController = require('../controllers/outletController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');
const validate = require('../middleware/validate');
const { 
  createBusinessSchema, 
  updateBusinessSchema,
  selectBusinessSchema,
  addMemberSchema,
  updateMemberSchema,
  assignOutletsSchema
} = require('../validators/businessValidator');
const { createOutletSchema, updateOutletSchema } = require('../validators/outletValidator');

const { enforceLimit } = require('../middleware/subscriptionMiddleware');

// All business routes require user authentication
router.use(authenticate);

// 1. User-level Business Operations (No Tenant Context Needed)
router.post('/', validate(createBusinessSchema), businessController.createBusiness);
router.get('/my', businessController.getMyBusinesses);
router.post('/select', validate(selectBusinessSchema), businessController.selectBusiness);

// 2. Business Profile Operations (Requires X-Business-Id)
router.get('/', tenantContext, requirePermission('business.view'), businessController.getBusiness);
router.put('/', tenantContext, requirePermission('business.update'), validate(updateBusinessSchema), businessController.updateBusiness);
router.get('/profile', tenantContext, requirePermission('business.view'), businessController.getBusiness);
router.put('/profile', tenantContext, requirePermission('business.update'), validate(updateBusinessSchema), businessController.updateBusiness);

// 3. Outlets Scoped Endpoints under /business/outlets
router.get('/outlets', tenantContext, requirePermission(['outlet.view', 'sales.create']), outletController.getOutlets);
router.post('/outlets', tenantContext, requirePermission('outlet.create'), enforceLimit('max_outlets'), validate(createOutletSchema), outletController.createOutlet);
router.get('/outlets/:id', tenantContext, requirePermission('outlet.view'), outletController.getOutletDetail);
router.put('/outlets/:id', tenantContext, requirePermission('outlet.update'), validate(updateOutletSchema), outletController.updateOutlet);
router.delete('/outlets/:id', tenantContext, requirePermission('outlet.delete'), outletController.deleteOutlet);

// 4. Business Members & User-Outlet Operations (Requires X-Business-Id)
router.get('/members', tenantContext, requirePermission('employee.view'), businessController.getMembers);
router.post('/members', tenantContext, requirePermission('employee.create'), enforceLimit('max_users'), validate(addMemberSchema), businessController.addMember);
router.get('/members/:userId', tenantContext, requirePermission('employee.view'), businessController.getMemberDetail);
router.put('/members/:userId', tenantContext, requirePermission('employee.update'), validate(updateMemberSchema), businessController.updateMember);
router.delete('/members/:userId', tenantContext, requirePermission('employee.delete'), businessController.removeMember);

// 5. Dedicated User-Outlet Assignment Operations
router.get('/members/:userId/outlets', tenantContext, requirePermission('employee.view'), businessController.getUserOutlets);
router.post('/members/:userId/outlets', tenantContext, requirePermission('employee.update'), validate(assignOutletsSchema), businessController.assignUserOutlets);
router.delete('/members/:userId/outlets/:outletId', tenantContext, requirePermission('employee.update'), businessController.removeUserOutlet);

module.exports = router;

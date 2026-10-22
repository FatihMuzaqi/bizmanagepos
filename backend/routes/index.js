const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const businessRoutes = require('./businessRoutes');
const outletRoutes = require('./outletRoutes');
const rbacRoutes = require('./rbacRoutes');

// Phase 5: Product Management Routes
const categoryRoutes = require('./categoryRoutes');
const productRoutes = require('./productRoutes');
const modifierRoutes = require('./modifierRoutes');

// Phase 6: Inventory & Recipe Management Routes
const unitRoutes = require('./unitRoutes');
const ingredientRoutes = require('./ingredientRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const recipeRoutes = require('./recipeRoutes');

// Phase 7: POS & Transaction Routes
const transactionRoutes = require('./transactionRoutes');

// Phase 8: Expense & Report Routes
const expenseCategoryRoutes = require('./expenseCategoryRoutes');
const expenseRoutes = require('./expenseRoutes');
const reportRoutes = require('./reportRoutes');

// Phase 9: SaaS Subscription Routes
const subscriptionRoutes = require('./subscriptionRoutes');

// API Health Check
router.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'BizManage API is running smoothly',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Auth & Business Context Routes
router.use('/auth', authRoutes);
router.use('/business', businessRoutes);
router.use('/businesses', businessRoutes);
router.use('/outlets', outletRoutes);

// Phase 4: RBAC & Permissions Routes
const rbacController = require('../controllers/rbacController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');

router.get('/my-permissions', authenticate, tenantContext, rbacController.getMyPermissions);
router.get('/rbac/my-permissions', authenticate, tenantContext, rbacController.getMyPermissions);
router.get('/permissions', authenticate, tenantContext, requirePermission('role.view'), rbacController.getPermissions);
router.get('/rbac/permissions', authenticate, tenantContext, requirePermission('role.view'), rbacController.getPermissions);
router.use('/roles', rbacRoutes);
router.use('/rbac/roles', rbacRoutes);

// Catalog & Product Management Routes
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/modifiers', modifierRoutes);

// Inventory & Recipe Management Routes
router.use('/units', unitRoutes);
router.use('/ingredients', ingredientRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/recipes', recipeRoutes);

// POS & Transaction Routes
router.use('/transactions', transactionRoutes);

// Expense & Report Routes
router.use('/expense-categories', expenseCategoryRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reports', reportRoutes);

// SaaS Subscription Routes
const auditLogRoutes = require('./auditLogRoutes');
router.use('/subscription', subscriptionRoutes);
router.use('/subscriptions', subscriptionRoutes);

// Audit Log Routes
router.use('/audit-logs', auditLogRoutes);

// Developer / Superadmin Monitoring & Pricing Control Routes
const developerRoutes = require('./developerRoutes');
router.use('/developer', developerRoutes);

module.exports = router;

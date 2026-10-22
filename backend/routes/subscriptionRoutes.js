const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');

// 1. Public Plan Catalog
router.get('/plans', subscriptionController.getPlans);

// 2. Midtrans Webhook Notification Endpoint (Public, called by Midtrans servers)
router.post('/midtrans/notification', subscriptionController.handleWebhook);

// 3. Midtrans Redirection Landing Pages (Public, user redirected by Midtrans Snap)
router.get('/payment-finish', subscriptionController.paymentFinish);
router.get('/payment-unfinish', subscriptionController.paymentUnfinish);
router.get('/payment-error', subscriptionController.paymentError);

// 4. Business Scoped Subscription Endpoints (Owner & Manager)
router.use(authenticate);
router.use(tenantContext);

router.get('/', requirePermission('subscription.view'), subscriptionController.getCurrentSubscription);
router.post('/upgrade', requirePermission('subscription.manage'), subscriptionController.upgradePlan);
router.post('/checkout', requirePermission('subscription.manage'), subscriptionController.checkout);
router.get('/check-payment/:orderId', requirePermission('subscription.manage'), subscriptionController.verifyPayment);
router.get('/invoices', requirePermission('subscription.view'), subscriptionController.getInvoices);

module.exports = router;

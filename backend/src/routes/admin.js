const express = require('express');
const router = express.Router();
const c = require('../controllers/adminController');
const commerce = require('../controllers/adminCommerceController');
const paymentMethods = require('../controllers/paymentMethodsController');
const { authMiddleware } = require('../middleware/auth');
const { adminSecurityCheck, adminRateLimit, requireSuperAdmin, logAdminRequest } = require('../middleware/security');

// All admin routes: authenticated owner only, rate limited and audited.
router.use(authMiddleware, adminSecurityCheck, adminRateLimit, logAdminRequest);

router.get('/stats', c.getDashboardStats);
router.get('/growth', c.getGrowthStats);
router.get('/users', c.getUsers);
router.get('/users/:userId', c.getUser);
router.post('/users/:userId/billing-portal', c.createUserBillingPortal);
router.patch('/users/:userId/plan', c.updateUserPlan);
router.patch('/users/:userId/ban', c.toggleBan);
router.patch('/users/:userId/verify', c.verifyUserEmail);
router.patch('/users/:userId/role', requireSuperAdmin, c.updateRole);
router.patch('/users/:userId/password', requireSuperAdmin, c.resetUserPassword);
router.post('/users/:userId/impersonate', requireSuperAdmin, c.impersonateUser);
router.delete('/users/:userId', requireSuperAdmin, c.deleteUser);

router.get('/commerce/summary', commerce.getCommerceSummary);
router.get('/commerce/orders', commerce.getOrders);
router.get('/commerce/transactions', commerce.getTransactions);
router.get('/commerce/provider-events', commerce.getProviderEvents);
router.get('/commerce/stream', commerce.streamCommerce);

router.get('/payment-methods', requireSuperAdmin, paymentMethods.adminList);
router.post('/payment-methods', requireSuperAdmin, paymentMethods.create);
router.patch('/payment-methods/:id', requireSuperAdmin, paymentMethods.update);
router.delete('/payment-methods/:id', requireSuperAdmin, paymentMethods.remove);
router.get('/settings', requireSuperAdmin, c.getSiteSettings);
router.patch('/settings/:key', requireSuperAdmin, c.updateSiteSetting);
router.get('/security/blocked-ips', requireSuperAdmin, c.getBlockedIPs);
router.post('/security/block-ip', requireSuperAdmin, c.blockIP);
router.delete('/security/block-ip/:ip', requireSuperAdmin, c.unblockIP);
router.get('/security/events', c.getSecurityEvents);
router.get('/contacts', c.getContacts);
router.patch('/contacts/:id', c.updateContactStatus);
router.get('/audit-log', c.getAuditLog);
router.get('/billing', c.getBillingHistory);

module.exports = router;

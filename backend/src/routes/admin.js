const express = require('express');
const router = express.Router();
const c = require('../controllers/adminController');
const { authMiddleware } = require('../middleware/auth');
const { adminSecurityCheck, adminRateLimit, requireSuperAdmin, logAdminRequest } = require('../middleware/security');

// All admin routes: must pass auth + admin security + rate limit + request logging
router.use(authMiddleware, adminSecurityCheck, adminRateLimit, logAdminRequest);

// Dashboard & stats
router.get('/stats',           c.getDashboardStats);
router.get('/growth',          c.getGrowthStats);

// Users (admin + superadmin)
router.get('/users',           c.getUsers);
router.get('/users/:userId',   c.getUser);
router.post('/users/:userId/billing-portal', c.createUserBillingPortal);
router.patch('/users/:userId/plan',     c.updateUserPlan);
router.patch('/users/:userId/ban',      c.toggleBan);
router.patch('/users/:userId/verify',   c.verifyUserEmail);

// Users (superadmin only)
router.patch('/users/:userId/role',         requireSuperAdmin, c.updateRole);
router.patch('/users/:userId/password',     requireSuperAdmin, c.resetUserPassword);
router.post('/users/:userId/impersonate',   requireSuperAdmin, c.impersonateUser);
router.delete('/users/:userId',             requireSuperAdmin, c.deleteUser);

// Site settings (superadmin only)
router.get('/settings',              requireSuperAdmin, c.getSiteSettings);
router.patch('/settings/:key',       requireSuperAdmin, c.updateSiteSetting);

// IP management (superadmin only)
router.get('/security/blocked-ips',  requireSuperAdmin, c.getBlockedIPs);
router.post('/security/block-ip',    requireSuperAdmin, c.blockIP);
router.delete('/security/block-ip/:ip', requireSuperAdmin, c.unblockIP);

// Security events
router.get('/security/events',       c.getSecurityEvents);

// Contacts
router.get('/contacts',              c.getContacts);
router.patch('/contacts/:id',        c.updateContactStatus);

// Audit log & billing
router.get('/audit-log',             c.getAuditLog);
router.get('/billing',               c.getBillingHistory);

module.exports = router;

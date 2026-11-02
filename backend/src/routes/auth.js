const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const c = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const adminAuth = require('../controllers/adminAuthController');
const adminAuthLimiter = require('express-rate-limit')({ windowMs: 15*60*1000, max: 8, standardHeaders: true, legacyHeaders: false });
router.post('/admin/login', adminAuthLimiter, adminAuth.login);
router.post('/admin/verify-email', adminAuthLimiter, adminAuth.verifyEmail);
router.post('/admin/enroll-totp', adminAuthLimiter, adminAuth.enrollTotp);
router.post('/admin/verify-totp', adminAuthLimiter, adminAuth.verifyTotpLogin);

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().notEmpty(),
], c.register);

router.post('/verify-otp', [
  body('userId').notEmpty(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
], c.verifyOTP);

router.post('/resend-otp', [body('userId').notEmpty()], c.resendOTP);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], c.login);

router.post('/verify-login-otp', [
  body('userId').notEmpty(),
  body('otp').isLength({ min: 6, max: 6 }),
], c.verifyLoginOTP);

router.get('/me', authMiddleware, c.getMe);
router.post('/onboarding/complete', authMiddleware, c.completeOnboarding);
router.post('/signup-plan/clear', authMiddleware, c.clearSignupPlan);
router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], c.forgotPassword);
router.post('/reset-password', [body('userId').notEmpty(), body('otp').isLength({ min: 6, max: 6 }).isNumeric(), body('password').isLength({ min: 8 })], c.resetPassword);
router.get('/google', c.googleAuthUrl);
router.get('/google/callback', c.googleCallback);
router.post('/logout', authMiddleware, c.logout);

module.exports = router;

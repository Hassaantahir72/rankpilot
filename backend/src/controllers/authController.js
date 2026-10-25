const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const { queryOne, query } = require('../config/db');
const { sendWelcomeEmail, sendOTPEmail } = require('../services/emailService');
const { logSecurityEvent, trackFailedLogin, clearFailedAttempts } = require('../middleware/security');

const signToken = (user) => jwt.sign({ userId: user.id, tokenVersion: Number(user.token_version || 0) }, process.env.JWT_SECRET, { expiresIn: '7d' });
const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

// REGISTER
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password, name } = req.body;
  try {
    const existing = await queryOne('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (existing) return res.status(400).json({ error: 'Email already registered. Please sign in.' });

    // This is a coarse, privacy-preserving anti-abuse signal, not a unique hardware ID.
    // The client sends only basic platform/display/timezone attributes; only an HMAC is stored.
    const suppliedSignature = typeof req.body.deviceSignature === 'string' ? req.body.deviceSignature.slice(0, 1000) : '';
    if (!suppliedSignature) return res.status(400).json({ error: 'Please refresh the page and try signup again.' });
    const deviceHash = crypto.createHmac('sha256', process.env.JWT_SECRET)
      .update('rankpilot-trial-device-v1:' + suppliedSignature).digest('hex');
    const ipValue = String(req.ip || req.socket?.remoteAddress || 'unknown').slice(0, 100);
    const ipHash = crypto.createHmac('sha256', process.env.JWT_SECRET)
      .update('rankpilot-trial-ip-v1:' + ipValue).digest('hex');
    const requestedPlan = String(req.body.selectedPlan || '').toLowerCase();
    const paidPlanIntent = ['starter','growth','pro','agency'].includes(requestedPlan);
    const claim = await queryOne(
      'INSERT INTO trial_device_claims (device_hash,ip_hash,created_at) VALUES ($1,$2,NOW()) ON CONFLICT (device_hash) DO NOTHING RETURNING device_hash',
      [deviceHash, ipHash]
    );
    if (!claim && !paidPlanIntent) {
      return res.status(409).json({ error: 'A free trial has already been claimed from this device. Please sign in or continue with a paid plan.' });
    }

    const userPlan = !paidPlanIntent && Boolean(claim) ? 'trial' : 'free';
    try {
      const passwordHash = await bcrypt.hash(password, 12);
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      const trialEnds = userPlan === 'trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null;
      const userId = uuidv4();
      const user = await queryOne(
        `INSERT INTO users (id,email,name,password_hash,plan,subscription_status,trial_ends_at,email_verified,otp_code,otp_expires_at,otp_attempts,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8,$9,0,NOW(),NOW()) RETURNING id,email,name,plan,subscription_status,trial_ends_at,role`,
        [userId, email.toLowerCase(), name, passwordHash, userPlan, userPlan, trialEnds, otp, otpExpires]
      );
      if (claim) await query('UPDATE trial_device_claims SET user_id=$1 WHERE device_hash=$2', [user.id, deviceHash]);
      await sendOTPEmail(user.email, user.name, otp, 'verify');
      res.status(201).json({ message: 'Account created! Check your email for the 6-digit verification code.', userId: user.id, requiresVerification: true });
    } catch (err) {
      // Keep the device claim if account creation succeeded; only release an unassigned claim on a failed registration.
      await query('DELETE FROM trial_device_claims WHERE device_hash=$1 AND user_id IS NULL', [deviceHash]).catch(() => {});
      throw err;
    }
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

// VERIFY OTP (email verify)
const verifyOTP = async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) return res.status(400).json({ error: 'User ID and OTP required.' });
  try {
    const user = await queryOne('SELECT * FROM users WHERE id=$1', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.otp_attempts >= 5) return res.status(429).json({ error: 'Too many attempts. Request a new code.' });
    if (!user.otp_code || new Date(user.otp_expires_at) < new Date()) return res.status(400).json({ error: 'Code expired. Request a new one.' });
    if (user.otp_code !== otp.trim()) {
      await query('UPDATE users SET otp_attempts=otp_attempts+1 WHERE id=$1', [userId]);
      return res.status(400).json({ error: 'Invalid code. ' + (4 - (user.otp_attempts||0)) + ' attempts remaining.' });
    }
    await query('UPDATE users SET email_verified=true,otp_code=NULL,otp_expires_at=NULL,otp_attempts=0,updated_at=NOW() WHERE id=$1', [userId]);
    await sendWelcomeEmail(user.email, user.name);
    const token = signToken(user);
    res.json({ message: 'Email verified! Welcome to RankPilot.', token, user: { id:user.id, email:user.email, name:user.name, plan:user.plan, subscription_status:user.subscription_status, trial_ends_at:user.trial_ends_at, email_verified:true, role:user.role||'user' } });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
};

// RESEND OTP
const resendOTP = async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await queryOne('SELECT email,name FROM users WHERE id=$1', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await query('UPDATE users SET otp_code=$1,otp_expires_at=$2,otp_attempts=0 WHERE id=$3', [otp, expires, userId]);
    await sendOTPEmail(user.email, user.name, otp, 'verify');
    res.json({ message: 'New code sent to your email.' });
  } catch (err) { res.status(500).json({ error: 'Could not resend code.' }); }
};

// LOGIN
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  try {
    const user = await queryOne('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
    if (user.is_banned) return res.status(403).json({ error: 'Account suspended: ' + (user.ban_reason || 'Contact support.') });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const count = trackFailedLogin(ip);
      await logSecurityEvent('failed_login', ip, user.id, { email: email.toLowerCase(), attempts: count });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.email_verified) {
      const otp = generateOTP();
      await query('UPDATE users SET otp_code=$1,otp_expires_at=$2,otp_attempts=0 WHERE id=$3', [otp, new Date(Date.now()+10*60*1000), user.id]);
      await sendOTPEmail(user.email, user.name, otp, 'verify');
      return res.json({ requiresVerification: true, userId: user.id, message: 'Please verify your email. A new code has been sent.' });
    }

    const otp = generateOTP();
    clearFailedAttempts(ip);
    await logSecurityEvent('login_success', ip, user.id, { email: user.email });
    await query('UPDATE users SET otp_code=$1,otp_expires_at=$2,otp_attempts=0,last_login=NOW() WHERE id=$3', [otp, new Date(Date.now()+10*60*1000), user.id]);
    await sendOTPEmail(user.email, user.name, otp, 'login');
    res.json({ requires2FA: true, userId: user.id, message: 'Enter the 6-digit code sent to your email.' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
};

// VERIFY LOGIN OTP (2FA)
const verifyLoginOTP = async (req, res) => {
  const { userId, otp } = req.body;
  try {
    const user = await queryOne('SELECT * FROM users WHERE id=$1', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.is_banned) return res.status(403).json({ error: 'Account suspended.' });
    if (user.otp_attempts >= 5) return res.status(429).json({ error: 'Too many attempts. Please log in again.' });
    if (!user.otp_code || new Date(user.otp_expires_at) < new Date()) return res.status(400).json({ error: 'Code expired. Please log in again.' });
    if (user.otp_code !== otp.trim()) {
      await query('UPDATE users SET otp_attempts=otp_attempts+1 WHERE id=$1', [userId]);
      return res.status(400).json({ error: 'Invalid code.' });
    }
    await query('UPDATE users SET otp_code=NULL,otp_expires_at=NULL,otp_attempts=0 WHERE id=$1', [userId]);
    const token = signToken(user);
    res.json({ token, user: { id:user.id, email:user.email, name:user.name, plan:user.plan, subscription_status:user.subscription_status, trial_ends_at:user.trial_ends_at, email_verified:user.email_verified, role:user.role||'user' } });
  } catch (err) {
    console.error('Verify login OTP error:', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
};

// GET ME
const getMe = async (req, res) => {
  const limits = await queryOne('SELECT * FROM plan_limits WHERE plan=$1', [req.user.plan]);
  res.json({ user: req.user, limits });
};

// Mark onboarding complete only for the authenticated account.
const completeOnboarding = async (req, res) => {
  try {
    await query('UPDATE users SET onboarding_completed=TRUE,updated_at=NOW() WHERE id=$1', [req.user.id]);
    return res.json({ success: true, onboarding_completed: true });
  } catch (err) {
    console.error('Onboarding completion failed:', err.message);
    return res.status(500).json({ error: 'Could not save onboarding status.' });
  }
};

// FORGOT PASSWORD
const forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Enter a valid email address.' });
  const { email } = req.body;
  try {
    const user = await queryOne('SELECT id,name FROM users WHERE email=$1', [email.toLowerCase()]);
    if (!user) return res.json({ message: 'If that email exists, you will receive a reset code.' });
    const otp = generateOTP();
    await query('UPDATE users SET otp_code=$1,otp_expires_at=$2,otp_attempts=0 WHERE id=$3', [otp, new Date(Date.now()+15*60*1000), user.id]);
    await sendOTPEmail(email, user.name, otp, 'reset');
    res.json({ message: 'Reset code sent to your email.', userId: user.id });
  } catch (err) { res.status(500).json({ error: 'Failed to process request.' }); }
};

// RESET PASSWORD
const resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Enter a valid reset code and a password of at least 8 characters.' });
  const { userId, otp, password } = req.body;
  try {
    const user = await queryOne('SELECT * FROM users WHERE id=$1', [userId]);
    if (!user) return res.status(400).json({ error: 'Invalid or expired code.' });
    if ((user.otp_attempts || 0) >= 5) return res.status(429).json({ error: 'Too many attempts. Request a new reset code.' });
    if (!user.otp_code || !user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired code.' });
    }
    if (user.otp_code !== String(otp || '').trim()) {
      await query('UPDATE users SET otp_attempts=otp_attempts+1 WHERE id=$1', [userId]);
      return res.status(400).json({ error: 'Invalid or expired code.' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await query('UPDATE users SET password_hash=$1,otp_code=NULL,otp_expires_at=NULL,otp_attempts=0,token_version=token_version+1,updated_at=NOW() WHERE id=$2', [passwordHash, userId]);
    res.json({ message: 'Password reset successfully. Please sign in.' });
  } catch (err) { res.status(500).json({ error: 'Reset failed.' }); }
};

// GOOGLE OAUTH
const googleAuthUrl = (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'email profile https://www.googleapis.com/auth/webmasters.readonly',
    access_type: 'offline',
    prompt: 'consent',
  });
  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString());
};

const googleCallback = async (req, res) => {
  const { code } = req.query;
  try {
    const axios = require('axios');
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    });
    const userRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + tokenRes.data.access_token },
    });
    const { email, name, sub: googleId } = userRes.data;

    let user = await queryOne('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    if (!user) {
      const trialEnds = new Date(Date.now() + 14*24*60*60*1000);
      user = await queryOne(
        `INSERT INTO users (id,email,name,google_id,plan,subscription_status,trial_ends_at,email_verified,created_at)
         VALUES ($1,$2,$3,$4,'trial','trial',$5,true,NOW()) RETURNING *`,
        [uuidv4(), email.toLowerCase(), name, googleId, trialEnds]
      );
      await sendWelcomeEmail(email, name);
    }

    // Save OAuth tokens for Search Console access
    if (tokenRes.data.access_token) {
      await query(
        `INSERT INTO oauth_tokens (id,user_id,provider,access_token,refresh_token,updated_at)
         VALUES ($1,$2,'google',$3,$4,NOW())
         ON CONFLICT (user_id,provider) DO UPDATE SET access_token=$3,refresh_token=COALESCE($4,oauth_tokens.refresh_token),updated_at=NOW()`,
        [uuidv4(), user.id, tokenRes.data.access_token, tokenRes.data.refresh_token || null]
      );
    }

    const token = signToken(user);
    res.redirect(process.env.FRONTEND_URL + '/auth/callback#token=' + encodeURIComponent(token));
  } catch (err) {
    console.error('Google OAuth error:', err.message);
    res.redirect(process.env.FRONTEND_URL + '/auth/login?error=google_failed');
  }
};

const logout = async (req, res) => {
  try {
    await query('UPDATE users SET token_version=token_version+1,updated_at=NOW() WHERE id=$1', [req.user.id]);
    res.json({ message: 'Logged out.' });
  } catch (err) {
    console.error('Logout error:', err.message);
    res.status(500).json({ error: 'Could not end the session. Please try again.' });
  }
};

module.exports = { register, verifyOTP, resendOTP, login, verifyLoginOTP, getMe, completeOnboarding, forgotPassword, resetPassword, googleAuthUrl, googleCallback, logout };

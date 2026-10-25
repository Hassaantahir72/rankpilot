const rateLimit = require('express-rate-limit');
const { query, queryOne } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ── ADMIN-SPECIFIC RATE LIMITER ──────────────────────────────────
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many admin requests. Slow down.' },
  skipSuccessfulRequests: false,
});

// ── BRUTE FORCE TRACKER (in-memory + DB) ─────────────────────────
const failedAttempts = new Map();

const trackFailedLogin = (ip) => {
  const key = `fail:${ip}`;
  const now = Date.now();
  const entry = failedAttempts.get(key) || { count: 0, firstAt: now };
  entry.count += 1;
  entry.lastAt = now;
  failedAttempts.set(key, entry);
  // Clean old entries every hour
  if (Math.random() < 0.01) {
    for (const [k, v] of failedAttempts.entries()) {
      if (now - v.lastAt > 3600000) failedAttempts.delete(k);
    }
  }
  return entry.count;
};

const isBlocked = (ip) => {
  const entry = failedAttempts.get(`fail:${ip}`);
  if (!entry) return false;
  if (Date.now() - entry.lastAt > 15 * 60 * 1000) { failedAttempts.delete(`fail:${ip}`); return false; }
  return entry.count >= 10;
};

const clearFailedAttempts = (ip) => failedAttempts.delete(`fail:${ip}`);

// ── ADMIN SECURITY MIDDLEWARE ─────────────────────────────────────
const adminSecurityCheck = async (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

  // Block known bad IPs
  if (isBlocked(ip)) {
    await logSecurityEvent('ip_blocked', ip, null, { reason: 'Too many failed attempts' });
    return res.status(429).json({ error: 'Access temporarily blocked. Contact support.' });
  }

  // Must be authenticated
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

  // Must be admin or superadmin
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    await logSecurityEvent('unauthorized_admin_access', ip, req.user.id, { path: req.path, method: req.method });
    return res.status(403).json({ error: 'Admin access required.' });
  }

  // Check if user is banned
  if (req.user.is_banned) {
    await logSecurityEvent('banned_admin_attempt', ip, req.user.id, {});
    return res.status(403).json({ error: 'Account suspended.' });
  }

  // Check session is still valid (re-verify from DB every request)
  const freshUser = await queryOne('SELECT id,role,is_banned,email_verified FROM users WHERE id=$1', [req.user.id]);
  if (!freshUser || !['admin','superadmin'].includes(freshUser.role) || freshUser.is_banned) {
    await logSecurityEvent('stale_admin_session', ip, req.user.id, {});
    return res.status(403).json({ error: 'Session invalid. Please sign in again.' });
  }

  // Attach real-time role (in case it changed)
  req.user.role = freshUser.role;
  req.adminIp = ip;
  next();
};

// ── SUPERADMIN ONLY ───────────────────────────────────────────────
const requireSuperAdmin = async (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    await logSecurityEvent('superadmin_access_denied', req.adminIp || req.ip, req.user.id, { path: req.path });
    return res.status(403).json({ error: 'Superadmin access required.' });
  }
  next();
};

// ── LOG SECURITY EVENTS ───────────────────────────────────────────
const logSecurityEvent = async (event, ip, userId, details) => {
  try {
    await query(
      'INSERT INTO security_events (id,event,ip_address,user_id,details,created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
      [uuidv4(), event, ip, userId || null, JSON.stringify(details)]
    );
  } catch {}
};

// ── REQUEST LOGGER (all admin actions) ───────────────────────────
const logAdminRequest = async (req, res, next) => {
  res.on('finish', () => {
    if (req.user && ['admin','superadmin'].includes(req.user.role)) {
      logSecurityEvent('admin_request', req.adminIp || req.ip, req.user.id, {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined,
      });
    }
  });
  next();
};

const sanitizeBody = (body) => {
  if (!body) return {};
  const safe = { ...body };
  ['password', 'password_hash', 'otp_code', 'stripe_secret_key'].forEach(k => { if (safe[k]) safe[k] = '***'; });
  return safe;
};

// ── CONTENT SECURITY HEADERS ─────────────────────────────────────
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};

module.exports = { adminRateLimit, adminSecurityCheck, requireSuperAdmin, logSecurityEvent, logAdminRequest, trackFailedLogin, isBlocked, clearFailedAttempts, securityHeaders };

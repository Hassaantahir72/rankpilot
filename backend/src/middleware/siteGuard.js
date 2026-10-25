const { queryOne } = require('../config/db');

// Maintenance mode — blocks all non-admin requests
const maintenanceGuard = async (req, res, next) => {
  // Always allow admin routes and health check
  if (req.path.startsWith('/api/admin') || req.path === '/api/health' || req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/verify')) {
    return next();
  }
  try {
    const setting = await queryOne("SELECT value FROM site_settings WHERE key='maintenance_mode'");
    if (setting?.value === 'true') {
      return res.status(503).json({ error: 'RankPilot is currently under maintenance. Please check back shortly.', code: 'MAINTENANCE_MODE' });
    }
  } catch {}
  next();
};

// Signup guard — can disable new registrations
const signupGuard = async (req, res, next) => {
  if (req.path !== '/api/auth/register') return next();
  try {
    const setting = await queryOne("SELECT value FROM site_settings WHERE key='allow_signups'");
    if (setting?.value === 'false') {
      return res.status(403).json({ error: 'New registrations are currently disabled.', code: 'SIGNUPS_DISABLED' });
    }
  } catch {}
  next();
};

// IP block guard — check every request
const ipBlockGuard = async (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  // Skip internal/localhost
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168')) return next();
  try {
    const blocked = await queryOne('SELECT id,reason,expires_at FROM blocked_ips WHERE ip_address=$1', [ip]);
    if (blocked) {
      if (blocked.expires_at && new Date(blocked.expires_at) < new Date()) {
        // Expired — remove it
        const { query } = require('../config/db');
        await query('DELETE FROM blocked_ips WHERE ip_address=$1', [ip]);
        return next();
      }
      return res.status(403).json({ error: 'Your IP address has been blocked. Contact support if this is a mistake.', code: 'IP_BLOCKED' });
    }
  } catch {}
  next();
};

// Site notice injector — adds a notice header if set
const siteNoticeHeader = async (req, res, next) => {
  try {
    const setting = await queryOne("SELECT value FROM site_settings WHERE key='site_notice'");
    if (setting?.value) res.setHeader('X-Site-Notice', setting.value.slice(0, 200));
  } catch {}
  next();
};

module.exports = { maintenanceGuard, signupGuard, ipBlockGuard, siteNoticeHeader };

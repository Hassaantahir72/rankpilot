const { queryOne, queryAll, query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { logSecurityEvent } = require('../middleware/security');
const bcrypt = require('bcryptjs');

// ── LOG ADMIN ACTION ──────────────────────────────────────────────
const logAction = async (adminId, action, targetId, details) => {
  await query(
    'INSERT INTO admin_audit_log (id,admin_id,action,target_user_id,details,created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
    [uuidv4(), adminId, action, targetId || null, JSON.stringify(details || {})]
  );
};

// ── DASHBOARD STATS ───────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const [users, websites, audits, revenue, contacts, newToday, newWeek, activeSubs, trialUsers, planCounts, topEvents] = await Promise.all([
      queryOne('SELECT COUNT(*) FROM users'),
      queryOne('SELECT COUNT(*) FROM websites'),
      queryOne('SELECT COUNT(*) FROM audits'),
      queryOne("SELECT COALESCE(SUM(amount),0) as total FROM billing_history WHERE status='paid'"),
      queryOne("SELECT COUNT(*) FROM contact_messages WHERE status='unread'"),
      queryOne("SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '1 day'"),
      queryOne("SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'"),
      queryOne("SELECT COUNT(*) FROM users WHERE subscription_status='active'"),
      queryOne("SELECT COUNT(*) FROM users WHERE subscription_status='trial' AND trial_ends_at > NOW()"),
      queryAll('SELECT plan, COUNT(*) as count FROM users GROUP BY plan ORDER BY count DESC'),
      queryAll("SELECT event, COUNT(*) as count FROM security_events WHERE created_at > NOW()-INTERVAL '24 hours' GROUP BY event ORDER BY count DESC LIMIT 10"),
    ]);
    res.json({
      totalUsers: parseInt(users.count),
      totalWebsites: parseInt(websites.count),
      totalAudits: parseInt(audits.count),
      totalRevenue: parseFloat(revenue.total).toFixed(2),
      unreadContacts: parseInt(contacts.count),
      newUsersToday: parseInt(newToday.count),
      newUsersThisWeek: parseInt(newWeek.count),
      activeSubs: parseInt(activeSubs.count),
      trialUsers: parseInt(trialUsers.count),
      planCounts: planCounts.reduce((a, r) => ({ ...a, [r.plan]: parseInt(r.count) }), {}),
      recentSecurityEvents: topEvents,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to load stats.' });
  }
};

// ── USERS ─────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  const { search, plan, status, role, banned } = req.query;
  const page = Number.parseInt(req.query.page, 10) || 1;
  const requestedLimit = Number.parseInt(req.query.limit, 10) || 25;
  const limit = Math.min(100, Math.max(1, requestedLimit));
  if (req.query.page !== undefined && (!Number.isInteger(Number(req.query.page)) || page < 1)) {
    return res.status(400).json({ error: 'Invalid page.' });
  }
  if (req.query.limit !== undefined && (!Number.isInteger(Number(req.query.limit)) || Number(req.query.limit) < 1)) {
    return res.status(400).json({ error: 'Invalid limit.' });
  }
  const validPlans = ['free','trial','starter','growth','pro','agency'];
  const validStatuses = ['free','trial','active','past_due','cancelled','paused'];
  const validRoles = ['user','admin','superadmin'];
  if (plan && !validPlans.includes(plan)) return res.status(400).json({ error: 'Invalid plan filter.' });
  if (status && !validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status filter.' });
  if (role && !validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role filter.' });
  if (banned !== undefined && !['true','false'].includes(banned)) return res.status(400).json({ error: 'Invalid banned filter.' });
  if (search !== undefined && (typeof search !== 'string' || search.length > 100)) {
    return res.status(400).json({ error: 'Search must be 100 characters or fewer.' });
  }

  const offset = (page - 1) * limit;
  const conds = ['1=1'], params = [];
  if (search && search.trim()) {
    params.push('%' + search.trim() + '%');
    conds.push('(u.email ILIKE $' + params.length + ' OR u.name ILIKE $' + params.length + ')');
  }
  if (plan) { params.push(plan); conds.push('u.plan=$' + params.length); }
  if (status) { params.push(status); conds.push('u.subscription_status=$' + params.length); }
  if (role) { params.push(role); conds.push('u.role=$' + params.length); }
  if (banned === 'true') conds.push('u.is_banned=true');
  if (banned === 'false') conds.push('u.is_banned=false');

  params.push(limit, offset);
  try {
    const users = await queryAll(
      'SELECT u.id,u.email,u.name,u.plan,u.subscription_status,u.email_verified,u.role,u.is_banned,u.ban_reason,' +
      ' u.created_at,u.last_login,u.trial_ends_at,(u.stripe_customer_id IS NOT NULL) AS has_stripe_customer,' +
      ' (u.stripe_subscription_id IS NOT NULL) AS has_stripe_subscription,' +
      ' (u.provider_subscription_id IS NOT NULL) AS has_provider_subscription,' +
      ' (SELECT COUNT(*) FROM websites WHERE user_id=u.id) as website_count,' +
      ' (SELECT COUNT(*) FROM audits WHERE user_id=u.id) as audit_count' +
      ' FROM users u WHERE ' + conds.join(' AND ') + ' ORDER BY u.created_at DESC LIMIT $' +
      (params.length - 1) + ' OFFSET $' + params.length,
      params
    );
    const total = await queryOne('SELECT COUNT(*) FROM users u WHERE ' + conds.join(' AND '), params.slice(0, -2));
    res.json({ users, total: parseInt(total.count, 10), page, limit });
  } catch (err) {
    console.error('Get users error:', err.message);
    res.status(500).json({ error: 'Failed to load users.' });
  }
};

const getUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const [user, websites, usage, billing, auditLog, secEvents] = await Promise.all([
      queryOne(`SELECT id,email,name,plan,subscription_status,trial_ends_at,email_verified,role,is_banned,ban_reason,
                       created_at,updated_at,last_login,
                       (stripe_customer_id IS NOT NULL) AS has_stripe_customer,
                       (stripe_subscription_id IS NOT NULL) AS has_stripe_subscription,
                       (SELECT COUNT(*) FROM websites WHERE user_id=users.id) AS website_count,
                       (SELECT COUNT(*) FROM audits WHERE user_id=users.id) AS audit_count
                FROM users WHERE id=$1`, [userId]),
      queryAll('SELECT id,name,url,last_score,status,created_at FROM websites WHERE user_id=$1 ORDER BY created_at DESC', [userId]),
      queryAll('SELECT action,count,month FROM usage_tracking WHERE user_id=$1 ORDER BY month DESC', [userId]),
      queryAll('SELECT * FROM billing_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10', [userId]),
      queryAll('SELECT * FROM admin_audit_log WHERE target_user_id=$1 ORDER BY created_at DESC LIMIT 20', [userId]),
      queryAll('SELECT event,ip_address,created_at FROM security_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20', [userId]),
    ]);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user, websites, usage, billing, auditLog, secEvents });
  } catch (err) { res.status(500).json({ error: 'Failed to load user.' }); }
};

const createUserBillingPortal = async (req, res) => {
  const { userId } = req.params;
  try {
    const target = await queryOne('SELECT id,email,stripe_customer_id,stripe_subscription_id,payment_provider,provider_subscription_id FROM users WHERE id=$1', [userId]);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    const returnUrl = new URL('/dashboard/admin', process.env.FRONTEND_URL || 'http://localhost:3000');

    if (target.payment_provider === 'lemon_squeezy' && target.provider_subscription_id) {
      if (!process.env.LEMONSQUEEZY_API_KEY) return res.status(503).json({ error: 'Lemon Squeezy billing is not configured.' });
      const response = await fetch('https://api.lemonsqueezy.com/v1/subscriptions/' + encodeURIComponent(target.provider_subscription_id), {
        headers: { 'Authorization': 'Bearer ' + process.env.LEMONSQUEEZY_API_KEY, 'Accept': 'application/vnd.api+json' },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(502).json({ error: 'Could not retrieve this user’s provider billing portal.' });
      const portalUrl = payload?.data?.attributes?.urls?.customer_portal || payload?.data?.attributes?.urls?.update_payment_method;
      let parsed;
      try { parsed = new URL(portalUrl); } catch {}
      if (!parsed || parsed.protocol !== 'https:' || !(parsed.hostname === 'lemonsqueezy.com' || parsed.hostname.endsWith('.lemonsqueezy.com'))) {
        return res.status(502).json({ error: 'Payment provider returned an invalid billing portal URL.' });
      }
      await logAction(req.user.id, 'open_user_billing_portal', userId, { provider: 'lemon_squeezy', adminEmail: req.user.email });
      return res.json({ url: parsed.toString(), provider: 'lemon_squeezy' });
    }

    if (!process.env.STRIPE_SECRET_KEY || !process.env.FRONTEND_URL) return res.status(503).json({ error: 'No supported billing portal is configured for this user.' });
    if (process.env.NODE_ENV === 'production' && returnUrl.protocol !== 'https:') return res.status(503).json({ error: 'The configured frontend URL must use HTTPS.' });
    if (!target.stripe_customer_id) return res.status(400).json({ error: 'This user has no supported billing customer yet.' });
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.billingPortal.sessions.create({
      customer: target.stripe_customer_id,
      return_url: returnUrl.origin + returnUrl.pathname,
    });
    if (!session.url || !session.url.startsWith('https://billing.stripe.com/')) throw new Error('Stripe did not return a valid billing portal URL.');
    await logAction(req.user.id, 'open_user_billing_portal', userId, { provider: 'stripe_legacy', adminEmail: req.user.email });
    return res.json({ url: session.url, provider: 'stripe_legacy' });
  } catch (err) {
    console.error('Admin billing portal error:', err.message);
    return res.status(500).json({ error: 'Could not open this user’s billing portal.' });
  }
};

const updateUserPlan = async (req, res) => {
  const { userId } = req.params;
  const { plan, subscription_status } = req.body;
  const trialDays = req.body?.trial_days === undefined ? 14 : Number(req.body.trial_days);
  const validPlans = ['free','trial','starter','growth','pro','agency'];
  const validStatuses = ['free','trial','active'];
  const status = subscription_status || (plan === 'free' ? 'free' : plan === 'trial' ? 'trial' : 'active');
  if (!validPlans.includes(plan)) return res.status(400).json({ error: 'Invalid plan.' });
  if (plan === 'trial' && (!Number.isInteger(trialDays) || trialDays < 1 || trialDays > 90)) {
    return res.status(400).json({ error: 'Trial duration must be between 1 and 90 days.' });
  }
  if (!validStatuses.includes(status) || (plan === 'free' && status !== 'free') || (plan === 'trial' && status !== 'trial') || (['starter','growth','pro','agency'].includes(plan) && status !== 'active')) {
    return res.status(400).json({ error: 'Plan and subscription status do not match.' });
  }
  try {
    const target = await queryOne('SELECT id,stripe_subscription_id,provider_subscription_id FROM users WHERE id=$1', [userId]);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (target.stripe_subscription_id || target.provider_subscription_id) {
      return res.status(409).json({
        error: 'This user has a provider-managed subscription. Use that provider’s billing management so the plan change is applied to the actual subscription.',
        code: 'PROVIDER_SUBSCRIPTION_MANAGED',
      });
    }
    const user = await queryOne(
      `UPDATE users
       SET plan=$1,subscription_status=$2,
           trial_ends_at=CASE WHEN $1='trial' THEN NOW() + ($3 * INTERVAL '1 day') ELSE NULL END,
           updated_at=NOW()
       WHERE id=$4
       RETURNING id,email,name,plan,subscription_status,trial_ends_at`,
      [plan, status, plan === 'trial' ? trialDays : 0, userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found.' });
    await logAction(req.user.id, 'update_plan', userId, {
      plan, subscription_status: status,
      trial_days: plan === 'trial' ? trialDays : null,
      trial_ends_at: user.trial_ends_at,
      adminEmail: req.user.email,
    });
    res.json({ message: plan === 'trial' ? `Trial set for ${trialDays} days.` : `Plan updated to ${plan}.`, user });
  } catch (err) {
    console.error('Admin plan update failed:', err.message);
    res.status(500).json({ error: 'Failed to update plan.' });
  }
};

const toggleBan = async (req, res) => {
  const { userId } = req.params;
  const { ban, reason } = req.body || {};
  if (typeof ban !== 'boolean') return res.status(400).json({ error: 'Ban must be true or false.' });
  if (ban && (typeof reason !== 'string' || !reason.trim())) return res.status(400).json({ error: 'Ban reason is required.' });
  if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500)) return res.status(400).json({ error: 'Ban reason must be 500 characters or fewer.' });

  // Prevent banning other admins unless superadmin
  const target = await queryOne('SELECT role FROM users WHERE id=$1', [userId]);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (['admin','superadmin'].includes(target.role) && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only superadmin can ban other admins.' });
  }
  // Prevent self-ban
  if (userId === req.user.id) return res.status(400).json({ error: 'You cannot ban yourself.' });

  await query('UPDATE users SET is_banned=$1,ban_reason=$2,updated_at=NOW() WHERE id=$3', [ban, ban ? reason : null, userId]);
  await logAction(req.user.id, ban ? 'ban_user' : 'unban_user', userId, { reason, adminEmail: req.user.email });
  await logSecurityEvent(ban ? 'user_banned' : 'user_unbanned', req.adminIp, req.user.id, { targetUserId: userId, reason });
  res.json({ message: ban ? 'User banned.' : 'User unbanned.' });
};

const updateRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  // RankPilot has one owner, not a multi-admin organization. Never grant the database admin role to another account.
  if (role !== 'user') return res.status(400).json({ error: 'Only the owner account can hold administrative access.' });
  if (userId === req.user.id) return res.status(400).json({ error: 'You cannot change your own role.' });
  const target = await queryOne('SELECT id,role FROM users WHERE id=$1', [userId]);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  await query('UPDATE users SET role=$1,updated_at=NOW(),token_version=token_version+1 WHERE id=$2', [role, userId]);
  await logAction(req.user.id, 'update_role', userId, { role, adminEmail: req.user.email });
  res.json({ message: `Role updated to ${role}.` });
};

const resetUserPassword = async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body || {};
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
  const hash = await bcrypt.hash(newPassword, 12);
  const updated = await query('UPDATE users SET password_hash=$1,otp_code=NULL,otp_expires_at=NULL,otp_attempts=0,token_version=token_version+1,updated_at=NOW() WHERE id=$2', [hash, userId]);
  if (updated.rowCount !== 1) return res.status(404).json({ error: 'User not found.' });
  await logAction(req.user.id, 'reset_user_password', userId, { adminEmail: req.user.email });
  await logSecurityEvent('admin_password_reset', req.adminIp, req.user.id, { targetUserId: userId });
  res.json({ message: 'Password reset successfully.' });
};

const verifyUserEmail = async (req, res) => {
  const { userId } = req.params;
  const updated = await query('UPDATE users SET email_verified=true,otp_code=NULL,otp_expires_at=NULL,otp_attempts=0,updated_at=NOW() WHERE id=$1', [userId]);
  if (updated.rowCount !== 1) return res.status(404).json({ error: 'User not found.' });
  await logAction(req.user.id, 'force_verify_email', userId, { adminEmail: req.user.email });
  res.json({ message: 'Email verified.' });
};

const impersonateUser = async (req, res) => {
  // Only superadmin can impersonate
  const { userId } = req.params;
  const jwt = require('jsonwebtoken');
  const target = await queryOne('SELECT id,email,name,plan,subscription_status,trial_ends_at,email_verified,role,token_version FROM users WHERE id=$1', [userId]);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (['admin','superadmin'].includes(target.role)) return res.status(403).json({ error: 'Cannot impersonate admin accounts.' });
  const token = jwt.sign({ userId: target.id, impersonatedBy: req.user.id, tokenVersion: Number(target.token_version || 0) }, process.env.JWT_SECRET, { expiresIn: '1h' });
  await logAction(req.user.id, 'impersonate_user', userId, { adminEmail: req.user.email });
  await logSecurityEvent('user_impersonated', req.adminIp, req.user.id, { targetUserId: userId });
  res.json({ token, user: target, message: 'Impersonation token created (1 hour). Use carefully.' });
};

const deleteUser = async (req, res) => {
  const { userId } = req.params;
  if (userId === req.user.id) return res.status(400).json({ error: 'You cannot delete yourself.' });
  const target = await queryOne('SELECT email,role,stripe_subscription_id,provider_subscription_id FROM users WHERE id=$1', [userId]);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (['admin','superadmin'].includes(target.role)) return res.status(403).json({ error: 'Cannot delete admin accounts.' });
  if (target.stripe_subscription_id || target.provider_subscription_id) return res.status(409).json({ error: 'Cancel or resolve this user’s payment-provider subscription before deleting the account.', code: 'ACTIVE_PROVIDER_SUBSCRIPTION' });
  await query('DELETE FROM users WHERE id=$1', [userId]);
  await logAction(req.user.id, 'delete_user', userId, { deletedEmail: target.email, adminEmail: req.user.email });
  await logSecurityEvent('user_deleted', req.adminIp, req.user.id, { targetEmail: target.email });
  res.json({ message: `User ${target.email} deleted permanently.` });
};

// ── SITE SETTINGS ─────────────────────────────────────────────────
const getSiteSettings = async (req, res) => {
  const settings = await queryAll('SELECT * FROM site_settings ORDER BY key');
  res.json({ settings });
};

const updateSiteSetting = async (req, res) => {
  const { key } = req.params;
  const { value } = req.body || {};
  if (typeof value !== 'string' || value.length > 10000) return res.status(400).json({ error: 'Setting value must be text of 10,000 characters or fewer.' });
  const existing = await queryOne('SELECT key FROM site_settings WHERE key=$1', [key]);
  if (!existing) return res.status(404).json({ error: 'Setting not found.' });
  await query('UPDATE site_settings SET value=$1,updated_by=$2,updated_at=NOW() WHERE key=$3', [value, req.user.id, key]);
  await logAction(req.user.id, 'update_site_setting', null, { key, value: '[redacted]', adminEmail: req.user.email });
  res.json({ message: `Setting "${key}" updated.` });
};

// ── IP MANAGEMENT ─────────────────────────────────────────────────
const getBlockedIPs = async (req, res) => {
  const ips = await queryAll('SELECT b.*,u.email as blocked_by_email FROM blocked_ips b LEFT JOIN users u ON b.blocked_by=u.id ORDER BY b.created_at DESC');
  res.json({ blockedIPs: ips });
};

const blockIP = async (req, res) => {
  const { ipAddress, reason, expiresIn } = req.body || {};
  const net = require('net');
  if (typeof ipAddress !== 'string' || !net.isIP(ipAddress.trim())) return res.status(400).json({ error: 'A valid IPv4 or IPv6 address is required.' });
  if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500)) return res.status(400).json({ error: 'Reason must be 500 characters or fewer.' });
  if (expiresIn !== undefined && (!Number.isInteger(Number(expiresIn)) || Number(expiresIn) < 1 || Number(expiresIn) > 8760)) return res.status(400).json({ error: 'Expiry must be between 1 and 8760 hours.' });
  const normalizedIP = ipAddress.trim();
  const expiresAt = expiresIn ? new Date(Date.now() + Number(expiresIn) * 3600000) : null;
  await query(
    'INSERT INTO blocked_ips (id,ip_address,reason,blocked_by,created_at,expires_at) VALUES ($1,$2,$3,$4,NOW(),$5) ON CONFLICT (ip_address) DO UPDATE SET reason=$3,expires_at=$5',
    [uuidv4(), normalizedIP, reason || 'Manually blocked', req.user.id, expiresAt]
  );
  await logAction(req.user.id, 'block_ip', null, { ipAddress, reason });
  await logSecurityEvent('ip_blocked_admin', req.adminIp, req.user.id, { blockedIP: ipAddress, reason });
  res.json({ message: `IP ${ipAddress} blocked.` });
};

const unblockIP = async (req, res) => {
  const { ip } = req.params;
  await query('DELETE FROM blocked_ips WHERE ip_address=$1', [ip]);
  await logAction(req.user.id, 'unblock_ip', null, { ipAddress: ip });
  res.json({ message: `IP ${ip} unblocked.` });
};

// ── SECURITY EVENTS ───────────────────────────────────────────────
const getSecurityEvents = async (req, res) => {
  const { event, ip, userId } = req.query;
  const requestedLimit = req.query.limit === undefined ? 100 : Number(req.query.limit);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 500) return res.status(400).json({ error: 'Limit must be an integer between 1 and 500.' });
  const conds = ['1=1'], params = [];
  if (event)  { params.push(event); conds.push(`s.event=$${params.length}`); }
  if (ip)     { params.push(ip);    conds.push(`s.ip_address=$${params.length}`); }
  if (userId) { params.push(userId);conds.push(`s.user_id=$${params.length}`); }
  params.push(requestedLimit);
  const events = await queryAll(
    `SELECT s.*,u.email,u.name FROM security_events s LEFT JOIN users u ON s.user_id=u.id WHERE ${conds.join(' AND ')} ORDER BY s.created_at DESC LIMIT $${params.length}`,
    params
  );
  res.json({ events });
};

// ── CONTACT MESSAGES ──────────────────────────────────────────────
const getContacts = async (req, res) => {
  const { status } = req.query;
  const params = status ? [status] : [];
  const where = status ? 'WHERE status=$1' : '';
  const msgs = await queryAll(`SELECT * FROM contact_messages ${where} ORDER BY created_at DESC`, params);
  res.json({ messages: msgs });
};

const updateContactStatus = async (req, res) => {
  await query('UPDATE contact_messages SET status=$1 WHERE id=$2', [req.body.status, req.params.id]);
  res.json({ message: 'Updated.' });
};

// ── AUDIT LOG ─────────────────────────────────────────────────────
const getAuditLog = async (req, res) => {
  const { limit = 200 } = req.query;
  const log = await queryAll(
    `SELECT a.*,u.name as admin_name,u.email as admin_email,t.name as target_name,t.email as target_email
     FROM admin_audit_log a LEFT JOIN users u ON a.admin_id=u.id LEFT JOIN users t ON a.target_user_id=t.id
     ORDER BY a.created_at DESC LIMIT $1`,
    [parseInt(limit)]
  );
  res.json({ log });
};

// ── BILLING HISTORY ───────────────────────────────────────────────
const getBillingHistory = async (req, res) => {
  const billing = await queryAll(
    'SELECT b.*,u.name as user_name,u.email as user_email FROM billing_history b LEFT JOIN users u ON b.user_id=u.id ORDER BY b.created_at DESC LIMIT 200'
  );
  res.json({ billing });
};

// ── SITE STATS (for dashboard charts) ────────────────────────────
const getGrowthStats = async (req, res) => {
  const [daily, planRev, topUsers] = await Promise.all([
    queryAll("SELECT DATE(created_at) as date, COUNT(*) as users FROM users WHERE created_at > NOW()-INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date"),
    queryAll("SELECT plan, COUNT(*) as users, SUM(CASE WHEN subscription_status='active' THEN 1 ELSE 0 END) as paying FROM users GROUP BY plan"),
    queryAll("SELECT u.id,u.name,u.email,u.plan,w.count as websites FROM users u LEFT JOIN (SELECT user_id,COUNT(*) as count FROM websites GROUP BY user_id) w ON u.id=w.user_id WHERE u.subscription_status='active' ORDER BY u.created_at DESC LIMIT 10"),
  ]);
  res.json({ dailySignups: daily, planBreakdown: planRev, recentPaying: topUsers });
};

module.exports = {
  getDashboardStats, getUsers, getUser, createUserBillingPortal, updateUserPlan, toggleBan, updateRole,
  resetUserPassword, verifyUserEmail, impersonateUser, deleteUser,
  getSiteSettings, updateSiteSetting,
  getBlockedIPs, blockIP, unblockIP,
  getSecurityEvents, getContacts, updateContactStatus,
  getAuditLog, getBillingHistory, getGrowthStats,
};

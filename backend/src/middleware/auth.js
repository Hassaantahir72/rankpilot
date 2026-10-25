const jwt = require('jsonwebtoken');
const { queryOne, query } = require('../config/db');

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided.' });
    const token = header.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await queryOne(
      'SELECT id,email,name,plan,subscription_status,trial_ends_at,email_verified,onboarding_completed,role,is_banned,token_version,payment_provider,provider_subscription_id,provider_subscription_ends_at FROM users WHERE id=$1',
      [decoded.userId]
    );
    if (!user) return res.status(401).json({ error: 'User not found.' });
    if (Number(decoded.tokenVersion || 0) !== Number(user.token_version || 0)) return res.status(401).json({ error: 'Session revoked. Please sign in again.' });
    if (user.is_banned) return res.status(403).json({ error: 'Account suspended.' });

    // A cancellation scheduled for the end of a paid billing period must not revoke access early.
    if (user.payment_provider === 'lemon_squeezy' && user.provider_subscription_ends_at && new Date(user.provider_subscription_ends_at) <= new Date()) {
      await query(
        "UPDATE users SET plan='free',subscription_status='cancelled',provider_subscription_id=NULL,provider_variant_id=NULL,provider_subscription_ends_at=NULL,updated_at=NOW() WHERE id=$1 AND payment_provider='lemon_squeezy' AND provider_subscription_ends_at <= NOW()",
        [user.id]
      );
      user.plan = 'free';
      user.subscription_status = 'cancelled';
      user.provider_subscription_id = null;
      user.provider_subscription_ends_at = null;
    }

    // Trial entitlements must expire even if the user's stored plan has not yet been changed.
    if (user.plan === 'trial' && user.trial_ends_at && new Date(user.trial_ends_at) <= new Date()) {
      await query("UPDATE users SET plan='free',subscription_status='free',updated_at=NOW() WHERE id=$1 AND plan='trial' AND trial_ends_at <= NOW()", [user.id]);
      user.plan = 'free';
      user.subscription_status = 'free';
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired.' });
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

const requireVerified = (req, res, next) => {
  if (!req.user.email_verified) return res.status(403).json({ error: 'Please verify your email first.', code: 'EMAIL_NOT_VERIFIED' });
  next();
};

const requireSubscription = (req, res, next) => {
  const { plan, subscription_status, trial_ends_at } = req.user;
  const trialValid = plan === 'trial' && trial_ends_at && new Date(trial_ends_at) > new Date();
  if (!trialValid && subscription_status !== 'active' && plan !== 'free') {
    return res.status(403).json({ error: 'Active subscription required.', code: 'SUBSCRIPTION_REQUIRED' });
  }
  next();
};

const PLAN_ORDER = ['free', 'trial', 'starter', 'growth', 'pro', 'agency'];

const requireMinimumPlan = (minimumPlan) => (req, res, next) => {
  const current = PLAN_ORDER.indexOf(req.user?.plan);
  const minimum = PLAN_ORDER.indexOf(minimumPlan);
  if (minimum < 0 || current < 0 || current < minimum) {
    return res.status(403).json({ error: `This feature requires the ${minimumPlan} plan or higher.`, code: 'UPGRADE_REQUIRED', requiredPlan: minimumPlan });
  }
  next();
};

const requirePlanFeature = (feature) => async (req, res, next) => {
  try {
    const limits = await queryOne('SELECT * FROM plan_limits WHERE plan=$1', [req.user.plan]);
    if (!limits || !limits[feature]) {
      return res.status(403).json({ error: `Your ${req.user.plan} plan does not include this feature.`, code: 'UPGRADE_REQUIRED', feature });
    }
    req.planLimits = limits;
    next();
  } catch (err) { next(err); }
};

const checkUsageLimit = (action) => async (req, res, next) => {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const limits = await queryOne('SELECT * FROM plan_limits WHERE plan=$1', [req.user.plan]);
    const usage  = await queryOne('SELECT count FROM usage_tracking WHERE user_id=$1 AND action=$2 AND month=$3', [req.user.id, action, month]);

    const limitMap = {
      audit:   limits?.max_audits_per_month,
      content: limits?.max_content_per_month,
      social:  limits?.max_social_posts_per_month,
    };
    const limit = limitMap[action];
    const used  = usage?.count || 0;

    if (limit !== undefined && limit !== 9999 && used >= limit) {
      return res.status(403).json({ error: `You have used all ${limit} ${action}s this month. Upgrade to get more.`, code: 'USAGE_LIMIT_REACHED', used, limit });
    }
    req.planLimits = limits;
    req.currentUsage = used;
    next();
  } catch (err) { next(err); }
};

const incrementUsage = async (userId, action) => {
  const month = new Date().toISOString().slice(0, 7);
  await query(
    `INSERT INTO usage_tracking (user_id, action, month, count, updated_at)
     VALUES ($1,$2,$3,1,NOW())
     ON CONFLICT (user_id,action,month) DO UPDATE SET count=usage_tracking.count+1, updated_at=NOW()`,
    [userId, action, month]
  );
};

const requireAdmin = (req, res, next) => {
  if (!['admin','superadmin'].includes(req.user.role)) return res.status(403).json({ error: 'Admin access required.' });
  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin access required.' });
  next();
};

module.exports = { authMiddleware, requireVerified, requireSubscription, requireMinimumPlan, requirePlanFeature, checkUsageLimit, incrementUsage, requireAdmin, requireSuperAdmin };

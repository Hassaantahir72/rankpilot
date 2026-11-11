require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

// Init DB connection pool
const { queryOne } = require('./config/db');

// Middleware
const { securityHeaders } = require('./middleware/security');
const { maintenanceGuard, signupGuard, ipBlockGuard, siteNoticeHeader } = require('./middleware/siteGuard');

// Routes
const authRoutes      = require('./routes/auth');
const seoRoutes       = require('./routes/seo');
const adsRoutes       = require('./routes/ads');
const reportsRoutes   = require('./routes/reports');
const dashboardRoutes = require('./routes/dashboard');
const webhookRoutes   = require('./routes/webhooks');
const adminRoutes     = require('./routes/admin');
const paymentMethodsController = require('./controllers/paymentMethodsController');
const paymentMethodsRoutes = require('./routes/paymentMethods');
const providerWebhookRoutes = require('./routes/providerWebhooks');
const contactRoutes   = require('./routes/contact');
const supportRoutes   = require('./routes/support');
const featuresRoutes  = require('./routes/features');

// GSC route — only load if file exists
let gscRoutes = null;
try { gscRoutes = require('./routes/gsc'); } catch(e) { console.log('GSC routes not found — skipping'); }

// Jobs
const { runWeeklyRankCheck } = require('./jobs/rankTracker');
const { runWeeklyReports, runMonthlyContentRefresh } = require('./jobs/contentRefresher');
const { startAuditWorker } = require('./jobs/auditWorker');

const app = express();
const PORT = process.env.PORT || 5000;
// Render terminates TLS and forwards through one trusted proxy hop.
app.set('trust proxy', 1);

// Render terminates TLS and forwards requests through its proxy.
// Trust exactly one proxy hop there so express-rate-limit can identify client IPs.
if (process.env.RENDER) app.set('trust proxy', 1);

// ── SECURITY HEADERS ──────────────────────────────────────────────
app.use(securityHeaders);
app.use(helmet({ crossOriginEmbedderPolicy: false }));

// ── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ── Stripe webhook (raw body before JSON parser) ──────────────────
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use('/api/webhooks/lemon-squeezy', express.raw({ type: 'application/json' }));

// ── BODY PARSER ───────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── HEALTH CHECK ─────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await queryOne('SELECT 1 AS ok');
    return res.json({ status:'ok', version:'2.0.0', db:'connected', service:'RankPilot API', timestamp:new Date().toISOString() });
  } catch (err) {
    console.error('Health check database probe failed:', err.message);
    return res.status(503).json({ status:'degraded', version:'2.0.0', db:'disconnected', service:'RankPilot API', timestamp:new Date().toISOString() });
  }
});


// ── RATE LIMITS ───────────────────────────────────────────────────
app.use('/api/', rateLimit({ windowMs:15*60*1000, max:150, message:{ error:'Too many requests.' }, skipSuccessfulRequests:true }));
app.use('/api/auth/', rateLimit({ windowMs:15*60*1000, max:20, message:{ error:'Too many auth requests.' } }));

// ── SITE GUARDS ───────────────────────────────────────────────────
app.use(ipBlockGuard);
app.use(maintenanceGuard);
app.use(signupGuard);
app.use(siteNoticeHeader);

// ── API ROUTES ────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/seo',       seoRoutes);
app.use('/api/ads',       adsRoutes);
app.use('/api/reports',   reportsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks',  webhookRoutes);
app.use('/api/webhooks', providerWebhookRoutes);
app.get('/api/payment-methods', paymentMethodsController.publicList);
app.use('/api/payment-methods', paymentMethodsRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/contact',   contactRoutes);
app.use('/api/support',   supportRoutes);
app.use('/api/features',  featuresRoutes);
if (gscRoutes) app.use('/api/gsc', gscRoutes);

// ── PUBLIC WEBSITE CONTENT (safe, owner-managed fields only) ───────
app.get('/api/site-content', async (_req, res) => {
  try {
    const { query, queryAll } = require('./config/db');
    // Seed only presentation copy. Existing owner edits are never overwritten.
    const defaults = {"homepage_stats_eyebrow":"By the numbers","homepage_stats_heading":"Results that speak for themselves","homepage_how_eyebrow":"How it works","homepage_how_description":"No SEO knowledge needed. Start with one website and upgrade as your needs grow.","homepage_seo_eyebrow":"SEO Autopilot","homepage_seo_heading":"Everything an SEO expert does — automated","homepage_seo_description":"SEO agencies charge $2,000–$8,000/month. RankPilot does the same work automatically in minutes — full crawl, keyword research, content writing, rank tracking.","homepage_marketing_eyebrow":"Marketing Autopilot","homepage_marketing_heading":"AI helps prepare campaigns like a marketing assistant","homepage_marketing_description":"Use AI tools to prepare Google and Meta campaign drafts and ad copy. Review campaign settings and approve changes before publishing.","homepage_features_eyebrow":"Full feature set","homepage_features_heading":"Everything you need to dominate your market","homepage_features_description":"One platform replaces your SEO agency, ad manager, content writer, and analytics team.","homepage_testimonials_eyebrow":"Customer stories","homepage_testimonials_heading":"Don't take our word for it","homepage_testimonials_description":"1,200+ businesses replaced their agency with RankPilot.","homepage_pricing_eyebrow":"Pricing","homepage_pricing_heading":"Way cheaper than any agency","homepage_pricing_description":"Choose a plan that fits your workload. Start with a free trial and cancel any time.","homepage_faq_eyebrow":"FAQ","homepage_faq_heading":"Questions, answered","homepage_final_eyebrow":"Start today","homepage_final_heading":"Replace your agency. Keep the results.","homepage_final_description":"Start your 14-day Free Trial with no card required. It includes 1 website, 5 SEO audits/month, 10 AI content generations/month, 5 social posts/month, competitor analysis, and weekly rank tracking."};
    const keys = Object.keys(defaults);
    await query(
      'INSERT INTO site_settings (key,value,description) SELECT k,v,\'Homepage content\' FROM unnest($1::text[],$2::text[]) AS seed(k,v) ON CONFLICT (key) DO NOTHING',
      [keys, keys.map(key => defaults[key])]
    );
    const allowed = ['homepage_hero_title','homepage_hero_subtitle','homepage_cta_label','homepage_notice', ...keys];
    const rows = await queryAll('SELECT key,value FROM site_settings WHERE key = ANY($1::text[])', [allowed]);
    const content = Object.fromEntries(rows.map(row => [row.key, row.value || '']));
    res.set('Cache-Control', 'no-store');
    return res.json({ content });
  } catch (err) {
    console.error('Public site content lookup failed:', err.message);
    return res.status(500).json({ error:'Could not load website content.' });
  }
});

// ── PLAN LIMITS (public) ─────────────────────────────────────────
app.get('/api/plans', async (req, res) => {
  try {
    const { queryAll } = require('./config/db');
    const plans = await queryAll('SELECT * FROM plan_limits ORDER BY max_websites');
    res.json({ plans });
  } catch(err) { res.status(500).json({ error:'Failed to load plans.' }); }
});

// ── 404 ──────────────────────────────────────────────────────────
app.use('*', (req, res) => res.status(404).json({ error:'Endpoint not found.' }));

// ── GLOBAL ERROR HANDLER ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global request error:', err.message);
  if (res.headersSent) return next(err);
  res.status(err.status && err.status < 500 ? err.status : 500).json({ error: err.status && err.status < 500 ? err.message : 'Internal server error' });
});

// ── CRON JOBS ─────────────────────────────────────────────────────
cron.schedule('0 6 * * 1', () => { console.log('Running rank check...'); runWeeklyRankCheck(); });
cron.schedule('0 8 * * 1', () => { console.log('Sending reports...');    runWeeklyReports(); });
cron.schedule('0 7 1 * *', () => { console.log('Content refresh...');    runMonthlyContentRefresh(); });

app.listen(PORT, () => {
  startAuditWorker();
  console.log('\n🚀 RankPilot API v2.0 running on :' + PORT);
  console.log('🗄  Database: PostgreSQL');
  console.log('🔒 Security: IP blocking, Rate limiting, admin guards active');
  console.log('🌐 Frontend: ' + (process.env.FRONTEND_URL || 'http://localhost:3000') + '\n');
});

module.exports = app;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

// Init DB connection pool
require('./config/db');

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

// ── BODY PARSER ───────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api/admin',     adminRoutes);
app.use('/api/contact',   contactRoutes);
app.use('/api/support',   supportRoutes);
app.use('/api/features',  featuresRoutes);
if (gscRoutes) app.use('/api/gsc', gscRoutes);

// ── HEALTH CHECK ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status:'ok', version:'2.0.0', db:'PostgreSQL', service:'RankPilot API', timestamp:new Date().toISOString() });
});

// ── PLAN LIMITS (public) ──────────────────────────────────────────
app.get('/api/plans', async (req, res) => {
  try {
    const { queryAll } = require('./config/db');
    const plans = await queryAll('SELECT * FROM plan_limits ORDER BY max_websites');
    res.json({ plans });
  } catch(err) { res.status(500).json({ error:'Failed to load plans.' }); }
});

// ── 404 ───────────────────────────────────────────────────────────
app.use('*', (req, res) => res.status(404).json({ error:'Endpoint not found.' }));

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────
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
  console.log('🔒 Security: IP blocking, Rate limiting, Admin guards active');
  console.log('🌐 Frontend: ' + (process.env.FRONTEND_URL || 'http://localhost:3000') + '\n');
});

module.exports = app;

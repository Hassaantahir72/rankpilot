const express = require('express');
const router = express.Router();
const { authMiddleware, requireSubscription } = require('../middleware/auth');
const { queryOne, queryAll, query } = require('../config/db');
const aiService = require('../services/aiService');
const { sendWeeklyReport } = require('../services/emailService');
const { v4: uuidv4 } = require('uuid');
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const reports = await queryAll('SELECT r.id,r.website_id,r.type,r.period,r.overall_trend,r.created_at,w.name as site_name FROM reports r LEFT JOIN websites w ON r.website_id=w.id WHERE r.user_id=$1 ORDER BY r.created_at DESC LIMIT 50', [req.user.id]);
  res.json({ reports });
});

router.get('/:reportId', async (req, res) => {
  const report = await queryOne('SELECT r.*,w.name as site_name,w.url FROM reports r LEFT JOIN websites w ON r.website_id=w.id WHERE r.id=$1 AND r.user_id=$2', [req.params.reportId, req.user.id]);
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  res.json({ report });
});

router.post('/generate', requireSubscription, async (req, res) => {
  const { websiteId } = req.body;
  const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
  if (!website) return res.status(404).json({ error: 'Website not found.' });
  try {
    const rankings = await queryAll('SELECT * FROM rankings WHERE website_id=$1 ORDER BY checked_at DESC LIMIT 20', [websiteId]);
    const adPerf = await queryAll("SELECT * FROM ad_performance WHERE user_id=$1 AND date >= NOW()-INTERVAL '7 days'", [req.user.id]);
    const adTotals = adPerf.reduce((a,d)=>({spend:a.spend+(parseFloat(d.spend)||0),clicks:a.clicks+(d.clicks||0),conversions:a.conversions+(d.conversions||0)}),{spend:0,clicks:0,conversions:0});
    const period = `${new Date(Date.now()-7*86400000).toLocaleDateString()} – ${new Date().toLocaleDateString()}`;
    const reportData = await aiService.generateWeeklyReport({ website, rankings, adPerformance:adTotals.spend>0?adTotals:null, period });
    const saved = await queryOne(
      'INSERT INTO reports (id,user_id,website_id,type,period,data,overall_trend,created_at) VALUES ($1,$2,$3,$$weekly$$,$4,$5,$6,NOW()) RETURNING *',
      [uuidv4(), req.user.id, websiteId, period, JSON.stringify(reportData), reportData.overallTrend]
    );
    await sendWeeklyReport(req.user.email, req.user.name, reportData);
    res.json({ message:'Report generated and emailed!', report:saved, data:reportData });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error:'Failed to generate report.' });
  }
});
module.exports = router;

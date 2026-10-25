/**
 * Google Search Console Routes
 * Real ranking data directly from Google — 100% free
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query, queryOne, queryAll } = require('../config/db');
const gscService = require('../services/googleSearchConsole');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);

// ── LIST GSC VERIFIED SITES ───────────────────────────────────────
router.get('/sites', async (req, res) => {
  try {
    const sites = await gscService.listVerifiedSites(req.user.id);
    res.json({ sites, connected: sites.length > 0 });
  } catch (err) {
    res.status(400).json({ error: err.message, connected: false });
  }
});

// ── SYNC RANKINGS FROM GSC ────────────────────────────────────────
router.post('/sync/:websiteId', async (req, res) => {
  const { websiteId } = req.params;
  const { siteUrl } = req.body;

  const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
  if (!website) return res.status(404).json({ error: 'Website not found.' });

  try {
    const result = await gscService.syncRankingsToDatabase(req.user.id, websiteId, siteUrl || website.url);
    res.json({ message: `Synced ${result.synced} real rankings from Google!`, synced: result.synced });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── GET KEYWORD PERFORMANCE ───────────────────────────────────────
router.get('/keywords/:websiteId', async (req, res) => {
  const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [req.params.websiteId, req.user.id]);
  if (!website) return res.status(404).json({ error: 'Website not found.' });

  try {
    const keywords = await gscService.fetchKeywordPerformance(req.user.id, website.url);
    res.json({ keywords, source: 'google_search_console' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── GET PAGE PERFORMANCE ──────────────────────────────────────────
router.get('/pages/:websiteId', async (req, res) => {
  const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [req.params.websiteId, req.user.id]);
  if (!website) return res.status(404).json({ error: 'Website not found.' });

  try {
    const pages = await gscService.fetchPagePerformance(req.user.id, website.url);
    res.json({ pages, source: 'google_search_console' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── GET CLICK TREND ───────────────────────────────────────────────
router.get('/trend/:websiteId', async (req, res) => {
  const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [req.params.websiteId, req.user.id]);
  if (!website) return res.status(404).json({ error: 'Website not found.' });

  try {
    const trend = await gscService.getClickTrend(req.user.id, website.url);
    res.json({ trend, source: 'google_search_console' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── CHECK IF CONNECTED ────────────────────────────────────────────
router.get('/status', async (req, res) => {
  const token = await queryOne(
    "SELECT id, updated_at FROM oauth_tokens WHERE user_id=$1 AND provider='google'",
    [req.user.id]
  );
  res.json({ connected: !!token, lastSync: token?.updated_at || null });
});

module.exports = router;

/**
 * All 15 SEO Expert Features — Routes
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requireMinimumPlan, requirePlanFeature, incrementUsage } = require('../middleware/auth');
const { queryOne, queryAll, query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware, requireMinimumPlan('trial'));

// ── FEATURE 1: BACKLINK ANALYZER ─────────────────────────────────
router.post('/backlinks/analyze', async (req, res) => {
  const { websiteId } = req.body;
  try {
    const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
    if (!website) return res.status(404).json({ error: 'Website not found.' });
    const { analyzeBacklinks, findBacklinkOpportunities } = require('../services/backlinkService');
    const [analysis, opportunities] = await Promise.all([
      analyzeBacklinks(website.url),
      findBacklinkOpportunities(website.url),
    ]);
    res.json({ analysis, opportunities });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── FEATURE 2: CONTENT GAP ANALYSIS ──────────────────────────────
router.post('/content-gap', async (req, res) => {
  const { websiteId, competitors = [] } = req.body;
  try {
    const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
    if (!website) return res.status(404).json({ error: 'Website not found.' });
    const { analyzeContentGap } = require('../services/contentGapService');
    const result = await analyzeContentGap(website.url, competitors, website.industry);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── FEATURE 3: LOCAL SEO ─────────────────────────────────────────
router.post('/local-seo/analyze', async (req, res) => {
  const { websiteId, businessName, phone, address, city, country } = req.body;
  try {
    const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
    if (!website) return res.status(404).json({ error: 'Website not found.' });
    const localSeo = require('../services/localSeoService');
    const [gbp, nap, citations, keywords] = await Promise.all([
      localSeo.checkGoogleBusinessProfile(businessName || website.name, website.url),
      localSeo.checkNAPConsistency(businessName || website.name, phone, address),
      Promise.resolve(localSeo.getCitationOpportunities(website.industry)),
      localSeo.getLocalKeywords(website.industry || 'business', city || 'London'),
    ]);
    res.json({ googleBusinessProfile: gbp, napConsistency: nap, citations, localKeywords: keywords });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/local-seo/review-templates', async (req, res) => {
  const { businessName, service } = req.query;
  const { getReviewRequestTemplates } = require('../services/localSeoService');
  res.json(getReviewRequestTemplates(businessName || 'My Business', service));
});

// ── FEATURE 4: SCHEMA GENERATOR ──────────────────────────────────
router.post('/schema/generate', async (req, res) => {
  const { websiteId, ...data } = req.body;
  try {
    const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
    if (!website) return res.status(404).json({ error: 'Website not found.' });
    const schema = require('../services/schemaService');
    const schemas = schema.getAllSchemaTypes({ name: website.name, url: website.url, industry: website.industry, ...data });
    res.json({ schemas, count: schemas.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/schema/faq', async (req, res) => {
  const { faqs } = req.body;
  const { generateFAQSchema, formatSchemaCode } = require('../services/schemaService');
  const schema = generateFAQSchema(faqs || []);
  res.json({ schema, code: formatSchemaCode(schema) });
});

// ── FEATURE 5: PAGE SPEED ─────────────────────────────────────────
router.post('/pagespeed/analyze', async (req, res) => {
  const { websiteId, url } = req.body;
  try {
    let targetUrl = url;
    if (websiteId) {
      const website = await queryOne('SELECT url FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
      if (!website) return res.status(404).json({ error: 'Website not found.' });
      targetUrl = website.url;
    }
    if (!targetUrl) return res.status(400).json({ error: 'URL required.' });
    const { analyzePageSpeed } = require('../services/pageSpeedService');
    const result = await analyzePageSpeed(targetUrl);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── FEATURE 6: EMAIL MARKETING ────────────────────────────────────
router.post('/email-marketing/sequence', requireMinimumPlan('starter'), async (req, res) => {
  const { websiteId, sequenceType, goal, targetAudience } = req.body;
  try {
    const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
    if (!website) return res.status(404).json({ error: 'Website not found.' });
    const { generateEmailSequence } = require('../services/emailMarketingService');
    const sequence = await generateEmailSequence({ businessName: website.name, industry: website.industry, goal, targetAudience, sequenceType });
    res.json(sequence);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/email-marketing/subjects', requireMinimumPlan('starter'), async (req, res) => {
  const { topic, businessName } = req.body;
  const { generateSubjectLines } = require('../services/emailMarketingService');
  const subjects = await generateSubjectLines(topic, businessName);
  res.json({ subjects });
});

// ── FEATURE 7: REVIEW MANAGEMENT ─────────────────────────────────
router.post('/reviews/respond', async (req, res) => {
  const { businessName, reviewText, rating, reviewerName } = req.body;
  if (!reviewText || !rating) return res.status(400).json({ error: 'Review text and rating required.' });
  const { generateReviewResponse } = require('../services/reviewService');
  const result = await generateReviewResponse({ businessName, reviewText, rating: parseInt(rating), reviewerName });
  res.json(result);
});

router.post('/reviews/respond-batch', async (req, res) => {
  const { businessName, reviews } = req.body;
  const { generateBatchResponses } = require('../services/reviewService');
  const results = await generateBatchResponses(reviews, businessName);
  res.json({ responses: results });
});

router.post('/reviews/request-email', async (req, res) => {
  const { businessName, customerName, service, googleLink } = req.body;
  const { generateReviewRequestEmail } = require('../services/reviewService');
  const result = await generateReviewRequestEmail({ businessName, customerName, service, googleLink });
  res.json(result);
});

router.post('/reviews/analyze', async (req, res) => {
  const { reviews } = req.body;
  const { analyzeReviews } = require('../services/reviewService');
  res.json(analyzeReviews(reviews));
});

// ── FEATURE 8: COMPETITOR TRACKING ───────────────────────────────
router.post('/competitors/track', requirePlanFeature('competitor_analysis'), async (req, res) => {
  const { websiteId, competitorUrls } = req.body;
  try {
    const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
    if (!website) return res.status(404).json({ error: 'Website not found.' });
    const { trackAllCompetitors } = require('../services/competitorTrackingService');
    const results = await trackAllCompetitors(websiteId, req.user.id, competitorUrls || website.competitors || []);
    res.json({ competitors: results, tracked: results.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/competitors/snapshot', requirePlanFeature('competitor_analysis'), async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required.' });
  const { fetchCompetitorSnapshot } = require('../services/competitorTrackingService');
  const snapshot = await fetchCompetitorSnapshot(url);
  res.json(snapshot);
});

router.post('/competitors/report', requirePlanFeature('competitor_analysis'), async (req, res) => {
  const { yourDomain, competitors } = req.body;
  const { generateCompetitorReport } = require('../services/competitorTrackingService');
  const report = await generateCompetitorReport(yourDomain, competitors || []);
  res.json(report);
});

// ── FEATURE 9: AI BLOG WRITER ─────────────────────────────────────
router.post('/blog/write', async (req, res) => {
  const { websiteId, keyword, tone, audience } = req.body;
  if (!keyword) return res.status(400).json({ error: 'Target keyword required.' });
  try {
    const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
    if (!website) return res.status(404).json({ error: 'Website not found.' });
    const month = new Date().toISOString().slice(0, 7);
    const limits = await queryOne('SELECT max_content_per_month FROM plan_limits WHERE plan=$1', [req.user.plan]);
    const usage = await queryOne('SELECT count FROM usage_tracking WHERE user_id=$1 AND action=$content$ AND month=$2', [req.user.id, month]);
    const used = Number(usage?.count || 0);
    const limit = Number(limits?.max_content_per_month ?? 0);
    if (!limits || (limit !== 9999 && used >= limit)) return res.status(403).json({ error: 'Your monthly AI content limit has been reached.', code: 'USAGE_LIMIT_REACHED', used, limit });
    const { generateBlogPost } = require('../services/blogWriterService');
    const post = await generateBlogPost({ businessName: website.name, industry: website.industry, keyword, tone, audience });
    // Save to content history
    await query(
      'INSERT INTO content_history (id,website_id,user_id,target_keyword,generated_content,meta_title,meta_description,word_count,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())',
      [uuidv4(), websiteId, req.user.id, keyword, post.content, post.metaTitle, post.metaDescription, post.wordCount]
    );
    await incrementUsage(req.user.id, 'content');
    res.json(post);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/blog/topics', async (req, res) => {
  const { websiteId, count = 10 } = req.body;
  try {
    const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
    if (!website) return res.status(404).json({ error: 'Website not found.' });
    const month = new Date().toISOString().slice(0, 7);
    const limits = await queryOne('SELECT max_content_per_month FROM plan_limits WHERE plan=$1', [req.user.plan]);
    const usage = await queryOne('SELECT count FROM usage_tracking WHERE user_id=$1 AND action=$content$ AND month=$2', [req.user.id, month]);
    const used = Number(usage?.count || 0);
    const limit = Number(limits?.max_content_per_month ?? 0);
    if (!limits || (limit !== 9999 && used >= limit)) return res.status(403).json({ error: 'Your monthly AI content limit has been reached.', code: 'USAGE_LIMIT_REACHED', used, limit });
    const keywords = await queryAll('SELECT keyword FROM keywords WHERE website_id=$1 LIMIT 20', [websiteId]);
    const { generateBlogTopics } = require('../services/blogWriterService');
    const safeCount = Math.min(10, Math.max(1, Number.parseInt(String(count), 10) || 10));
    const topics = await generateBlogTopics({ businessName: website.name, industry: website.industry, keywords: keywords.map(k => k.keyword), count: safeCount });
    await incrementUsage(req.user.id, 'content');
    res.json({ topics, usage: { used: used + 1, limit } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/blog/publish-wordpress', async (req, res) => {
  const { siteUrl, username, appPassword, post } = req.body;
  if (!siteUrl || !username || !appPassword || !post) return res.status(400).json({ error: 'WordPress credentials and post required.' });
  const { publishToWordPress } = require('../services/blogWriterService');
  const result = await publishToWordPress({ siteUrl, username, appPassword, post });
  res.json(result);
});

// ── FEATURE 10: PERFORMANCE MAX ───────────────────────────────────
router.post('/pmax/generate', requirePlanFeature('google_ads'), async (req, res) => {
  const { websiteId, goal, budget, targetAudience, location } = req.body;
  try {
    const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
    if (!website) return res.status(404).json({ error: 'Website not found.' });
    const { generatePerformanceMaxAssets } = require('../services/performanceMaxService');
    const assets = await generatePerformanceMaxAssets({ businessName: website.name, industry: website.industry, url: website.url, goal, budget: parseInt(budget) || 500, targetAudience, location });
    res.json(assets);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── FEATURE 11: PDF REPORTS ───────────────────────────────────────
router.post('/reports/generate-pdf', requireMinimumPlan('pro'), async (req, res) => {
  const { websiteId } = req.body;
  try {
    const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
    if (!website) return res.status(404).json({ error: 'Website not found.' });
    const audit = await queryOne("SELECT * FROM audits WHERE website_id=$1 AND status='complete' ORDER BY completed_at DESC LIMIT 1", [websiteId]);
    const rankings = await queryAll('SELECT DISTINCT ON (keyword) keyword,position,previous_position FROM rankings WHERE website_id=$1 ORDER BY keyword,checked_at DESC LIMIT 30', [websiteId]);
    const adPerf = await queryOne("SELECT SUM(spend) as spend,SUM(clicks) as clicks,SUM(impressions) as impressions,SUM(conversions) as conversions FROM ad_performance WHERE user_id=$1 AND date >= NOW()-INTERVAL '30 days'", [req.user.id]);
    const period = `${new Date(Date.now()-30*86400000).toLocaleDateString()} — ${new Date().toLocaleDateString()}`;
    const { generateReportHTML } = require('../services/pdfReportService');
    const html = generateReportHTML({ website, auditData: audit ? { ...audit, technical_issues: audit.technical_issues, ai_analysis: audit.ai_analysis, overall_score: audit.overall_score } : null, rankings, adPerformance: adPerf, period });
    res.json({ html, period });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── FEATURE 12: CHANGE MONITOR ────────────────────────────────────
router.post('/monitor/snapshot', async (req, res) => {
  const { websiteId } = req.body;
  try {
    const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
    if (!website) return res.status(404).json({ error: 'Website not found.' });
    const { takeSnapshot } = require('../services/changeMonitorService');
    const snapshot = await takeSnapshot(website.url);
    await query('INSERT INTO website_snapshots (id,website_id,snapshot_data,alerts,taken_at) VALUES ($1,$2,$3,$4,NOW())',
      [uuidv4(), websiteId, JSON.stringify(snapshot), JSON.stringify([])]);
    res.json(snapshot);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/monitor/alerts/:websiteId', async (req, res) => {
  try {
    const { getAlerts } = require('../services/changeMonitorService');
    const alerts = await getAlerts(req.user.id, req.params.websiteId);
    res.json({ alerts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/monitor/read', async (req, res) => {
  const { alertIds } = req.body;
  const { markAlertsRead } = require('../services/changeMonitorService');
  await markAlertsRead(alertIds, req.user.id);
  res.json({ message: 'Alerts marked as read.' });
});

// ── FEATURE 13: INTERNAL LINKING ──────────────────────────────────
router.post('/internal-links/analyze', async (req, res) => {
  const { websiteId } = req.body;
  try {
    const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
    if (!website) return res.status(404).json({ error: 'Website not found.' });
    const keywords = await queryAll('SELECT keyword FROM keywords WHERE website_id=$1 LIMIT 30', [websiteId]);
    const { findLinkingOpportunities } = require('../services/internalLinkingService');
    const result = await findLinkingOpportunities(website.url, keywords);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── FEATURE 14: CANNIBALIZATION ────────────────────────────────────
router.post('/cannibalization/detect', async (req, res) => {
  const { websiteId } = req.body;
  try {
    const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
    if (!website) return res.status(404).json({ error: 'Website not found.' });
    const keywords = await queryAll('SELECT * FROM keywords WHERE website_id=$1', [websiteId]);
    const { detectCannibalization } = require('../services/cannibalizationService');
    const result = await detectCannibalization(website.url, keywords);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── FEATURE 15: SITEMAP ───────────────────────────────────────────
router.post('/sitemap/generate', async (req, res) => {
  const { websiteId } = req.body;
  try {
    const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
    if (!website) return res.status(404).json({ error: 'Website not found.' });
    const { analyzeSitemap } = require('../services/sitemapService');
    const result = await analyzeSitemap(website.url);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sitemap/submit-google', async (req, res) => {
  const { websiteId, sitemapUrl } = req.body;
  try {
    const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
    if (!website) return res.status(404).json({ error: 'Website not found.' });
    const { submitToGoogle, submitToBing } = require('../services/sitemapService');
    const [google, bing] = await Promise.all([
      submitToGoogle(req.user.id, website.url, sitemapUrl),
      submitToBing(sitemapUrl),
    ]);
    res.json({ google, bing });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

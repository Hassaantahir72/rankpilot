/**
 * Feature 12: Website Change Monitor
 * Detects changes to title, H1, robots.txt, page down, canonical changes
 * Runs weekly via cron — alerts users when something changes
 */

const cheerio = require('cheerio');
const safeHttp = require('./safeHttpService');
const { query, queryOne, queryAll } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; RankPilotBot/1.0)' };

// ── TAKE A PAGE SNAPSHOT ──────────────────────────────────────────
const takeSnapshot = async (url) => {
  try {
    const res = await safeHttp.fetchPublicUrl(url, { userAgent: HEADERS['User-Agent'], timeout: 15000, maxBytes: 2 * 1024 * 1024 });
    const $ = cheerio.load(res.data);
    return {
      url, ok: true,
      statusCode:      res.status,
      title:           $('title').text().trim(),
      h1:              $('h1').first().text().trim(),
      metaDescription: $('meta[name="description"]').attr('content') || '',
      canonical:       $('link[rel="canonical"]').attr('href') || '',
      robots:          $('meta[name="robots"]').attr('content') || '',
      hasSSL:          url.startsWith('https'),
      wordCount:       $('body').text().replace(/\s+/g,' ').trim().split(' ').length,
      hasSchema:       $('script[type="application/ld+json"]').length > 0,
      h2Count:         $('h2').length,
      imgCount:        $('img').length,
      imgNoAlt:        $('img:not([alt])').length,
      snapshotAt:      new Date().toISOString(),
    };
  } catch (err) {
    return { url, ok: false, statusCode: err.response?.status || 0, error: err.message, snapshotAt: new Date().toISOString() };
  }
};

// ── COMPARE SNAPSHOTS ─────────────────────────────────────────────
const compareSnapshots = (old, curr) => {
  if (!old) return [];
  const alerts = [];
  const add = (severity, type, field, oldVal, newVal, message) => alerts.push({ severity, type, field, oldVal: String(oldVal||'').slice(0,150), newVal: String(newVal||'').slice(0,150), message });

  // Site went down
  if (old.ok && !curr.ok) add('critical', 'site_down', 'Site Status', 'Online', `Error ${curr.statusCode}`, `Your website is DOWN! Status code: ${curr.statusCode}. Google cannot crawl it.`);
  if (!old.ok && curr.ok) add('info', 'site_recovered', 'Site Status', 'Down', 'Online', 'Great news — your website is back online!');

  if (!curr.ok) return alerts; // No point comparing other fields

  // Title changed
  if (old.title && curr.title && old.title !== curr.title) add('high', 'title_change', 'Page Title', old.title, curr.title, 'Your homepage title tag changed. This directly affects your Google rankings.');

  // H1 changed
  if (old.h1 && curr.h1 && old.h1 !== curr.h1) add('high', 'h1_change', 'H1 Heading', old.h1, curr.h1, 'Your main heading changed. H1 is a key ranking signal — review if this was intentional.');

  // Meta description changed
  if (old.metaDescription && curr.metaDescription && old.metaDescription !== curr.metaDescription) add('medium', 'meta_change', 'Meta Description', old.metaDescription, curr.metaDescription, 'Meta description changed — this affects click-through rate from search results.');

  // Canonical changed
  if (old.canonical && curr.canonical && old.canonical !== curr.canonical) add('high', 'canonical_change', 'Canonical Tag', old.canonical, curr.canonical, 'Canonical URL changed — this could cause duplicate content issues.');

  // SSL lost
  if (old.hasSSL && !curr.hasSSL) add('critical', 'ssl_lost', 'SSL/HTTPS', 'HTTPS', 'HTTP', 'Your site lost its SSL certificate! Google will penalise non-HTTPS sites immediately.');

  // Robots tag changed
  if (old.robots !== curr.robots && curr.robots && curr.robots.includes('noindex')) add('critical', 'noindex_added', 'Robots Meta', old.robots, curr.robots, 'CRITICAL: Your site has been set to noindex! Google will remove it from search results.');

  // Huge content change
  const wordDiff = Math.abs((curr.wordCount || 0) - (old.wordCount || 0));
  if (wordDiff > 300) add('medium', 'content_change', 'Word Count', `${old.wordCount} words`, `${curr.wordCount} words`, `Significant content change detected (${wordDiff > 0 ? '+' : ''}${curr.wordCount - old.wordCount} words). Review if intentional.`);

  // Schema removed
  if (old.hasSchema && !curr.hasSchema) add('medium', 'schema_removed', 'Schema Markup', 'Present', 'Removed', 'Structured data was removed from your homepage — this may affect rich snippets in Google.');

  return alerts;
};

// ── MONITOR ALL WEBSITES ──────────────────────────────────────────
const monitorAllWebsites = async () => {
  console.log('Running website change monitor...');
  const websites = await queryAll("SELECT * FROM websites WHERE status='active'");
  const allAlerts = [];

  for (const site of websites) {
    try {
      const current = await takeSnapshot(site.url);
      const previous = await queryOne(
        'SELECT snapshot_data FROM website_snapshots WHERE website_id=$1 ORDER BY taken_at DESC LIMIT 1',
        [site.id]
      );

      const previousData = previous?.snapshot_data;
      const alerts = compareSnapshots(previousData, current);

      // Save new snapshot
      await query(
        'INSERT INTO website_snapshots (id,website_id,snapshot_data,alerts,taken_at) VALUES ($1,$2,$3,$4,NOW())',
        [uuidv4(), site.id, JSON.stringify(current), JSON.stringify(alerts)]
      );

      if (alerts.length > 0) {
        allAlerts.push({ website: site, alerts, current });
        // Save each alert to change_alerts table
        for (const alert of alerts) {
          await query(
            'INSERT INTO change_alerts (id,website_id,severity,type,field,old_value,new_value,message,is_read,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,NOW())',
            [uuidv4(), site.id, alert.severity, alert.type, alert.field, alert.oldVal, alert.newVal, alert.message]
          );
        }
      }
    } catch (err) {
      console.error(`Monitor error for ${site.url}:`, err.message);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`Change monitor complete. ${allAlerts.length} sites with changes.`);
  return allAlerts;
};

// ── GET ALERTS FOR USER ───────────────────────────────────────────
const getAlerts = async (userId, websiteId = null, unreadOnly = false) => {
  const conds = ['w.user_id=$1'];
  const params = [userId];
  if (websiteId) { params.push(websiteId); conds.push(`ca.website_id=$${params.length}`); }
  if (unreadOnly) conds.push('ca.is_read=false');
  return queryAll(
    `SELECT ca.*,w.name as site_name,w.url as site_url FROM change_alerts ca
     JOIN websites w ON ca.website_id=w.id WHERE ${conds.join(' AND ')} ORDER BY ca.created_at DESC LIMIT 50`,
    params
  );
};

// ── MARK ALERTS AS READ ───────────────────────────────────────────
const markAlertsRead = async (alertIds = [], userId) => {
  if (!alertIds.length) return;
  await query(
    `UPDATE change_alerts SET is_read=true WHERE id=ANY($1) AND website_id IN (SELECT id FROM websites WHERE user_id=$2)`,
    [alertIds, userId]
  );
};

// ── GET LATEST SNAPSHOT ───────────────────────────────────────────
const getLatestSnapshot = async (websiteId) => {
  const row = await queryOne('SELECT * FROM website_snapshots WHERE website_id=$1 ORDER BY taken_at DESC LIMIT 1', [websiteId]);
  return row ? { ...row.snapshot_data, takenAt: row.taken_at, alerts: row.alerts } : null;
};

module.exports = { takeSnapshot, compareSnapshots, monitorAllWebsites, getAlerts, markAlertsRead, getLatestSnapshot };

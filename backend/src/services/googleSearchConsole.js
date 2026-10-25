/**
 * Google Search Console Service (100% FREE)
 * Real ranking data directly from Google
 * Setup: console.cloud.google.com → Enable Search Console API → OAuth credentials
 */

const axios = require('axios');
const { query, queryOne, queryAll } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const GSC_API = 'https://searchconsole.googleapis.com/webmasters/v3';

// ── REFRESH OAUTH TOKEN ───────────────────────────────────────────
const refreshAccessToken = async (refreshToken) => {
  const { data } = await axios.post('https://oauth2.googleapis.com/token', {
    client_id:     process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type:    'refresh_token',
  });
  return data.access_token;
};

// ── GET USER'S GSC TOKEN ──────────────────────────────────────────
const getUserGSCToken = async (userId) => {
  const token = await queryOne(
    "SELECT access_token, refresh_token FROM oauth_tokens WHERE user_id=$1 AND provider='google'",
    [userId]
  );
  if (!token) throw new Error('Google account not connected. Please connect Google in Settings.');
  
  // Refresh the access token
  const accessToken = await refreshAccessToken(token.refresh_token);
  
  // Update stored token
  await query(
    "UPDATE oauth_tokens SET access_token=$1, updated_at=NOW() WHERE user_id=$2 AND provider='google'",
    [accessToken, userId]
  );
  
  return accessToken;
};

// ── LIST VERIFIED SITES ───────────────────────────────────────────
const listVerifiedSites = async (userId) => {
  try {
    const accessToken = await getUserGSCToken(userId);
    const { data } = await axios.get(`${GSC_API}/sites`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return (data.siteEntry || []).map(s => ({
      siteUrl: s.siteUrl,
      permissionLevel: s.permissionLevel,
    }));
  } catch (err) {
    console.error('GSC list sites error:', err.response?.data || err.message);
    return [];
  }
};

// ── FETCH REAL RANKING DATA ───────────────────────────────────────
const fetchRankingData = async (userId, siteUrl, days = 28) => {
  try {
    const accessToken = await getUserGSCToken(userId);
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    const { data } = await axios.post(
      `${GSC_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        startDate,
        endDate,
        dimensions: ['query', 'page', 'date'],
        rowLimit: 500,
        dimensionFilterGroups: [{
          filters: [{ dimension: 'country', operator: 'equals', expression: 'gbr' }]
        }],
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return data.rows || [];
  } catch (err) {
    console.error('GSC fetch rankings error:', err.response?.data || err.message);
    throw err;
  }
};

// ── FETCH KEYWORD PERFORMANCE ────────────────────────────────────
const fetchKeywordPerformance = async (userId, siteUrl) => {
  try {
    const accessToken = await getUserGSCToken(userId);
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];

    const { data } = await axios.post(
      `${GSC_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 200,
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return (data.rows || []).map(row => ({
      keyword:     row.keys[0],
      clicks:      row.clicks,
      impressions: row.impressions,
      ctr:         (row.ctr * 100).toFixed(1),
      position:    Math.round(row.position),
    }));
  } catch (err) {
    console.error('GSC keyword performance error:', err.response?.data || err.message);
    return [];
  }
};

// ── FETCH PAGE PERFORMANCE ─────────────────────────────────────────
const fetchPagePerformance = async (userId, siteUrl) => {
  try {
    const accessToken = await getUserGSCToken(userId);
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];

    const { data } = await axios.post(
      `${GSC_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 100,
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return (data.rows || []).map(row => ({
      page:        row.keys[0],
      clicks:      row.clicks,
      impressions: row.impressions,
      ctr:         (row.ctr * 100).toFixed(1),
      position:    Math.round(row.position),
    }));
  } catch (err) {
    console.error('GSC page performance error:', err.response?.data || err.message);
    return [];
  }
};

// ── SYNC REAL RANKINGS TO DATABASE ───────────────────────────────
const syncRankingsToDatabase = async (userId, websiteId, siteUrl) => {
  try {
    console.log(`Syncing GSC rankings for ${siteUrl}...`);
    const keywords = await fetchKeywordPerformance(userId, siteUrl);
    
    let synced = 0;
    for (const kw of keywords.slice(0, 200)) {
      // Get previous position
      const prev = await queryOne(
        'SELECT position FROM rankings WHERE website_id=$1 AND keyword=$2 ORDER BY checked_at DESC LIMIT 1',
        [websiteId, kw.keyword]
      );

      // Save to rankings
      await query(
        'INSERT INTO rankings (id,website_id,user_id,keyword,position,previous_position,checked_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())',
        [uuidv4(), websiteId, userId, kw.keyword, kw.position, prev?.position || null]
      );

      // Upsert keyword record
      await query(
        `INSERT INTO keywords (id,website_id,user_id,keyword,current_position,updated_at,created_at)
         VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
         ON CONFLICT (website_id,keyword) DO UPDATE SET current_position=$5, updated_at=NOW()`,
        [uuidv4(), websiteId, userId, kw.keyword, kw.position]
      );

      synced++;
    }

    console.log(`Synced ${synced} real rankings from Google Search Console`);
    return { synced, keywords };
  } catch (err) {
    console.error('Sync rankings error:', err.message);
    throw err;
  }
};

// ── GET CLICK TREND (last 30 days) ────────────────────────────────
const getClickTrend = async (userId, siteUrl) => {
  try {
    const accessToken = await getUserGSCToken(userId);
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const { data } = await axios.post(
      `${GSC_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      { startDate, endDate, dimensions: ['date'], rowLimit: 30 },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return (data.rows || []).map(r => ({
      date:        r.keys[0],
      clicks:      r.clicks,
      impressions: r.impressions,
      position:    Math.round(r.position),
    }));
  } catch (err) {
    return [];
  }
};

module.exports = { listVerifiedSites, fetchRankingData, fetchKeywordPerformance, fetchPagePerformance, syncRankingsToDatabase, getClickTrend, getUserGSCToken };

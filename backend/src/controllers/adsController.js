const { v4: uuidv4 } = require('uuid');
const { queryOne, queryAll, query } = require('../config/db');
const aiService = require('../services/aiService');
const { incrementUsage } = require('../middleware/auth');

const getOverview = async (req, res) => {
  const { siteId } = req.params;
  const [campaigns, adPerf] = await Promise.all([
    queryAll("SELECT * FROM campaigns WHERE website_id=$1 AND user_id=$2 ORDER BY created_at DESC", [siteId, req.user.id]),
    queryAll("SELECT * FROM ad_performance WHERE user_id=$1 AND date >= NOW()-INTERVAL '30 days' ORDER BY date DESC", [req.user.id]),
  ]);
  const totals = adPerf.reduce((a,d)=>({spend:a.spend+(parseFloat(d.spend)||0),clicks:a.clicks+(d.clicks||0),conversions:a.conversions+(d.conversions||0),impressions:a.impressions+(d.impressions||0)}),{spend:0,clicks:0,conversions:0,impressions:0});
  res.json({ campaigns, performance: totals });
};

const createGoogleCampaign = async (req, res) => {
  const { websiteId, campaignName, budget, goal, targetAudience, product } = req.body;
  const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
  if (!website) return res.status(404).json({ error: 'Website not found.' });

  const limits = await queryOne('SELECT google_ads FROM plan_limits WHERE plan=$1', [req.user.plan]);
  if (!limits?.google_ads) return res.status(403).json({ error: 'Google Ads requires Growth plan or higher.', code: 'UPGRADE_REQUIRED' });

  try {
    const adCopy = await aiService.generateAdCopy({ website, platform:'google', goal, targetAudience, product, budget });
    const campaign = await queryOne(
      'INSERT INTO campaigns (id,user_id,website_id,platform,name,status,budget_monthly,goal,ai_copy,created_at) VALUES ($1,$2,$3,$$google$$,$4,$$draft$$,$5,$6,$7,NOW()) RETURNING *',
      [uuidv4(), req.user.id, websiteId, campaignName, budget||500, goal||'leads', JSON.stringify(adCopy)]
    );
    res.status(201).json({ message: 'Google Ads campaign created with AI copy!', campaign, adCopy });
  } catch (err) {
    console.error('Google campaign error:', err);
    res.status(500).json({ error: 'Failed to create campaign.' });
  }
};

const getGoogleCampaigns = async (req, res) => {
  const campaigns = await queryAll("SELECT * FROM campaigns WHERE user_id=$1 AND platform='google' ORDER BY created_at DESC", [req.user.id]);
  res.json({ campaigns });
};

const getGooglePerformance = async (req, res) => {
  const { period = '30' } = req.query;
  const perf = await queryAll(
    "SELECT date,SUM(impressions) as impressions,SUM(clicks) as clicks,SUM(spend) as spend,SUM(conversions) as conversions FROM ad_performance WHERE user_id=$1 AND platform='google' AND date >= NOW()-($2::int||' days')::interval GROUP BY date ORDER BY date DESC",
    [req.user.id, period]
  );
  res.json({ performance: perf });
};

const createMetaCampaign = async (req, res) => {
  const { websiteId, campaignName, budget, goal, targetAudience, product } = req.body;
  const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
  if (!website) return res.status(404).json({ error: 'Website not found.' });

  const limits = await queryOne('SELECT meta_ads FROM plan_limits WHERE plan=$1', [req.user.plan]);
  if (!limits?.meta_ads) return res.status(403).json({ error: 'Meta Ads requires Pro plan or higher.', code: 'UPGRADE_REQUIRED' });

  try {
    const adCopy = await aiService.generateAdCopy({ website, platform:'meta', goal, targetAudience, product, budget });
    const campaign = await queryOne(
      'INSERT INTO campaigns (id,user_id,website_id,platform,name,status,budget_monthly,goal,ai_copy,created_at) VALUES ($1,$2,$3,$$meta$$,$4,$$draft$$,$5,$6,$7,NOW()) RETURNING *',
      [uuidv4(), req.user.id, websiteId, campaignName, budget||300, goal||'leads', JSON.stringify(adCopy)]
    );
    res.status(201).json({ message: 'Meta campaign created with AI copy!', campaign, adCopy });
  } catch (err) {
    console.error('Meta campaign error:', err);
    res.status(500).json({ error: 'Failed to create campaign.' });
  }
};

const getMetaCampaigns = async (req, res) => {
  const campaigns = await queryAll("SELECT * FROM campaigns WHERE user_id=$1 AND platform='meta' ORDER BY created_at DESC", [req.user.id]);
  res.json({ campaigns });
};

const generateAdCopy = async (req, res) => {
  const { websiteId, platform, goal, targetAudience, product, budget } = req.body;
  const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
  if (!website) return res.status(404).json({ error: 'Website not found.' });
  try {
    const adCopy = await aiService.generateAdCopy({ website, platform, goal, targetAudience, product, budget });
    await query('INSERT INTO ad_copy_history (id,user_id,website_id,platform,goal,copy,created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())',
      [uuidv4(), req.user.id, websiteId, platform, goal, JSON.stringify(adCopy)]);
    res.json({ message: 'Ad copy generated!', adCopy });
  } catch (err) {
    console.error('Ad copy error:', err);
    res.status(500).json({ error: 'Failed to generate ad copy.' });
  }
};

const generateSocialContent = async (req, res) => {
  const { websiteId, platform, topic, count } = req.body;
  const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
  if (!website) return res.status(404).json({ error: 'Website not found.' });

  const month = new Date().toISOString().slice(0,7);
  const limits = await queryOne('SELECT max_social_posts_per_month FROM plan_limits WHERE plan=$1', [req.user.plan]);
  const usage = await queryOne('SELECT count FROM usage_tracking WHERE user_id=$1 AND action=$$social$$ AND month=$2', [req.user.id, month]);
  const used = usage?.count || 0;
  if (limits && limits.max_social_posts_per_month !== 9999 && limits.max_social_posts_per_month > 0 && used >= limits.max_social_posts_per_month) {
    return res.status(403).json({ error: 'Social post limit reached. Upgrade for more.', code: 'USAGE_LIMIT_REACHED' });
  }

  try {
    const content = await aiService.generateSocialContent({ website, platform, topic, count: count||5 });
    for (const post of (content.posts||[]).slice(0,10)) {
      await query('INSERT INTO social_posts (id,user_id,website_id,platform,content,hashtags,type,best_time,image_idea,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$$draft$$,NOW())',
        [uuidv4(), req.user.id, websiteId, platform, post.content, post.hashtags||[], post.type, post.bestPostingTime, post.imageIdea]);
    }
    await incrementUsage(req.user.id, 'social');
    res.json({ message: 'Social content generated!', content });
  } catch (err) {
    console.error('Social content error:', err);
    res.status(500).json({ error: 'Failed to generate social content.' });
  }
};

const getSocialCalendar = async (req, res) => {
  const posts = await queryAll('SELECT * FROM social_posts WHERE website_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 50', [req.params.websiteId, req.user.id]);
  res.json({ posts });
};

module.exports = { getOverview, createGoogleCampaign, getGoogleCampaigns, getGooglePerformance, createMetaCampaign, getMetaCampaigns, generateAdCopy, generateSocialContent, getSocialCalendar };

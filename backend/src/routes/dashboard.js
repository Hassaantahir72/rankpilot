const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { queryOne, queryAll } = require('../config/db');
router.use(authMiddleware);

router.get('/stats', async (req, res) => {
  const uid = req.user.id;
  const month = new Date().toISOString().slice(0,7);
  try {
    const [websites, audits, rankings, campaigns, adPerf, usage, reports] = await Promise.all([
      queryAll('SELECT id,name,url,last_score,status FROM websites WHERE user_id=$1', [uid]),
      queryAll('SELECT id,overall_score,status,completed_at FROM audits WHERE user_id=$1 ORDER BY completed_at DESC LIMIT 5', [uid]),
      queryAll('SELECT keyword,position,previous_position,checked_at FROM rankings WHERE user_id=$1 ORDER BY checked_at DESC LIMIT 20', [uid]),
      queryAll('SELECT id,name,platform,status,budget_monthly FROM campaigns WHERE user_id=$1', [uid]),
      queryAll("SELECT spend,clicks,conversions FROM ad_performance WHERE user_id=$1 AND date >= date_trunc('month',NOW())", [uid]),
      queryAll('SELECT action,count FROM usage_tracking WHERE user_id=$1 AND month=$2', [uid, month]),
      queryOne('SELECT id,overall_trend,created_at FROM reports WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [uid]),
    ]);
    const improved = rankings.filter(r=>r.previous_position&&r.position<r.previous_position).length;
    const adTotals = adPerf.reduce((a,d)=>({spend:a.spend+(parseFloat(d.spend)||0),clicks:a.clicks+(d.clicks||0),conversions:a.conversions+(d.conversions||0)}),{spend:0,clicks:0,conversions:0});
    const usageMap = usage.reduce((a,u)=>({...a,[u.action]:u.count}),{});
    res.json({ websites, websiteCount:websites.length, recentAudits:audits, campaigns, activeCampaigns:campaigns.filter(c=>c.status==='active').length, rankingChanges:{improved}, adPerformance:adTotals, lastReport:reports, usage:usageMap });
  } catch(err){ console.error(err); res.status(500).json({error:'Failed to load stats.'}); }
});

router.get('/activity', async (req, res) => {
  const uid = req.user.id;
  try {
    const [audits, content, reps] = await Promise.all([
      queryAll('SELECT a.id,a.overall_score,a.completed_at,w.name as site_name FROM audits a JOIN websites w ON a.website_id=w.id WHERE a.user_id=$1 AND a.completed_at IS NOT NULL ORDER BY a.completed_at DESC LIMIT 5', [uid]),
      queryAll('SELECT c.id,c.target_keyword,c.created_at,w.name as site_name FROM content_history c JOIN websites w ON c.website_id=w.id WHERE c.user_id=$1 ORDER BY c.created_at DESC LIMIT 5', [uid]),
      queryAll('SELECT r.id,r.type,r.created_at,w.name as site_name FROM reports r JOIN websites w ON r.website_id=w.id WHERE r.user_id=$1 ORDER BY r.created_at DESC LIMIT 5', [uid]),
    ]);
    const activities = [
      ...audits.map(a=>({type:'audit',icon:'🔍',text:`SEO audit complete for ${a.site_name} — Score: ${a.overall_score}/100`,date:a.completed_at})),
      ...content.map(c=>({type:'content',icon:'✍️',text:`AI content generated for "${c.target_keyword}" on ${c.site_name}`,date:c.created_at})),
      ...reps.map(r=>({type:'report',icon:'📊',text:`${r.type} report generated for ${r.site_name}`,date:r.created_at})),
    ].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,15);
    res.json({ activities });
  } catch(err){ res.status(500).json({error:'Failed.'}); }
});
module.exports = router;

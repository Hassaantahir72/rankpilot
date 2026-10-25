const { v4: uuidv4 } = require('uuid');
const { queryOne, queryAll, query } = require('../config/db');
const { incrementUsage } = require('../middleware/auth');
const crawlerService = require('../services/crawlerService');
const keywordService = require('../services/keywordService');
const aiService = require('../services/aiService');

// WEBSITES
const addWebsite = async (req, res) => {
  const { name, url, industry } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'Name and URL are required.' });

  const limits = await queryOne('SELECT max_websites FROM plan_limits WHERE plan=$1', [req.user.plan]);
  const count = await queryOne('SELECT COUNT(*) FROM websites WHERE user_id=$1', [req.user.id]);
  if (limits && parseInt(count.count) >= limits.max_websites && limits.max_websites !== 9999) {
    return res.status(403).json({ error: `Your plan allows max ${limits.max_websites} website(s). Upgrade to add more.`, code: 'LIMIT_REACHED' });
  }

  const website = await queryOne(
    'INSERT INTO websites (id,user_id,name,url,industry,status,created_at) VALUES ($1,$2,$3,$4,$5,$$active$$,NOW()) RETURNING *',
    [uuidv4(), req.user.id, name, url, industry]
  );
  res.status(201).json({ message: 'Website added!', website });
};

const getWebsites = async (req, res) => {
  const websites = await queryAll('SELECT * FROM websites WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
  res.json({ websites });
};

const deleteWebsite = async (req, res) => {
  await query('DELETE FROM websites WHERE id=$1 AND user_id=$2', [req.params.websiteId, req.user.id]);
  res.json({ message: 'Website deleted.' });
};

// AUDIT
const runAudit = async (req, res) => {
  const { websiteId } = req.params;
  const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [websiteId, req.user.id]);
  if (!website) return res.status(404).json({ error: 'Website not found.' });

  const month = new Date().toISOString().slice(0,7);
  const limits = await queryOne('SELECT max_audits_per_month FROM plan_limits WHERE plan=$1', [req.user.plan]);
  const usage = await queryOne('SELECT count FROM usage_tracking WHERE user_id=$1 AND action=$$audit$$ AND month=$2', [req.user.id, month]);
  const used = usage?.count || 0;
  if (limits && limits.max_audits_per_month !== 9999 && used >= limits.max_audits_per_month) {
    return res.status(403).json({ error: `You have used all ${limits.max_audits_per_month} audits this month.`, code: 'USAGE_LIMIT_REACHED' });
  }

  const auditId = uuidv4();
  await queryOne('INSERT INTO audits (id,website_id,user_id,status,started_at) VALUES ($1,$2,$3,$$running$$,NOW()) RETURNING id',
    [auditId, websiteId, req.user.id]);

  res.json({ message: 'Audit started! Results ready in 3-5 minutes.', auditId });

  // Run in background
  setImmediate(async () => {
    try {
      await incrementUsage(req.user.id, 'audit');
      const crawlData = await crawlerService.crawlWebsite(website.url);
      const technicalIssuesRaw = await crawlerService.analyzeTechnical(crawlData);
      const technicalIssues = Array.isArray(technicalIssuesRaw) ? technicalIssuesRaw : [];
      const keywordsRaw = await keywordService.researchForWebsite(website.url, website.industry, crawlData.content);
      const keywords = Array.isArray(keywordsRaw) ? keywordsRaw : [];
      const aiAnalysis = await aiService.analyzeWebsiteForSEO({ website, crawlData, keywords: keywords.slice(0,20), technicalIssues });
      const pageRecs = await aiService.generatePageRecommendations({ website, pages: crawlData.pages?.slice(0,10) || [], keywords: keywords.slice(0,10) });
      const score = calculateScore(technicalIssues, crawlData);

      await query(
        `UPDATE audits SET status='complete',overall_score=$1,pages_crawled=$2,issues_found=$3,
         keywords_found_count=$4,crawl_data=$5,technical_issues=$6,keywords_found=$7,
         ai_analysis=$8,page_recommendations=$9,completed_at=NOW() WHERE id=$10`,
        [score, crawlData.pagesCount||crawlData.totalPages||0, technicalIssues.length, keywords.length,
         JSON.stringify(crawlData), JSON.stringify(technicalIssues), JSON.stringify(keywords),
         JSON.stringify(aiAnalysis), JSON.stringify(pageRecs), auditId]
      );
      await query('UPDATE websites SET last_audit_at=NOW(),last_score=$1 WHERE id=$2', [score, websiteId]);

      // Save keywords
      for (const kw of keywords.slice(0, 100)) {
        await query(
          `INSERT INTO keywords (id,website_id,user_id,keyword,search_volume,difficulty,cpc,intent,priority,created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) ON CONFLICT (website_id,keyword) DO UPDATE SET search_volume=$5,difficulty=$6,updated_at=NOW()`,
          [uuidv4(), websiteId, req.user.id, kw.keyword, kw.searchVolume||0, kw.difficulty||50, kw.cpc||0, kw.intent||'informational', kw.priority||0]
        );
      }
    } catch (err) {
      console.error('Audit background error:', err);
      await query("UPDATE audits SET status='failed',error=$1 WHERE id=$2", [err.message, auditId]);
    }
  });
};

const calculateScore = (issues, crawlData) => {
  let score = 100;
  const critical = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  score -= critical * 8;
  score -= warnings * 3;
  if (crawlData.avgPageSpeed && crawlData.avgPageSpeed < 50) score -= 10;
  if (!crawlData.hasSitemap) score -= 5;
  if (!crawlData.hasRobots) score -= 3;
  return Math.max(0, Math.min(100, score));
};

const getAudits = async (req, res) => {
  const audits = await queryAll('SELECT id,status,overall_score,pages_crawled,issues_found,started_at,completed_at FROM audits WHERE website_id=$1 AND user_id=$2 ORDER BY started_at DESC LIMIT 20', [req.params.websiteId, req.user.id]);
  res.json({ audits });
};

const getAuditDetail = async (req, res) => {
  const audit = await queryOne('SELECT * FROM audits WHERE id=$1 AND user_id=$2', [req.params.auditId, req.user.id]);
  if (!audit) return res.status(404).json({ error: 'Audit not found.' });
  res.json({ audit });
};

// KEYWORDS
const getKeywords = async (req, res) => {
  const keywords = await queryAll('SELECT * FROM keywords WHERE website_id=$1 AND user_id=$2 ORDER BY priority DESC,search_volume DESC LIMIT 200', [req.params.websiteId, req.user.id]);
  res.json({ keywords });
};

// CONTENT
const generateContent = async (req, res) => {
  const { pageUrl, targetKeyword, pageType, tone } = req.body;
  const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [req.params.websiteId, req.user.id]);
  if (!website) return res.status(404).json({ error: 'Website not found.' });

  const month = new Date().toISOString().slice(0,7);
  const limits = await queryOne('SELECT max_content_per_month FROM plan_limits WHERE plan=$1', [req.user.plan]);
  const usage = await queryOne('SELECT count FROM usage_tracking WHERE user_id=$1 AND action=$$content$$ AND month=$2', [req.user.id, month]);
  const used = usage?.count || 0;
  if (limits && limits.max_content_per_month !== 9999 && used >= limits.max_content_per_month) {
    return res.status(403).json({ error: `Content limit reached (${limits.max_content_per_month}/month). Upgrade for more.`, code: 'USAGE_LIMIT_REACHED' });
  }

  try {
    const content = await aiService.generateOptimizedContent({ website, pageUrl, targetKeyword, pageType: pageType||'page', tone: tone||'professional' });
    await incrementUsage(req.user.id, 'content');
    await query(
      'INSERT INTO content_history (id,website_id,user_id,page_url,target_keyword,generated_content,meta_title,meta_description,keywords_used,word_count,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())',
      [uuidv4(), req.params.websiteId, req.user.id, pageUrl, targetKeyword, content.content, content.metaTitle, content.metaDescription, content.keywordsUsed||[], content.wordCount||0]
    );
    res.json({ message: 'Content generated!', content });
  } catch (err) {
    console.error('Content error:', err);
    res.status(500).json({ error: 'Content generation failed. Please try again.' });
  }
};

const getContentHistory = async (req, res) => {
  const content = await queryAll('SELECT id,page_url,target_keyword,meta_title,word_count,created_at FROM content_history WHERE website_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 50', [req.params.websiteId, req.user.id]);
  res.json({ content });
};

// RANKINGS
const getRankings = async (req, res) => {
  const rankings = await queryAll('SELECT DISTINCT ON (keyword) * FROM rankings WHERE website_id=$1 AND user_id=$2 ORDER BY keyword,checked_at DESC', [req.params.websiteId, req.user.id]);
  res.json({ rankings });
};

// COMPETITORS
const getCompetitors = async (req, res) => {
  const competitors = await queryAll('SELECT * FROM competitors WHERE website_id=$1 ORDER BY shared_keywords DESC', [req.params.websiteId]);
  res.json({ competitors });
};

const analyzeCompetitors = async (req, res) => {
  const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [req.params.websiteId, req.user.id]);
  if (!website) return res.status(404).json({ error: 'Website not found.' });
  const dataforSeoService = require('../services/dataforSeoService');
  try {
    const competitors = await dataforSeoService.getCompetitors(website.url);
    for (const comp of (competitors||[]).slice(0,5)) {
      await query(
        'INSERT INTO competitors (id,website_id,domain,shared_keywords,domain_authority,updated_at) VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT (website_id,domain) DO UPDATE SET shared_keywords=$4,updated_at=NOW()',
        [uuidv4(), req.params.websiteId, comp.domain, comp.intersections||0, comp.rank||0]
      );
    }
    res.json({ message: 'Competitors analyzed!', competitors });
  } catch (err) {
    res.status(500).json({ error: 'Competitor analysis failed.' });
  }
};

const getTechnicalIssues = async (req, res) => {
  const audit = await queryOne('SELECT technical_issues FROM audits WHERE website_id=$1 AND user_id=$2 AND status=$$complete$$ ORDER BY completed_at DESC LIMIT 1', [req.params.websiteId, req.user.id]);
  res.json({ issues: audit?.technical_issues || [] });
};

module.exports = { addWebsite, getWebsites, deleteWebsite, runAudit, getAudits, getAuditDetail, getKeywords, generateContent, getContentHistory, getRankings, getCompetitors, analyzeCompetitors, getTechnicalIssues };

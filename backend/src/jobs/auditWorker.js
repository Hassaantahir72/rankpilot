/**
 * Durable SEO audit worker.
 * Jobs are persisted in PostgreSQL, claimed atomically, and retried after failures.
 */
const os = require('node:os');
const { v4: uuidv4 } = require('uuid');
const { queryOne, queryAll, query } = require('../config/db');
const { incrementUsage } = require('../middleware/auth');
const crawlerService = require('../services/crawlerService');
const keywordService = require('../services/keywordService');
const aiService = require('../services/aiService');

const workerId = `${os.hostname()}-${process.pid}`;
let timer = null;
let busy = false;

const calculateScore = (issues, crawlData) => {
  let score = 100;
  score -= issues.filter(i => i.severity === 'critical').length * 8;
  score -= issues.filter(i => i.severity === 'warning').length * 3;
  if (crawlData.pageSpeedData?.performance != null && crawlData.pageSpeedData.performance < 50) score -= 10;
  if (!crawlData.hasSitemap) score -= 5;
  if (!crawlData.hasRobots) score -= 3;
  return Math.max(0, Math.min(100, score));
};

const processJob = async (job) => {
  const website = await queryOne('SELECT * FROM websites WHERE id=$1 AND user_id=$2', [job.website_id, job.user_id]);
  if (!website) throw new Error('Website no longer exists or is not accessible.');

  const crawlData = await crawlerService.crawlWebsite(website.url);
  if (!crawlData.pagesCount) throw new Error('The crawler could not fetch any HTML pages from this website.');
  const rawIssues = await crawlerService.analyzeTechnical(crawlData);
  const technicalIssues = Array.isArray(rawIssues) ? rawIssues : [];
  const rawKeywords = await keywordService.researchForWebsite(website.url, website.industry, crawlData.content);
  const keywords = Array.isArray(rawKeywords) ? rawKeywords : [];
  const aiAnalysis = await aiService.analyzeWebsiteForSEO({
    website, crawlData, keywords: keywords.slice(0, 20), technicalIssues,
  });
  const pageRecs = await aiService.generatePageRecommendations({
    website, pages: crawlData.pages?.slice(0, 10) || [], keywords: keywords.slice(0, 10),
  });
  const score = calculateScore(technicalIssues, crawlData);

  for (const kw of keywords.slice(0, 100)) {
    await query(
      `INSERT INTO keywords (id,website_id,user_id,keyword,search_volume,difficulty,cpc,intent,priority,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       ON CONFLICT (website_id,keyword) DO UPDATE SET
         search_volume=EXCLUDED.search_volume,difficulty=EXCLUDED.difficulty,
         cpc=EXCLUDED.cpc,intent=EXCLUDED.intent,priority=EXCLUDED.priority,updated_at=NOW()`,
      [uuidv4(), job.website_id, job.user_id, kw.keyword, kw.searchVolume || 0,
        kw.difficulty || 50, kw.cpc || 0, kw.intent || 'informational', kw.priority || 0]
    );
  }
  await query(
    `UPDATE audits SET status='complete',overall_score=$1,pages_crawled=$2,issues_found=$3,
     keywords_found_count=$4,crawl_data=$5,technical_issues=$6,keywords_found=$7,
     ai_analysis=$8,page_recommendations=$9,completed_at=NOW(),error=NULL WHERE id=$10`,
    [score, crawlData.pagesCount || crawlData.totalPages || 0, technicalIssues.length, keywords.length,
      JSON.stringify(crawlData), JSON.stringify(technicalIssues), JSON.stringify(keywords),
      JSON.stringify(aiAnalysis), JSON.stringify(pageRecs), job.audit_id]
  );
  await query('UPDATE websites SET last_audit_at=NOW(),last_score=$1 WHERE id=$2', [score, job.website_id]);
  await incrementUsage(job.user_id, 'audit');
};

const processNextAudit = async () => {
  if (busy) return;
  busy = true;
  try {
    // Requeue work abandoned by a process crash. Audits should normally finish well before 20 minutes.
    await query(
      `UPDATE audit_jobs SET status='pending',locked_at=NULL,locked_by=NULL,available_at=NOW(),updated_at=NOW()
       WHERE status='running' AND locked_at < NOW() - INTERVAL '20 minutes' AND attempts < 3`
    );
    await query(
      `WITH expired AS (
         UPDATE audit_jobs SET status='failed',locked_at=NULL,locked_by=NULL,
           last_error=COALESCE(last_error,'Audit worker timed out after maximum attempts'),updated_at=NOW()
         WHERE status='running' AND locked_at < NOW() - INTERVAL '20 minutes' AND attempts >= 3
         RETURNING audit_id,last_error
       )
       UPDATE audits a SET status='failed',error=e.last_error
       FROM expired e WHERE a.id=e.audit_id`
    );
    const job = await queryOne(
      `UPDATE audit_jobs
       SET status='running',attempts=attempts+1,locked_at=NOW(),locked_by=$1,updated_at=NOW()
       WHERE id=(
         SELECT id FROM audit_jobs
         WHERE status='pending' AND available_at<=NOW()
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED LIMIT 1
       )
       RETURNING *`,
      [workerId]
    );
    if (!job) return;

    try {
      await processJob(job);
      await query(
        `UPDATE audit_jobs SET status='complete',locked_at=NULL,locked_by=NULL,last_error=NULL,updated_at=NOW() WHERE id=$1`,
        [job.id]
      );
    } catch (err) {
      const message = String(err?.message || 'Audit failed').slice(0, 1000);
      console.error('Audit job failed:', job.audit_id, message);
      if (job.attempts < 3) {
        await query(
          `UPDATE audit_jobs SET status='pending',available_at=NOW() + ($2 * INTERVAL '1 minute'),
           locked_at=NULL,locked_by=NULL,last_error=$3,updated_at=NOW() WHERE id=$1`,
          [job.id, job.attempts, message]
        );
      } else {
        await query(
          `UPDATE audit_jobs SET status='failed',locked_at=NULL,locked_by=NULL,last_error=$2,updated_at=NOW() WHERE id=$1`,
          [job.id, message]
        );
        await query("UPDATE audits SET status='failed',error=$1 WHERE id=$2", [message, job.audit_id]);
      }
    }
  } catch (err) {
    console.error('Audit worker error:', err.message);
  } finally {
    busy = false;
  }
};

const startAuditWorker = () => {
  if (timer) return;
  timer = setInterval(() => { processNextAudit(); }, 2000);
  if (typeof timer.unref === 'function') timer.unref();
  processNextAudit();
  console.log('Durable audit worker started.');
};

module.exports = { startAuditWorker, processNextAudit };

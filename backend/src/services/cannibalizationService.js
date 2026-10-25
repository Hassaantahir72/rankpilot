/**
 * Feature 14: Keyword Cannibalization Detector
 * Finds pages competing for the same keyword — hurts rankings
 */

const cheerio = require('cheerio');
const safeHttp = require('./safeHttpService');
const { groq, parseJSON } = require('./aiHelpers');

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; RankPilotBot/1.0)' };

// ── DETECT CANNIBALIZATION ────────────────────────────────────────
const detectCannibalization = async (websiteUrl, keywords = []) => {
  console.log(`Detecting keyword cannibalization for ${websiteUrl}...`);

  // Crawl pages
  const pages = await crawlPages(websiteUrl, 25);
  if (pages.length < 2) return { issues: [], pages: [], summary: { total: 0 } };

  const issues = [];
  const checkedPairs = new Set();

  for (const page1 of pages) {
    for (const page2 of pages) {
      if (page1.url === page2.url) continue;
      const pairKey = [page1.url, page2.url].sort().join('|');
      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);

      // Find shared keywords
      const shared = findSharedKeywords(page1, page2);
      if (shared.length >= 2) {
        const similarity = calculateSimilarity(page1, page2);
        issues.push({
          severity: shared.length >= 4 ? 'critical' : shared.length >= 2 ? 'high' : 'medium',
          pages: [
            { url: page1.url, title: page1.title, h1: page1.h1 },
            { url: page2.url, title: page2.title, h1: page2.h1 },
          ],
          sharedKeywords: shared.slice(0, 8),
          contentSimilarity: similarity,
          problem: `These two pages both target "${shared[0]}" and are competing against each other in Google. Instead of one page ranking well, you have two pages splitting traffic.`,
          fix: getCannibalizationFix(page1, page2, shared),
          estimatedImpact: 'Fixing this could increase rankings by 20-40% for the target keyword',
        });
      }
    }
  }

  // Sort by severity
  const order = { critical: 0, high: 1, medium: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  // Also check if keywords from DB are targeting same pages
  const keywordIssues = findKeywordConflicts(keywords);

  return {
    pagesAnalyzed: pages.length,
    issues: issues.slice(0, 20),
    keywordConflicts: keywordIssues,
    summary: {
      total: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      estimatedTrafficLoss: issues.length > 0 ? `Cannibalization may be costing you ${issues.length * 15}-${issues.length * 30}% of potential organic traffic` : null,
    },
    recommendations: generateRecommendations(issues),
  };
};

const crawlPages = async (baseUrl, maxPages = 25) => {
  const safeBaseUrl = await safeHttp.validatePublicUrl(baseUrl);
  const origin = new URL(safeBaseUrl).origin;
  const visited = new Set();
  const queue = [safeBaseUrl];
  const pages = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const { data } = await safeHttp.fetchPublicUrl(url, { userAgent: HEADERS['User-Agent'], timeout: 10000, maxBytes: 2 * 1024 * 1024 });
      const $ = cheerio.load(data);

      const bodyText = $('body').text().replace(/\s+/g,' ').trim();
      const words = bodyText.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const freq = {};
      const stopWords = new Set(['about','these','those','their','there','which','where','would','could','should','other','after','before','first','being','since','every','between']);
      words.filter(w => !stopWords.has(w)).forEach(w => { freq[w] = (freq[w]||0)+1; });
      const topKeywords = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,30).map(([w])=>w);

      pages.push({
        url,
        title: $('title').text().trim(),
        h1:    $('h1').first().text().trim(),
        h2s:   $('h2').map((_,el)=>$(el).text().trim()).get().slice(0,5),
        topKeywords,
        metaKeywords: $('meta[name="keywords"]').attr('content') || '',
      });

      $('a[href]').each((_,el) => {
        const href = $(el).attr('href');
        if (!href) return;
        try {
          const full = new URL(href, url).toString();
          const p = new URL(full);
          if (p.origin === origin && !visited.has(full) && !queue.includes(full) && !full.match(/\.(pdf|jpg|png|gif|zip|css|js)$/i)) {
            queue.push(full);
          }
        } catch {}
      });
      await new Promise(r => setTimeout(r, 400));
    } catch {}
  }
  return pages;
};

const findSharedKeywords = (p1, p2) => {
  const s1 = new Set(p1.topKeywords);
  return p2.topKeywords.filter(k => s1.has(k) && k.length > 5);
};

const calculateSimilarity = (p1, p2) => {
  const s1 = new Set(p1.topKeywords);
  const s2 = new Set(p2.topKeywords);
  const intersection = p1.topKeywords.filter(k => s2.has(k)).length;
  const union = new Set([...p1.topKeywords, ...p2.topKeywords]).size;
  return Math.round((intersection / union) * 100);
};

const getCannibalizationFix = (p1, p2, sharedKeywords) => {
  const kw = sharedKeywords[0];
  return {
    option1: {
      action: 'Consolidate pages',
      detail: `Merge "${p2.title}" into "${p1.title}". Redirect ${p2.url} → ${p1.url}. Choose the stronger page (more content, better rankings) as the primary.`,
    },
    option2: {
      action: 'Differentiate content',
      detail: `Keep both pages but make them target DIFFERENT keywords. "${p1.title}" focuses on "${kw}", "${p2.title}" focuses on a different related term.`,
    },
    option3: {
      action: 'Add canonical tag',
      detail: `Add <link rel="canonical" href="${p1.url}"> to "${p2.url}" to tell Google which page is the primary one.`,
    },
    recommended: 'option1',
    effort: 'medium',
  };
};

const findKeywordConflicts = (keywords = []) => {
  const conflicts = [];
  const keywordPageMap = {};
  keywords.forEach(kw => {
    const key = kw.keyword?.toLowerCase();
    if (!key) return;
    if (!keywordPageMap[key]) keywordPageMap[key] = [];
    if (kw.url) keywordPageMap[key].push(kw.url);
  });
  Object.entries(keywordPageMap).forEach(([kw, pages]) => {
    if (pages.length > 1) conflicts.push({ keyword: kw, pages, issue: `"${kw}" is being targeted by ${pages.length} different pages` });
  });
  return conflicts;
};

const generateRecommendations = (issues) => {
  if (issues.length === 0) return ['No cannibalization detected — great SEO hygiene!'];
  const recs = [];
  const critical = issues.filter(i => i.severity === 'critical');
  if (critical.length > 0) recs.push(`Fix ${critical.length} critical cannibalization ${critical.length === 1 ? 'issue' : 'issues'} first — these are hurting your rankings the most`);
  recs.push('For each conflicting pair, decide: merge the pages or differentiate them to target different keywords');
  recs.push('After fixing, submit updated URLs to Google Search Console for re-indexing');
  recs.push('Going forward, create a keyword map so each keyword is only targeted by ONE page');
  return recs;
};

module.exports = { detectCannibalization };

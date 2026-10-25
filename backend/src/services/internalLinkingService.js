/**
 * Feature 13: Internal Linking Optimizer
 * Finds opportunities to link between your pages using target keywords as anchor text
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { groq, parseJSON } = require('./aiHelpers');

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; RankPilotBot/1.0)' };

// ── CRAWL ALL PAGES ───────────────────────────────────────────────
const crawlAllPages = async (baseUrl, maxPages = 20) => {
  const visited = new Set();
  const queue = [baseUrl];
  const pages = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
      const $ = cheerio.load(data);

      const title = $('title').text().trim();
      const h1 = $('h1').first().text().trim();
      const h2s = $('h2').map((_, el) => $(el).text().trim()).get().slice(0, 5);
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
      const wordCount = bodyText.split(' ').length;

      // Extract existing internal links on this page
      const existingLinks = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href && (href.startsWith('/') || href.startsWith(baseUrl)) && text) {
          const fullUrl = href.startsWith('/') ? baseUrl + href : href;
          existingLinks.push({ url: fullUrl, anchorText: text });
        }
      });

      // Extract keywords from content
      const words = bodyText.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const freq = {};
      words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
      const topWords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([w]) => w);

      pages.push({ url, title, h1, h2s, wordCount, existingLinks, topKeywords: topWords, content: bodyText.slice(0, 3000) });

      // Find new links to crawl
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        try {
          const full = href.startsWith('/') ? baseUrl + href : href;
          const parsed = new URL(full);
          if (parsed.origin === new URL(baseUrl).origin && !visited.has(full) && !queue.includes(full)) {
            if (!full.match(/\.(pdf|jpg|png|gif|zip|css|js)$/i)) queue.push(full);
          }
        } catch {}
      });

      await new Promise(r => setTimeout(r, 500));
    } catch {}
  }

  return pages;
};

// ── FIND LINKING OPPORTUNITIES ────────────────────────────────────
const findLinkingOpportunities = async (websiteUrl, keywords = []) => {
  console.log(`Finding internal linking opportunities for ${websiteUrl}...`);

  const pages = await crawlAllPages(websiteUrl);
  if (pages.length < 2) return { pages: [], opportunities: [], summary: { total: 0 } };

  const opportunities = [];

  for (const sourcePage of pages) {
    for (const targetPage of pages) {
      if (sourcePage.url === targetPage.url) continue;

      // Check if source page already links to target
      const alreadyLinked = sourcePage.existingLinks.some(l => l.url === targetPage.url);
      if (alreadyLinked) continue;

      // Find keyword matches — does source page content mention keywords from target page?
      const targetKeywords = [...targetPage.topKeywords, ...(targetPage.h1 ? targetPage.h1.toLowerCase().split(' ') : [])];
      const matches = targetKeywords.filter(kw => kw.length > 4 && sourcePage.content.toLowerCase().includes(kw));

      if (matches.length >= 2) {
        // Find the best anchor text (longest matching phrase)
        const bestAnchor = findBestAnchorText(sourcePage.content, targetPage.h1 || targetPage.title);

        opportunities.push({
          sourcePage: { url: sourcePage.url, title: sourcePage.title || sourcePage.url },
          targetPage: { url: targetPage.url, title: targetPage.title || targetPage.url },
          suggestedAnchorText: bestAnchor || matches[0],
          matchCount: matches.length,
          reason: `"${sourcePage.title}" mentions keywords from "${targetPage.title}" — add a contextual link`,
          priority: matches.length >= 4 ? 'high' : matches.length >= 2 ? 'medium' : 'low',
          implementation: `Find the phrase "${bestAnchor || matches[0]}" in your "${sourcePage.title}" page and wrap it with a link to ${targetPage.url}`,
        });
      }
    }
  }

  // Sort by priority and match count
  opportunities.sort((a, b) => b.matchCount - a.matchCount);

  // Also use AI to find more sophisticated opportunities
  let aiOpportunities = [];
  if (pages.length >= 3 && process.env.GROQ_API_KEY) {
    try {
      const pageList = pages.slice(0, 8).map(p => `- ${p.title || p.url}: targets "${p.h1 || p.topKeywords[0]}"`).join('\n');
      const prompt = `These are web pages from ${websiteUrl}:\n${pageList}\n\nSuggest 5 internal linking opportunities that would help SEO. Return JSON array: [{"from":"page title","to":"page title","anchorText":"suggested anchor text","reason":"why this link helps SEO"}]`;
      const raw = await groq(prompt, 'You are an SEO expert. Return valid JSON array only.', 600);
      aiOpportunities = parseJSON(raw) || [];
    } catch {}
  }

  return {
    pagesAnalyzed: pages.length,
    opportunities: opportunities.slice(0, 30),
    aiSuggestions: aiOpportunities,
    summary: {
      total: opportunities.length,
      high: opportunities.filter(o => o.priority === 'high').length,
      medium: opportunities.filter(o => o.priority === 'medium').length,
      estimatedSEOGain: 'Internal linking improvements typically increase page authority by 10-25%',
    },
    pages: pages.map(p => ({ url: p.url, title: p.title, existingInternalLinks: p.existingLinks.length, wordCount: p.wordCount })),
  };
};

const findBestAnchorText = (content, targetHeading) => {
  if (!targetHeading) return null;
  const words = targetHeading.toLowerCase().split(' ').filter(w => w.length > 3);
  const contentLower = content.toLowerCase();
  for (let len = words.length; len >= 2; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(' ');
      if (contentLower.includes(phrase)) return phrase;
    }
  }
  return words[0] || null;
};

module.exports = { findLinkingOpportunities, crawlAllPages };

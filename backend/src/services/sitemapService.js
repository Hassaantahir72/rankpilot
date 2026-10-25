/**
 * Feature 15: XML Sitemap Auto-Generator & Submitter
 * Crawls website, generates proper XML sitemap, submits to Google
 */

const cheerio = require('cheerio');
const safeHttp = require('./safeHttpService');
const { queryOne } = require('../config/db');

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; RankPilotBot/1.0)' };

// ── CRAWL AND BUILD URL LIST ──────────────────────────────────────
const crawlForSitemap = async (baseUrl, maxPages = 200) => {
  const validatedBaseUrl = await safeHttp.validatePublicUrl(baseUrl);
  const urlObj = new URL(validatedBaseUrl);
  const origin = urlObj.origin;
  const visited = new Set();
  const queue = [origin + '/'];
  const urls = [];

  // Page priority rules
  const getPriority = (url) => {
    if (url === origin + '/' || url === origin) return '1.0';
    if (url.match(/\/(services?|products?|about|contact|pricing)/i)) return '0.8';
    if (url.match(/\/(blog|news|articles?)/i)) return '0.7';
    return '0.5';
  };

  const getChangeFreq = (url) => {
    if (url === origin + '/' || url === origin) return 'weekly';
    if (url.match(/\/(blog|news|articles?)/i)) return 'weekly';
    if (url.match(/\/(services?|products?)/i)) return 'monthly';
    return 'monthly';
  };

  while (queue.length > 0 && urls.length < maxPages) {
    const url = queue.shift();
    const cleanUrl = url.split('#')[0].split('?')[0];
    if (visited.has(cleanUrl)) continue;
    visited.add(cleanUrl);

    // Skip non-HTML resources
    if (cleanUrl.match(/\.(jpg|jpeg|png|gif|svg|pdf|zip|css|js|ico|xml|txt|woff|woff2|ttf)$/i)) continue;

    try {
      const { data, headers, status } = await safeHttp.fetchPublicUrl(cleanUrl, { userAgent: HEADERS['User-Agent'], timeout: 10000, maxBytes: 2 * 1024 * 1024 });
      if (status !== 200) continue;
      if (!headers['content-type']?.includes('html')) continue;

      const $ = cheerio.load(data);

      // Skip noindex pages
      const robotsMeta = $('meta[name="robots"]').attr('content') || '';
      if (robotsMeta.includes('noindex')) continue;

      // Get canonical
      const canonical = $('link[rel="canonical"]').attr('href');
      const finalUrl = canonical || cleanUrl;

      // Get last modified
      const lastmod = headers['last-modified']
        ? new Date(headers['last-modified']).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      urls.push({
        url: finalUrl,
        lastmod,
        changefreq: getChangeFreq(finalUrl),
        priority: getPriority(finalUrl),
      });

      // Find more links
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        try {
          const full = href.startsWith('/') ? origin + href : href;
          const p = new URL(full);
          if (p.origin === origin && !visited.has(full) && !queue.includes(full)) {
            queue.push(full);
          }
        } catch {}
      });

      await new Promise(r => setTimeout(r, 300));
    } catch {}
  }

  return urls;
};

// ── GENERATE XML SITEMAP ──────────────────────────────────────────
const generateSitemapXML = (urls) => {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9',
    '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">',
  ];

  // Sort: homepage first, then by priority desc
  const sorted = [...urls].sort((a, b) => parseFloat(b.priority) - parseFloat(a.priority));

  for (const url of sorted) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXML(url.url)}</loc>`);
    lines.push(`    <lastmod>${url.lastmod}</lastmod>`);
    lines.push(`    <changefreq>${url.changefreq}</changefreq>`);
    lines.push(`    <priority>${url.priority}</priority>`);
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  return lines.join('\n');
};

const escapeXML = (str) => str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');

// ── GENERATE IMAGE SITEMAP ────────────────────────────────────────
const generateImageSitemap = (urls, images = []) => {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ];
  for (const img of images.slice(0, 50)) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXML(img.pageUrl)}</loc>`);
    lines.push('    <image:image>');
    lines.push(`      <image:loc>${escapeXML(img.imageUrl)}</image:loc>`);
    if (img.caption) lines.push(`      <image:caption>${escapeXML(img.caption)}</image:caption>`);
    lines.push('    </image:image>');
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  return lines.join('\n');
};

// ── SUBMIT TO GOOGLE SEARCH CONSOLE ──────────────────────────────
const submitToGoogle = async (userId, siteUrl, sitemapUrl) => {
  try {
    const { getUserGSCToken } = require('./googleSearchConsole');
    const accessToken = await getUserGSCToken(userId);
    const encodedSite = encodeURIComponent(siteUrl);
    const encodedSitemap = encodeURIComponent(sitemapUrl);
    await axios.put(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedSitemap}`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15000 }
    );
    return { success: true, message: `Sitemap submitted to Google Search Console: ${sitemapUrl}` };
  } catch (err) {
    return { success: false, error: err.response?.data?.error?.message || err.message };
  }
};

// ── SUBMIT TO BING ────────────────────────────────────────────────
const submitToBing = async (sitemapUrl) => {
  try {
    await axios.get(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, { timeout: 10000 });
    return { success: true, message: 'Sitemap pinged to Bing' };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ── FULL SITEMAP ANALYSIS & GENERATION ───────────────────────────
const analyzeSitemap = async (websiteUrl) => {
  console.log(`Generating sitemap for ${websiteUrl}...`);

  // First check if existing sitemap exists
  const existingSitemap = await checkExistingSitemap(websiteUrl);

  // Crawl and generate
  const urls = await crawlForSitemap(websiteUrl);
  const xml = generateSitemapXML(urls);

  const issues = [];
  if (!existingSitemap.exists) issues.push({ severity: 'critical', issue: 'No sitemap.xml found', fix: 'Download and upload the generated sitemap below to your website root' });
  if (urls.length === 0) issues.push({ severity: 'critical', issue: 'No pages found to index', fix: 'Check if your site is accessible and not blocking crawlers' });
  if (urls.some(u => !u.url.startsWith('https'))) issues.push({ severity: 'warning', issue: 'Some URLs use HTTP not HTTPS', fix: 'Ensure all URLs redirect to HTTPS and update the sitemap' });

  return {
    urlCount:        urls.length,
    generatedXML:    xml,
    existingSitemap,
    urls,
    issues,
    instructions: [
      `1. Download the generated sitemap.xml file`,
      `2. Upload it to your website root: ${websiteUrl}/sitemap.xml`,
      `3. Connect Google Search Console in Settings, then click "Submit to Google" below`,
      `4. In Google Search Console, go to Sitemaps → Add new sitemap → Enter: ${websiteUrl}/sitemap.xml`,
      `5. Check back in 24-48 hours to see how many URLs Google has indexed`,
    ],
  };
};

const checkExistingSitemap = async (baseUrl) => {
  const urls = [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap_index.xml`];
  for (const url of urls) {
    try {
      const res = await axios.get(url, { timeout: 8000, headers: HEADERS });
      if (res.status === 200) {
        const urlMatches = (res.data.match(/<loc>/g) || []).length;
        return { exists: true, url, urlCount: urlMatches };
      }
    } catch {}
  }
  return { exists: false };
};

module.exports = { analyzeSitemap, generateSitemapXML, crawlForSitemap, submitToGoogle, submitToBing };

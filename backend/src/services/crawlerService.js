/**
 * Real Website Crawler
 * Crawls actual pages, checks real technical SEO issues
 * Uses: axios + cheerio (no paid API needed)
 */

const axios = require('axios');
const cheerio = require('cheerio');

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; RankPilotBot/1.0; +https://rankpilot.ai/bot)',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
};

// ── FETCH SINGLE PAGE ─────────────────────────────────────────────
const fetchPage = async (url, timeout = 15000) => {
  try {
    const start = Date.now();
    const res = await axios.get(url, {
      headers: DEFAULT_HEADERS,
      timeout,
      maxRedirects: 5,
      validateStatus: s => s < 500,
    });
    const loadTime = Date.now() - start;
    const $ = cheerio.load(res.data);

    // Extract all data from page
    const title = $('title').first().text().trim();
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const h1 = $('h1').first().text().trim();
    const h2s = $('h2').map((_, el) => $(el).text().trim()).get().slice(0, 5);
    const canonical = $('link[rel="canonical"]').attr('href') || '';
    const robots = $('meta[name="robots"]').attr('content') || '';
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';
    const hasSchema = $('script[type="application/ld+json"]').length > 0;
    const imgCount = $('img').length;
    const imgNoAlt = $('img:not([alt]), img[alt=""]').length;
    const wordCount = $('body').text().replace(/\s+/g, ' ').trim().split(' ').filter(w => w.length > 2).length;
    const content = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);

    // Get all internal links for crawling
    const links = [];
    const baseUrl = new URL(url).origin;
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      try {
        const absolute = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? href : '/' + href}`;
        const parsed = new URL(absolute);
        if (parsed.origin === baseUrl && !absolute.includes('#') && !absolute.match(/\.(pdf|jpg|png|gif|zip|css|js)$/i)) {
          links.push(absolute);
        }
      } catch {}
    });

    return {
      url,
      statusCode: res.status,
      title,
      metaDescription: metaDesc,
      h1,
      h2s,
      canonical,
      robots,
      ogTitle,
      ogDesc,
      hasSchema,
      imgCount,
      imgNoAlt,
      wordCount,
      content,
      loadTime,
      links: [...new Set(links)].slice(0, 50),
      contentType: res.headers['content-type'] || '',
      size: JSON.stringify(res.data).length,
    };
  } catch (err) {
    return { url, error: err.message, statusCode: err.response?.status || 0, links: [] };
  }
};

// ── CHECK SSL ─────────────────────────────────────────────────────
const checkSSL = (url) => url.startsWith('https://');

// ── CHECK SITEMAP ─────────────────────────────────────────────────
const checkSitemap = async (baseUrl) => {
  const paths = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap/sitemap.xml'];
  for (const path of paths) {
    try {
      const res = await axios.get(`${baseUrl}${path}`, { timeout: 8000, headers: DEFAULT_HEADERS });
      if (res.status === 200 && (res.data.includes('<sitemap') || res.data.includes('<url'))) {
        return { exists: true, url: `${baseUrl}${path}` };
      }
    } catch {}
  }
  return { exists: false };
};

// ── CHECK ROBOTS.TXT ─────────────────────────────────────────────
const checkRobots = async (baseUrl) => {
  try {
    const res = await axios.get(`${baseUrl}/robots.txt`, { timeout: 5000, headers: DEFAULT_HEADERS });
    return { exists: res.status === 200, content: res.data?.slice(0, 500) || '' };
  } catch {
    return { exists: false, content: '' };
  }
};

// ── GOOGLE PAGESPEED API (free, 25,000 calls/day) ─────────────────
const getPageSpeed = async (url) => {
  try {
    const apiKey = process.env.GOOGLE_PAGESPEED_KEY || '';
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile${apiKey ? `&key=${apiKey}` : ''}`;
    const { data } = await axios.get(apiUrl, { timeout: 30000 });
    const cats = data.lighthouseResult?.categories || {};
    return {
      performance:    Math.round((cats.performance?.score || 0) * 100),
      seo:            Math.round((cats.seo?.score || 0) * 100),
      accessibility:  Math.round((cats.accessibility?.score || 0) * 100),
      bestPractices:  Math.round((cats['best-practices']?.score || 0) * 100),
      fcp:  data.lighthouseResult?.audits?.['first-contentful-paint']?.displayValue || 'N/A',
      lcp:  data.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue || 'N/A',
      cls:  data.lighthouseResult?.audits?.['cumulative-layout-shift']?.displayValue || 'N/A',
      tbt:  data.lighthouseResult?.audits?.['total-blocking-time']?.displayValue || 'N/A',
    };
  } catch (err) {
    console.error('PageSpeed error:', err.message);
    return null;
  }
};

// ── MAIN CRAWLER ──────────────────────────────────────────────────
const crawlWebsite = async (url, maxPages = 30) => {
  console.log(`Crawling: ${url}`);

  // Normalize URL
  if (!url.startsWith('http')) url = `https://${url}`;
  const baseUrl = new URL(url).origin;

  const visited = new Set();
  const queue = [url];
  const pages = [];
  let totalLoadTime = 0;

  // Crawl pages
  while (queue.length > 0 && pages.length < maxPages) {
    const pageUrl = queue.shift();
    if (visited.has(pageUrl)) continue;
    visited.add(pageUrl);

    const page = await fetchPage(pageUrl);
    if (!page.error) {
      pages.push(page);
      totalLoadTime += page.loadTime || 0;
      // Add new links to queue
      page.links.forEach(link => {
        if (!visited.has(link) && !queue.includes(link)) queue.push(link);
      });
    }
    await new Promise(r => setTimeout(r, 500)); // polite crawl delay
  }

  // Parallel checks
  const [sitemap, robots, pageSpeed] = await Promise.all([
    checkSitemap(baseUrl),
    checkRobots(baseUrl),
    getPageSpeed(url),
  ]);

  const homepage = pages[0] || {};
  const allContent = pages.map(p => p.content || '').join(' ').slice(0, 10000);

  return {
    url,
    baseUrl,
    totalPages: pages.length,
    pagesCount: pages.length,
    pages,
    content: allContent,
    hasSSL:       checkSSL(url),
    hasSitemap:   sitemap.exists,
    sitemapUrl:   sitemap.url || null,
    hasRobots:    robots.exists,
    robotsContent: robots.content,
    pageSpeedData: pageSpeed,
    avgLoadTime:  pages.length ? Math.round(totalLoadTime / pages.length) : 0,
    homepage: {
      title:           homepage.title || '',
      metaDescription: homepage.metaDescription || '',
      h1:              homepage.h1 || '',
      hasSchema:       homepage.hasSchema || false,
      wordCount:       homepage.wordCount || 0,
      canonical:       homepage.canonical || '',
    },
    totalImages:   pages.reduce((s, p) => s + (p.imgCount || 0), 0),
    imagesNoAlt:   pages.reduce((s, p) => s + (p.imgNoAlt || 0), 0),
    avgWordCount:  pages.length ? Math.round(pages.reduce((s, p) => s + (p.wordCount || 0), 0) / pages.length) : 0,
    thinPages:     pages.filter(p => p.wordCount < 300).length,
    noTitlePages:  pages.filter(p => !p.title).length,
    noDescPages:   pages.filter(p => !p.metaDescription).length,
    noH1Pages:     pages.filter(p => !p.h1).length,
  };
};

// ── TECHNICAL ANALYSIS ────────────────────────────────────────────
const analyzeTechnical = async (crawlData) => {
  const issues = [];
  const { pages = [], homepage = {} } = crawlData;

  const add = (severity, title, description, fix, page = null) => {
    issues.push({ severity, title, description, fix, page });
  };

  // SSL
  if (!crawlData.hasSSL) add('critical', 'No HTTPS/SSL certificate', 'Your site uses HTTP not HTTPS. Google penalises non-HTTPS sites.', 'Install an SSL certificate. Most hosts offer free Let\'s Encrypt SSL.');

  // Sitemap
  if (!crawlData.hasSitemap) add('warning', 'No XML sitemap found', 'Google needs a sitemap to discover and index all your pages.', 'Generate a sitemap.xml and submit it to Google Search Console.');

  // Robots.txt
  if (!crawlData.hasRobots) add('warning', 'No robots.txt found', 'Missing robots.txt can cause crawl issues.', 'Create a robots.txt file at your domain root.');

  // Homepage title
  if (!homepage.title) add('critical', 'Missing page title on homepage', 'The homepage has no title tag. This is critical for SEO.', 'Add a descriptive title tag under 60 characters.');
  else if (homepage.title.length > 60) add('warning', `Title too long (${homepage.title.length} chars)`, `"${homepage.title.slice(0,50)}..." — Google truncates titles over 60 chars.`, 'Shorten your title tag to under 60 characters.');
  else if (homepage.title.length < 20) add('warning', 'Title too short', `"${homepage.title}" is too short to be descriptive.`, 'Expand your title to include your main keyword and business name.');

  // Meta description
  if (!homepage.metaDescription) add('warning', 'Missing meta description on homepage', 'No meta description found. This reduces click-through rates from search results.', 'Add a compelling meta description under 155 characters that includes your main keyword.');
  else if (homepage.metaDescription.length > 155) add('warning', `Meta description too long (${homepage.metaDescription.length} chars)`, 'Google truncates descriptions over 155 chars.', 'Shorten your meta description to under 155 characters.');

  // H1
  if (!homepage.h1) add('critical', 'Missing H1 heading on homepage', 'No H1 found on homepage. H1 tells Google what your page is about.', 'Add exactly one H1 heading containing your main keyword.');

  // Schema
  if (!homepage.hasSchema) add('warning', 'No structured data (Schema.org)', 'Adding schema markup helps Google understand your business and can generate rich snippets.', 'Add LocalBusiness or Organization schema to your homepage.');

  // Images
  if (crawlData.imagesNoAlt > 0) add('warning', `${crawlData.imagesNoAlt} images missing alt text`, 'Images without alt text are invisible to search engines and hurt accessibility.', 'Add descriptive alt text to all images, including your target keyword where relevant.');

  // Page speed
  if (crawlData.pageSpeedData) {
    const ps = crawlData.pageSpeedData;
    if (ps.performance < 50) add('critical', `Poor page speed score (${ps.performance}/100)`, `Your site scores ${ps.performance}/100 on Google PageSpeed. Slow sites rank lower.`, `Optimise images, enable caching, use a CDN. LCP: ${ps.lcp}, CLS: ${ps.cls}`);
    else if (ps.performance < 70) add('warning', `Page speed needs improvement (${ps.performance}/100)`, `Target 90+ for best rankings. Current: ${ps.performance}/100.`, 'Compress images, minify CSS/JS, enable browser caching.');

    if (ps.seo < 80) add('warning', `Google SEO score: ${ps.seo}/100`, 'Google\'s own SEO checker found issues on your site.', 'Review Google Search Console for specific SEO recommendations.');
  }

  // Thin content
  if (crawlData.thinPages > 0) add('warning', `${crawlData.thinPages} pages with thin content (under 300 words)`, 'Pages with very little content rank poorly. Google wants comprehensive pages.', 'Expand thin pages to at least 500 words with useful, relevant content.');

  // Pages without titles
  if (crawlData.noTitlePages > 0) add('critical', `${crawlData.noTitlePages} pages missing title tags`, 'Multiple pages have no title tag.', 'Add unique, keyword-rich title tags to every page.');

  // Pages without meta descriptions
  if (crawlData.noDescPages > 0) add('warning', `${crawlData.noDescPages} pages missing meta descriptions`, 'Multiple pages have no meta description.', 'Add unique meta descriptions to every page to improve click-through rates.');

  // Pages without H1
  if (crawlData.noH1Pages > 0) add('warning', `${crawlData.noH1Pages} pages missing H1 headings`, 'Multiple pages have no H1.', 'Add exactly one H1 to each page with the target keyword for that page.');

  // Canonical
  if (!homepage.canonical) add('info', 'No canonical tag on homepage', 'Canonical tags prevent duplicate content issues.', 'Add <link rel="canonical"> tags to all pages.');

  // Sort: critical → warning → info
  const order = { critical: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => order[a.severity] - order[b.severity]);
};

module.exports = { crawlWebsite, fetchPage, checkSSL, checkSitemap, checkRobots, getPageSpeed, analyzeTechnical };

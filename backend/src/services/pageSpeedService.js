const axios = require('axios');
const safeHttp = require('./safeHttpService');
const analyzePageSpeed = async (url) => {
  url = await safeHttp.validatePublicUrl(url);
  const results = {};
  for (const strategy of ['mobile','desktop']) {
    try {
      const key = process.env.GOOGLE_PAGESPEED_KEY?`&key=${process.env.GOOGLE_PAGESPEED_KEY}`:'';
      const {data} = await axios.get(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}${key}`,{timeout:45000});
      const cats=data.lighthouseResult?.categories||{};
      const audits=data.lighthouseResult?.audits||{};
      const opportunities=[];
      for (const [id,audit] of Object.entries(audits)) {
        if(!audit.title||audit.score===null)continue;
        if(audit.score<0.9&&audit.details?.type==='opportunity') {
          opportunities.push({id,title:audit.title,description:(audit.description||'').replace(/\[.*?\]\(.*?\)/g,'').slice(0,150),score:Math.round((audit.score||0)*100),impact:audit.score<0.5?'high':'medium',fix:getAuditFix(id),savings:audit.details?.overallSavingsMs?`Save ${Math.round(audit.details.overallSavingsMs)}ms`:null});
        }
      }
      results[strategy]={
        scores:{performance:Math.round((cats.performance?.score||0)*100),seo:Math.round((cats.seo?.score||0)*100),accessibility:Math.round((cats.accessibility?.score||0)*100),bestPractices:Math.round((cats['best-practices']?.score||0)*100)},
        coreWebVitals:{
          fcp:{value:audits['first-contentful-paint']?.displayValue||'N/A',score:Math.round((audits['first-contentful-paint']?.score||0)*100),label:'First Contentful Paint'},
          lcp:{value:audits['largest-contentful-paint']?.displayValue||'N/A',score:Math.round((audits['largest-contentful-paint']?.score||0)*100),label:'Largest Contentful Paint'},
          cls:{value:audits['cumulative-layout-shift']?.displayValue||'N/A',score:Math.round((audits['cumulative-layout-shift']?.score||0)*100),label:'Cumulative Layout Shift'},
          tbt:{value:audits['total-blocking-time']?.displayValue||'N/A',score:Math.round((audits['total-blocking-time']?.score||0)*100),label:'Total Blocking Time'},
          ttfb:{value:audits['server-response-time']?.displayValue||'N/A',score:Math.round((audits['server-response-time']?.score||0)*100),label:'Time to First Byte'},
        },
        opportunities:opportunities.sort((a,b)=>a.score-b.score).slice(0,10),
        totalIssues:opportunities.length,
      };
    } catch(err) {
      console.error(`PageSpeed ${strategy} error:`,err.message);
      results[strategy]={scores:{performance:0,seo:0,accessibility:0,bestPractices:0},coreWebVitals:{fcp:{value:'N/A',score:0,label:'First Contentful Paint'},lcp:{value:'N/A',score:0,label:'Largest Contentful Paint'},cls:{value:'N/A',score:0,label:'Cumulative Layout Shift'},tbt:{value:'N/A',score:0,label:'Total Blocking Time'},ttfb:{value:'N/A',score:0,label:'Time to First Byte'}},opportunities:[{id:'error',title:'Could not fetch PageSpeed data',description:`Unable to analyze ${url}`,score:0,impact:'high',fix:'Try again or test manually at pagespeed.web.dev'}],totalIssues:1};
    }
  }
  const grade = getOverallGrade(results.mobile?.scores?.performance||0);
  return {url, mobile:results.mobile, desktop:results.desktop, overallGrade:grade, prioritizedFixes:(results.mobile?.opportunities||[]).filter(o=>o.impact==='high').slice(0,5)};
};
const getAuditFix = (id) => {
  const fixes={'render-blocking-resources':'Move CSS to <head> and JS to bottom. Use async/defer on scripts.','unused-css-rules':'Remove unused CSS. Use PurgeCSS or audit stylesheets manually.','unused-javascript':'Remove unused JavaScript. Audit all plugins and scripts.','uses-optimized-images':'Compress images with TinyPNG. Convert to WebP format.','offscreen-images':'Add loading="lazy" to images below the fold.','server-response-time':'Enable server caching or use a CDN like Cloudflare (free).','uses-long-cache-ttl':'Set cache headers to 1 year for static assets.','unminified-css':'Minify CSS files using an online minifier or build tool.','unminified-javascript':'Minify JavaScript. Most frameworks do this automatically.','uses-text-compression':'Enable gzip/Brotli on your server. Cloudflare does this free.','efficiently-encode-images':'Convert images to WebP. Use TinyPNG for compression.','font-display':'Add font-display: swap to @font-face CSS rules.','document-title':'Add a unique descriptive title tag to every page.','meta-description':'Add a unique meta description to every page.','image-alt':'Add descriptive alt text to all images.'};
  return fixes[id]||'Review this item and apply best practices.';
};
const getOverallGrade = (score) => score>=90?{grade:'A',label:'Excellent',color:'#4ade80'}:score>=70?{grade:'B',label:'Good',color:'#a3e635'}:score>=50?{grade:'C',label:'Needs Work',color:'#fbbf24'}:score>=30?{grade:'D',label:'Poor',color:'#f97316'}:{grade:'F',label:'Critical',color:'#ef4444'};
module.exports = { analyzePageSpeed, getAuditFix, getOverallGrade };

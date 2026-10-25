const axios = require('axios');
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; RankPilotBot/1.0)' };

const getBacklinksFromCDX = async (domain) => {
  try {
    const clean = domain.replace(/https?:\/\/(www\.)?/,'').split('/')[0];
    const url = `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.${clean}&output=json&limit=80&filter=statuscode:200`;
    const { data } = await axios.get(url, { timeout:15000, headers:HEADERS });
    const lines = data.trim().split('\n').filter(Boolean);
    const backlinks = []; const seenDomains = new Set();
    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        const linkDomain = new URL(item.url).hostname.replace(/^www\./,'');
        if (linkDomain !== clean && !seenDomains.has(linkDomain)) {
          seenDomains.add(linkDomain);
          backlinks.push({ domain:linkDomain, url:item.url, lastSeen:item.timestamp, type:'dofollow' });
        }
      } catch {}
    }
    return backlinks.slice(0,50);
  } catch(err) { console.error('CDX error:',err.message); return []; }
};

const estimateDomainAuthority = (domain) => {
  const high = ['google.com','facebook.com','twitter.com','linkedin.com','youtube.com','wikipedia.org','github.com','reddit.com'];
  if (high.some(d=>domain.includes(d))) return 90+Math.floor(Math.random()*10);
  let da = 20;
  if (domain.endsWith('.edu')) da=70; else if (domain.endsWith('.gov')) da=75; else if (domain.endsWith('.org')) da=45; else if (domain.endsWith('.com')) da=30;
  const name = domain.split('.')[0];
  if (name.length<=5) da+=15; else if (name.length<=8) da+=8;
  return Math.min(100,da+Math.floor(Math.random()*15));
};

const assessLinkQuality = (domain) => {
  const toxic = ['casino','poker','gambling','adult','porn','pills','viagra','spam','crack','torrent'];
  if (toxic.some(p=>domain.toLowerCase().includes(p))) return { quality:'toxic', score:1 };
  if (['.edu','.gov','.ac.uk'].some(t=>domain.endsWith(t))) return { quality:'excellent', score:95 };
  return { quality:'good', score:60+Math.floor(Math.random()*30) };
};

const analyzeBacklinks = async (url) => {
  const domain = url.replace(/https?:\/\/(www\.)?/,'').split('/')[0];
  const rawBacklinks = await getBacklinksFromCDX(domain);
  const enriched = rawBacklinks.slice(0,30).map(bl => {
    const da = estimateDomainAuthority(bl.domain);
    const quality = assessLinkQuality(bl.domain);
    return { ...bl, domainAuthority:da, ...quality };
  });
  const domainAuthority = estimateDomainAuthority(domain);
  const toxicCount = enriched.filter(b=>b.quality==='toxic').length;
  const avgDA = enriched.length ? Math.round(enriched.reduce((s,b)=>s+b.domainAuthority,0)/enriched.length) : 0;
  return {
    domain, domainAuthority, totalBacklinks:enriched.length, uniqueDomains:enriched.length,
    toxicLinks:toxicCount, avgReferringDA:avgDA,
    backlinks:enriched.sort((a,b)=>b.domainAuthority-a.domainAuthority),
    summary: {
      health: toxicCount>5?'poor':toxicCount>2?'fair':'good',
      recommendation: toxicCount>3
        ? 'You have toxic backlinks. Use Google Disavow tool to remove them.'
        : enriched.length<10 ? 'You need more backlinks. Focus on local directories and industry sites.'
        : 'Your backlink profile looks healthy. Keep building quality links.',
    },
  };
};

const findBacklinkOpportunities = () => ([
  { name:'Google Business Profile', url:'business.google.com', da:100, free:true, priority:'critical', effort:'easy', description:'Free Google Business listing — critical for local SEO' },
  { name:'Yelp', url:'yelp.com', da:92, free:true, priority:'high', effort:'easy', description:'Major business directory' },
  { name:'Facebook Business', url:'facebook.com/business', da:96, free:true, priority:'high', effort:'easy', description:'Facebook business page' },
  { name:'LinkedIn Company', url:'linkedin.com/company', da:97, free:true, priority:'high', effort:'easy', description:'LinkedIn company profile' },
  { name:'Bing Places', url:'bingplaces.com', da:94, free:true, priority:'high', effort:'easy', description:'Bing local directory' },
  { name:'Apple Maps', url:'mapsconnect.apple.com', da:100, free:true, priority:'high', effort:'easy', description:'Apple Maps business listing' },
  { name:'Trustpilot', url:'trustpilot.com', da:91, free:true, priority:'high', effort:'easy', description:'Review platform' },
  { name:'Foursquare', url:'foursquare.com', da:92, free:true, priority:'medium', effort:'easy', description:'Location-based listing' },
  { name:'Yellow Pages', url:'yellowpages.com', da:86, free:true, priority:'medium', effort:'easy', description:'Business directory' },
  { name:'Chamber of Commerce', url:'chamberofcommerce.com', da:70, free:false, priority:'medium', effort:'medium', description:'Local business association' },
]);

module.exports = { analyzeBacklinks, findBacklinkOpportunities, estimateDomainAuthority };

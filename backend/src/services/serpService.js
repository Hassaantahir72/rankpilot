const axios = require('axios');
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; RankPilotBot/1.0)' };

const googleAutocomplete = async (query) => {
  try {
    const { data } = await axios.get(`http://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`, { timeout:5000, headers:HEADERS });
    return (data[1]||[]).slice(0,10);
  } catch { return []; }
};

const estimateMetrics = (keyword) => {
  const k=keyword.toLowerCase();
  let volume=500,difficulty=50,intent='informational',cpc=1.5;
  if(k.includes('near me')){volume=9000;difficulty=60;intent='transactional';cpc=4.5;}
  else if(k.includes('best ')){volume=4000;difficulty=68;intent='commercial';cpc=3.5;}
  else if(k.includes('cheap')||k.includes('affordable')){volume=2000;difficulty=45;intent='commercial';cpc=2.0;}
  else if(k.includes('how to')||k.includes('what is')){volume=3000;difficulty=35;intent='informational';cpc=0.8;}
  else if(k.includes('price')||k.includes('cost')){volume=3000;difficulty=65;intent='commercial';cpc=4.0;}
  else if(k.includes('buy')||k.includes('hire')||k.includes('book')){volume=2000;difficulty=72;intent='transactional';cpc=5.0;}
  else if(k.includes('free')){volume=5000;difficulty=78;intent='commercial';cpc=0.3;}
  else if(k.split(' ').length<=2){volume=2500;difficulty=72;}
  else if(k.split(' ').length>=5){volume=150;difficulty=18;}
  else if(k.split(' ').length===4){volume=350;difficulty=28;}
  else if(k.split(' ').length===3){volume=800;difficulty=45;}
  const priority=Math.round((volume/100)*(1-difficulty/100)*100);
  return{keyword,search_volume:volume,difficulty,intent,cpc,priority};
};

const checkDomainRank = async (domain,keyword) => {
  if(!process.env.SERP_API_KEY&&!process.env.VALUESERP_API_KEY)return null;
  try{
    const apiKey=process.env.SERP_API_KEY||process.env.VALUESERP_API_KEY;
    const apiUrl=process.env.SERP_API_KEY
      ?`https://serpapi.com/search?api_key=${apiKey}&q=${encodeURIComponent(keyword)}&num=20`
      :`https://api.valueserp.com/search?api_key=${apiKey}&q=${encodeURIComponent(keyword)}&num=20`;
    const {data}=await axios.get(apiUrl,{timeout:15000});
    const results=data.organic_results||[];
    const clean=domain.replace(/https?:\/\/(www\.)?/,'').split('/')[0];
    const found=results.find(r=>r.link?.includes(clean)||r.domain?.includes(clean));
    return found?found.position:null;
  }catch{return null;}
};

const researchKeywords = async (seedKeyword) => {
  const map=new Map();
  const add=(kw)=>{const c=kw.toLowerCase().trim();if(c.length>3&&!map.has(c))map.set(c,estimateMetrics(c));};
  const s=await googleAutocomplete(seedKeyword);
  s.forEach(add);
  const s2=await googleAutocomplete('best '+seedKeyword);
  s2.forEach(add);
  await new Promise(r=>setTimeout(r,300));
  return Array.from(map.values()).sort((a,b)=>b.priority-a.priority).slice(0,100);
};

module.exports = { googleAutocomplete, estimateMetrics, checkDomainRank, researchKeywords };

const { googleAutocomplete, estimateMetrics } = require('./serpService');
const SEEDS = {
  'Restaurant':['restaurant near me','best restaurant','food delivery','dinner near me','takeaway near me'],
  'Dentist':['dentist near me','dental clinic','teeth cleaning','emergency dentist','affordable dental'],
  'Law Firm':['lawyer near me','attorney near me','legal advice','personal injury lawyer','free legal advice'],
  'E-commerce':['buy online','best price','free shipping','online shopping','best deals online'],
  'SaaS / Software':['software tool','automation software','best saas tool','free trial','productivity tool'],
  'Real Estate':['houses for sale near me','real estate agent','property for sale','estate agent near me'],
  'Fitness & Gym':['gym near me','personal trainer','fitness classes','weight loss','gym membership'],
  'Healthcare':['doctor near me','medical clinic','gp near me','urgent care','private healthcare'],
  'Marketing Agency':['digital marketing agency','seo services','marketing agency','google ads agency','ppc agency'],
  'Plumbing':['plumber near me','emergency plumber','boiler repair','drain cleaning','plumbing services'],
  'Construction':['builder near me','home renovation','building contractor','loft conversion','home improvement'],
  'Cleaning':['cleaning service near me','house cleaning','office cleaning','end of tenancy cleaning','carpet cleaning'],
  'IT Services':['it support near me','computer repair','managed it services','cybersecurity','tech support'],
  'Other':['services near me','best company','professional services','affordable services','local business'],
};
const getIndustrySeeds = (industry='Other') => {
  const matched=Object.keys(SEEDS).find(k=>industry.toLowerCase().includes(k.toLowerCase())||k.toLowerCase().includes(industry.toLowerCase()));
  return SEEDS[matched||'Other'];
};
const extractFromContent = (content='') => {
  if(!content||content.length<50)return[];
  const stop=new Set(['this','that','with','have','from','they','will','been','were','your','what','when','where','which','their','there','these','those','about','would','could','should','other','into','over','after','before']);
  const words=content.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>3&&!stop.has(w));
  const freq={};
  for(let i=0;i<words.length-1;i++){freq[words[i]]=(freq[words[i]]||0)+1;const b=`${words[i]} ${words[i+1]}`;if(!stop.has(words[i+1]))freq[b]=(freq[b]||0)+1;}
  return Object.entries(freq).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([kw])=>kw);
};
const researchForWebsite = async (url,industry='Other',content='') => {
  const map=new Map();
  const add=(kw,overrides={})=>{if(!kw||kw.length<3||kw.length>80)return;const c=kw.trim().toLowerCase();if(!map.has(c)){const m=estimateMetrics(c);map.set(c,{keyword:c,searchVolume:m.search_volume,difficulty:m.difficulty,cpc:m.cpc,intent:m.intent,priority:m.priority,...overrides});}};
  const seeds=getIndustrySeeds(industry);
  seeds.forEach(s=>add(s));
  for(const seed of seeds.slice(0,4)){
    const s=await googleAutocomplete(seed);s.forEach(k=>add(k));
    await new Promise(r=>setTimeout(r,250));
  }
  seeds.slice(0,3).forEach(seed=>['near me','local','online','affordable'].forEach(loc=>add(`${seed} ${loc}`,{intent:'transactional'})));
  ['how to','what is','best way to'].forEach(q=>seeds.slice(0,2).forEach(seed=>add(`${q} ${seed}`,{intent:'informational',difficulty:28})));
  extractFromContent(content).forEach(kw=>add(kw));
  return Array.from(map.values()).filter(k=>k.searchVolume>=50).sort((a,b)=>b.priority-a.priority).slice(0,150);
};
const classifyIntent=(keyword)=>estimateMetrics(keyword).intent;
module.exports = { researchForWebsite, getIndustrySeeds, extractFromContent, classifyIntent };

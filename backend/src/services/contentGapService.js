const { googleAutocomplete, estimateMetrics } = require('./serpService');
const { getIndustrySeeds } = require('./keywordService');

const analyzeContentGap = async (yourDomain, competitorDomains=[], industry='Other') => {
  const yourKeywords = new Set();
  const competitorMap = new Map();
  const yourBrand = yourDomain.replace(/https?:\/\/(www\.)?/,'').split('.')[0];
  const yourSuggestions = await googleAutocomplete(yourBrand);
  yourSuggestions.forEach(k=>yourKeywords.add(k.toLowerCase()));

  for (const comp of competitorDomains.slice(0,5)) {
    const brand = comp.replace(/https?:\/\/(www\.)?/,'').split('.')[0];
    await new Promise(r=>setTimeout(r,300));
    const [basic,best,near] = await Promise.all([googleAutocomplete(brand),googleAutocomplete('best '+brand),googleAutocomplete(brand+' near me')]);
    [...new Set([...basic,...best,...near])].forEach(kw=>{
      const c=kw.toLowerCase();
      if(!competitorMap.has(c))competitorMap.set(c,[]);
      competitorMap.get(c).push(comp);
    });
  }
  const seeds = getIndustrySeeds(industry);
  for (const seed of seeds.slice(0,3)) {
    const s = await googleAutocomplete(seed);
    s.forEach(kw=>{ const c=kw.toLowerCase(); if(!competitorMap.has(c))competitorMap.set(c,['industry']); });
    await new Promise(r=>setTimeout(r,200));
  }
  const gaps = [];
  for (const [keyword,competitors] of competitorMap.entries()) {
    if (!yourKeywords.has(keyword)) {
      const m = estimateMetrics(keyword);
      const realComps = competitors.filter(c=>c!=='industry');
      gaps.push({ keyword, competitors:realComps, competitorCount:realComps.length, searchVolume:m.search_volume, difficulty:m.difficulty, intent:m.intent, priority:m.priority,
        opportunity:Math.round((m.search_volume/100)*(1-m.difficulty/100)*(realComps.length+1)*10),
        action: m.intent==='informational'?`Write a blog post targeting "${keyword}"`:m.intent==='transactional'?`Create a dedicated service page for "${keyword}"`:`Add a comparison page for "${keyword}"` });
    }
  }
  gaps.sort((a,b)=>b.opportunity-a.opportunity);
  return {
    yourDomain, competitors:competitorDomains, totalGaps:gaps.length,
    quickWins: gaps.filter(g=>g.difficulty<40&&g.searchVolume>200).slice(0,10),
    highValue: gaps.filter(g=>g.searchVolume>1000).slice(0,10),
    allGaps: gaps.slice(0,100),
    summary: { totalOpportunities:gaps.length, estimatedTrafficGain:gaps.slice(0,20).reduce((s,g)=>s+Math.round(g.searchVolume*0.05),0), topOpportunity:gaps[0]?.keyword||'N/A', easiestWin:gaps.find(g=>g.difficulty<35)?.keyword||'N/A' },
  };
};
module.exports = { analyzeContentGap };

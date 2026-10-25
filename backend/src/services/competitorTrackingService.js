const axios = require('axios');
const cheerio = require('cheerio');
const { googleAutocomplete, estimateMetrics } = require('./serpService');
const { query, queryOne, queryAll } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; RankPilotBot/1.0)' };

const fetchCompetitorSnapshot = async (url) => {
  const domain = url.replace(/https?:\/\/(www\.)?/,'').split('/')[0];
  try {
    const {data:html} = await axios.get(url.startsWith('http')?url:`https://${url}`,{headers:HEADERS,timeout:15000});
    const $ = cheerio.load(html);
    const title=$('title').text().trim(),h1=$('h1').first().text().trim(),metaDesc=$('meta[name="description"]').attr('content')||'',wordCount=$('body').text().replace(/\s+/g,' ').trim().split(' ').length,hasSchema=$('script[type="application/ld+json"]').length>0,hasBlog=$('a[href*="blog"],a[href*="news"],a[href*="articles"]').length>0;
    const brand=domain.split('.')[0];
    const keywords=(await googleAutocomplete(brand)).slice(0,10).map(k=>({keyword:k,...estimateMetrics(k)}));
    return{domain,url,title,metaDescription:metaDesc,h1,wordCount,hasSchema,hasBlog,topKeywords:keywords,estimatedDA:20+Math.floor(Math.random()*50),lastChecked:new Date().toISOString()};
  } catch(err){return{domain,url,error:err.message,lastChecked:new Date().toISOString()};}
};

const detectChanges = (old,curr) => {
  if(!old)return[];
  const changes=[];
  if(old.title&&curr.title&&old.title!==curr.title)changes.push({type:'title_change',field:'Page Title',old:old.title,new:curr.title,severity:'high',note:'Title changed — may indicate SEO strategy change'});
  if(old.h1&&curr.h1&&old.h1!==curr.h1)changes.push({type:'h1_change',field:'H1 Heading',old:old.h1,new:curr.h1,severity:'high',note:'H1 change — they may be targeting a new keyword'});
  if(!old.hasSchema&&curr.hasSchema)changes.push({type:'schema_added',field:'Schema Markup',old:'None',new:'Added',severity:'medium',note:'They added structured data — consider copying this'});
  if(!old.hasBlog&&curr.hasBlog)changes.push({type:'blog_added',field:'Blog Section',old:'No blog',new:'Added',severity:'high',note:'Competitor started content marketing — you should too'});
  return changes;
};

const saveSnapshot = async (websiteId,userId,url,snapshot) => {
  await query(`INSERT INTO competitors (id,website_id,domain,shared_keywords,domain_authority,positions,updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT (website_id,domain) DO UPDATE SET shared_keywords=$4,domain_authority=$5,positions=$6,updated_at=NOW()`,
    [uuidv4(),websiteId,snapshot.domain,snapshot.topKeywords?.length||0,snapshot.estimatedDA||0,JSON.stringify(snapshot)]);
};

const trackAllCompetitors = async (websiteId,userId,competitorUrls=[]) => {
  const results=[];
  for(const url of competitorUrls.slice(0,5)){
    const snap=await fetchCompetitorSnapshot(url);
    await saveSnapshot(websiteId,userId,url,snap);
    results.push(snap);
    await new Promise(r=>setTimeout(r,1000));
  }
  return results;
};

const generateCompetitorReport = (yourDomain,competitors=[]) => {
  const withBlogs=competitors.filter(c=>c.hasBlog).length;
  const withSchema=competitors.filter(c=>c.hasSchema).length;
  const avgWords=competitors.length?Math.round(competitors.reduce((s,c)=>s+(c.wordCount||0),0)/competitors.length):0;
  const insights=[],recs=[];
  if(withBlogs>competitors.length/2){insights.push(`${withBlogs}/${competitors.length} competitors have a blog`);recs.push({action:'Start a blog',priority:'high',reason:`${withBlogs} competitors are publishing content. You're missing organic traffic.`});}
  if(withSchema>competitors.length/2){insights.push(`${withSchema}/${competitors.length} competitors use Schema`);recs.push({action:'Add Schema markup',priority:'high',reason:'Your competitors have rich snippets in Google — you don\'t.'});}
  if(avgWords>500){recs.push({action:`Write longer content (aim for ${avgWords+200}+ words)`,priority:'medium',reason:'Match or beat competitor content length.'});}
  return{yourDomain,analyzedAt:new Date().toISOString(),competitors:competitors.length,insights,recommendations:recs};
};
module.exports = { fetchCompetitorSnapshot, detectChanges, saveSnapshot, trackAllCompetitors, generateCompetitorReport };

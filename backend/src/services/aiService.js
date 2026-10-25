/**
 * AI Service — Groq (FREE — console.groq.com)
 * Short prompts to avoid 400 token limit errors
 */

const axios = require('axios');

const groq = async (prompt, system = 'Return valid JSON only.', maxTokens = 1000) => {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set in .env');
  const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama3-70b-8192',
    max_tokens: maxTokens,
    temperature: 0.4,
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: prompt.slice(0, 3000) }, // hard cap to prevent 400
    ],
  }, {
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    timeout: 45000,
  });
  return res.data.choices[0].message.content;
};

const parseJSON = (raw) => {
  try { return JSON.parse(raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()); }
  catch {
    const m = raw.match(/[\[{][\s\S]*[\]}]/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return null;
  }
};

// ── SEO ANALYSIS ──────────────────────────────────────────────────
const analyzeWebsiteForSEO = async ({ website, crawlData, keywords = [], technicalIssues = [] }) => {
  const issues = (Array.isArray(technicalIssues) ? technicalIssues : []).slice(0, 4).map(i => `[${i.severity}] ${i.title}`).join('\n');
  const kws    = (Array.isArray(keywords) ? keywords : []).slice(0, 6).map(k => k.keyword).join(', ');
  const pages  = (crawlData.pages || []).slice(0, 2).map(p => `${p.url}: "${(p.title||'').slice(0,40)}"`).join('\n');

  const prompt = `SEO analysis for ${website.name} (${website.url}).
Industry: ${website.industry||'General'}
SSL: ${crawlData.hasSSL?'Yes':'No'} | Sitemap: ${crawlData.hasSitemap?'Yes':'No'} | Pages: ${crawlData.totalPages||1}
Issues: ${issues||'None'}
Keywords: ${kws||'None'}
Pages: ${pages||'None'}

Return JSON:
{
  "executiveSummary": "2 sentence SEO summary",
  "overallHealth": "poor|fair|good|excellent",
  "estimatedTimeToRank": "e.g. 3-6 months",
  "quickWins": [{"action":"fix this","impact":"high","effort":"easy","reason":"why"}],
  "contentStrategy": {"primaryKeyword":"main keyword","secondaryKeywords":["kw1","kw2"],"recommendedBlogTopics":["topic1","topic2"]},
  "technicalPriorities": ["fix 1","fix 2"],
  "competitorInsight": "brief insight"
}`;

  try {
    const raw = await groq(prompt, 'You are an SEO expert. Return valid JSON only.', 900);
    return parseJSON(raw) || getFallbackAnalysis(website, technicalIssues);
  } catch (err) {
    console.error('AI analysis error:', err.message);
    return getFallbackAnalysis(website, technicalIssues);
  }
};

const getFallbackAnalysis = (website, issues = []) => ({
  executiveSummary: `${website.name} has been analysed. ${(Array.isArray(issues)?issues:[] ).length} technical issues found. Focus on fixing critical issues first for fastest ranking improvements.`,
  overallHealth: (Array.isArray(issues)?issues:[]).filter(i=>i.severity==='critical').length > 3 ? 'poor' : 'fair',
  estimatedTimeToRank: '3-6 months with consistent improvements',
  quickWins: [
    { action:'Fix all missing meta descriptions', impact:'high', effort:'easy', reason:'Meta descriptions improve click-through rates from search results' },
    { action:'Add H1 heading to every page', impact:'high', effort:'easy', reason:'H1 tells Google what each page is about' },
    { action:'Create an XML sitemap', impact:'high', effort:'easy', reason:'Sitemaps help Google discover all your pages' },
  ],
  contentStrategy: {
    primaryKeyword: (website.industry||'services') + ' near me',
    secondaryKeywords: ['best '+(website.industry||'services'), 'affordable '+(website.industry||'services')],
    recommendedBlogTopics: ['Complete guide to '+(website.industry||'services'), 'How to choose a '+(website.industry||'service provider'), 'Cost of '+(website.industry||'services')],
  },
  technicalPriorities: (Array.isArray(issues)?issues:[]).slice(0,3).map(i=>i.fix||i.title) || ['Add SSL certificate','Create XML sitemap','Fix broken links'],
  competitorInsight: 'Focus on local SEO and getting Google reviews to stand out in your area.',
});

// ── PAGE RECOMMENDATIONS ──────────────────────────────────────────
const generatePageRecommendations = async ({ website, pages = [], keywords = [] }) => {
  if (!pages.length) return [];
  const pageList = pages.slice(0, 3).map(p =>
    `URL: ${p.url}\nTitle: "${(p.title||'Missing').slice(0,50)}"\nH1: "${(p.h1||'Missing').slice(0,50)}"`
  ).join('\n\n');
  const kwList = (Array.isArray(keywords)?keywords:[]).slice(0,3).map(k=>k.keyword||k).join(', ');

  const prompt = `Optimize these pages for SEO. Target keywords: ${kwList||website.industry||'local services'}\n\n${pageList}\n\nReturn JSON array:\n[{"pageUrl":"url","recommendedTitle":"title under 60 chars","recommendedH1":"h1 with keyword","targetKeyword":"keyword","metaDescription":"under 155 chars"}]`;

  try {
    const raw = await groq(prompt, 'You are an SEO expert. Return valid JSON array only.', 700);
    const parsed = parseJSON(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Page recs error:', err.message);
    return pages.slice(0,3).map(p => ({
      pageUrl: p.url,
      recommendedTitle: `${website.name} - ${p.title||website.industry||'Professional Services'}`,
      recommendedH1: p.h1 || `${website.name} - ${website.industry||'Professional Services'}`,
      targetKeyword: kwList.split(',')[0]?.trim() || website.industry || 'local services',
      metaDescription: `Professional ${website.industry||'services'} from ${website.name}. Call us today for a free quote.`,
    }));
  }
};

// ── CONTENT WRITING ───────────────────────────────────────────────
const generateOptimizedContent = async ({ website, pageUrl, targetKeyword, pageType = 'page', tone = 'professional' }) => {
  const prompt = `Write SEO content for ${website.name} (${website.industry||'business'}).
Target keyword: "${targetKeyword}"
Page type: ${pageType} | Tone: ${tone}

Return JSON:
{
  "metaTitle": "title under 60 chars with keyword",
  "metaDescription": "description under 155 chars",
  "h1": "main heading with keyword",
  "content": "400 word page content. Include keyword 3-4 times naturally. Add benefits, process, CTA.",
  "keywordsUsed": ["keyword1","keyword2"],
  "wordCount": 400
}`;

  try {
    const raw = await groq(prompt, `You are an SEO copywriter. Tone: ${tone}. Return valid JSON only.`, 900);
    const parsed = parseJSON(raw);
    if (parsed?.content) return parsed;
    throw new Error('No content');
  } catch (err) {
    console.error('Content error:', err.message);
    return {
      metaTitle: `${website.name} - ${targetKeyword}`,
      metaDescription: `${website.name} offers professional ${targetKeyword} services. Contact us today for a free consultation and quote.`,
      h1: `Professional ${targetKeyword} Services`,
      content: `Welcome to ${website.name}. We are your trusted provider of ${targetKeyword} services.\n\nOur team of experts delivers high-quality ${targetKeyword} solutions tailored to your specific needs. With years of experience, we understand what it takes to get results.\n\n## Why Choose Us?\n\n- Experienced team of professionals\n- Competitive and transparent pricing\n- Fast turnaround and reliable service\n- 100% customer satisfaction guarantee\n\n## Our ${targetKeyword} Services\n\nWe offer a comprehensive range of ${targetKeyword} services. Whether you need a quick fix or a complete solution, we have the expertise to help.\n\n## Contact Us Today\n\nReady to get started? Contact ${website.name} today for a free consultation. Our friendly team is standing by to help you achieve your goals.`,
      keywordsUsed: [targetKeyword],
      wordCount: 160,
    };
  }
};

// ── AD COPY ───────────────────────────────────────────────────────
const generateAdCopy = async ({ website, platform, goal, targetAudience, product, budget }) => {
  const prompt = `Create ${platform} ad copy for ${website.name} (${website.industry||'business'}).
Goal: ${goal||'leads'} | Audience: ${targetAudience||'local customers'} | Budget: $${budget||500}/mo

Return JSON:
{
  "headlines": ["Headline 1 max 30 chars","Headline 2","Headline 3"],
  "descriptions": ["Description max 90 chars","Description 2"],
  "adSets": [{"name":"Main Ad","headline":"headline","description":"description","cta":"Call Now","predictedCTR":"3-5%"}],
  "audienceRecommendations": {"demographics":"Age 25-55","interests":["interest1"],"customAudiences":["website visitors"]},
  "expectedResults": {"impressions":"10,000-20,000/mo","clicks":"200-400/mo","estimatedLeads":"20-40","estimatedCPC":"$2.50"}
}`;

  try {
    const raw = await groq(prompt, 'You are a digital marketing expert. Return valid JSON only.', 700);
    return parseJSON(raw) || getDefaultAdCopy(website, platform, budget);
  } catch (err) {
    return getDefaultAdCopy(website, platform, budget);
  }
};

const getDefaultAdCopy = (website, platform, budget) => ({
  headlines: [`Best ${(website.industry||'Service').slice(0,22)}`, `${website.name.slice(0,28)}`, 'Free Quote Today'],
  descriptions: [`Professional ${website.industry||'services'} you can trust. Call today!`, `Affordable rates, expert team. Get your free quote now.`],
  adSets: [{ name:'Main Ad', headline:`Best ${website.industry||'Service'} Near You`, description:`Trusted, affordable, fast. Call ${website.name} today.`, cta:'Get Free Quote', predictedCTR:'2-4%' }],
  audienceRecommendations: { demographics:'Age 25-65, local area', interests:[website.industry||'services'], customAudiences:['website visitors'] },
  expectedResults: { impressions:'10,000-20,000/mo', clicks:'200-400/mo', estimatedLeads:'20-40', estimatedCPC:'$1.50' },
});

// ── SOCIAL CONTENT ────────────────────────────────────────────────
const generateSocialContent = async ({ website, platform, topic, count = 5 }) => {
  const prompt = `Create ${Math.min(count,5)} ${platform} posts for ${website.name} (${website.industry||'business'}).
Topic: ${topic||'general business'}

Return JSON: {"posts":[{"content":"post text","hashtags":["#tag"],"type":"tip|promotion","bestPostingTime":"Tuesday 2pm","imageIdea":"brief description"}]}`;

  try {
    const raw = await groq(prompt, `You are a social media expert. Return valid JSON only.`, 700);
    const parsed = parseJSON(raw);
    if (parsed?.posts) return parsed;
    throw new Error('Parse failed');
  } catch (err) {
    return {
      posts: Array.from({length:Math.min(count,3)},(_,i)=>({
        content: i===0?`🌟 Welcome to ${website.name}! Your trusted ${website.industry||'service'} experts. Follow us for tips and updates!`:`✅ ${website.name} is here to help with all your ${website.industry||'service'} needs. Get in touch for a free consultation!`,
        hashtags: [`#${(website.industry||'business').replace(/\s/g,'')}`, '#LocalBusiness', '#Professional'],
        type: ['promotion','tip','engagement'][i%3],
        bestPostingTime: ['Monday 9am','Wednesday 12pm','Friday 3pm'][i%3],
        imageIdea: `Team photo or ${website.industry||'service'} in action`,
      })),
    };
  }
};

// ── WEEKLY REPORT ─────────────────────────────────────────────────
const generateWeeklyReport = async ({ website, rankings = [], adPerformance, period }) => {
  const improved = (Array.isArray(rankings)?rankings:[]).filter(r=>r.previous_position&&r.position<r.previous_position).length;
  const declined = (Array.isArray(rankings)?rankings:[]).filter(r=>r.previous_position&&r.position>r.previous_position).length;
  const top10    = (Array.isArray(rankings)?rankings:[]).filter(r=>r.position<=10).length;

  return {
    subject: `Weekly SEO Report — ${website.name}`,
    summary: `This week RankPilot tracked your SEO performance for ${website.name}. ${improved} keywords improved in rankings${top10>0?`, with ${top10} in the top 10`:''}.`,
    biggestWin: improved>0 ? `${improved} keywords moved up in Google rankings this week` : 'Your website was actively monitored and all systems are healthy',
    alert: declined>3 ? 'Several keywords declined — consider refreshing that content' : null,
    rankingChanges: { improved, declined, new: 0 },
    topRankings: (Array.isArray(rankings)?rankings:[]).filter(r=>r.position<=10).slice(0,5).map(r=>({ keyword:r.keyword, position:r.position, change:r.previous_position?`${r.previous_position>r.position?'+':''}${r.previous_position-r.position}`:'new' })),
    adHighlights: { spend:`$${adPerformance?.spend?.toFixed(2)||'0'}`, leads:adPerformance?.conversions||0 },
    whatWeDidThisWeek: ['Monitored keyword rankings','Analysed website performance','Checked for technical issues'],
    whatWeWillDoNextWeek: ['Continue rank tracking','Refresh underperforming content','Analyse competitor movements'],
    overallTrend: improved>declined?'improving':'stable',
    encouragingNote: 'SEO is a marathon, not a sprint. Every improvement compounds over time — keep going!',
  };
};

module.exports = { analyzeWebsiteForSEO, generatePageRecommendations, generateOptimizedContent, generateAdCopy, generateSocialContent, generateWeeklyReport };

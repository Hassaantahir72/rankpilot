const { groq, parseJSON } = require('./aiHelpers');
const generatePerformanceMaxAssets = async ({businessName,industry,url,goal,budget,targetAudience,location}) => {
  const prompt=`Create Google Ads Performance Max assets for ${businessName} (${industry}). Goal:${goal||'leads'}. Budget:$${budget||500}/month. Location:${location||'local'}.\nReturn JSON: {"campaignName":"","headlines":["max 30 chars x5"],"longHeadlines":["max 90 chars x2"],"descriptions":["max 90 chars x4"],"callToActions":["Call Now","Get Quote"],"sitelinks":[{"text":"","description1":"","description2":"","url":"path"}],"audienceSignals":{"interests":[],"demographics":"","customSegments":[]},"biddingStrategy":{"type":"Maximize conversions","targetCPA":"$X","recommendation":"text"},"imageIdeas":[{"type":"Square 1:1","description":"what to show"}],"expectedResults":{"impressions":"","clicks":"","conversions":"","estimatedCPA":""}}`;
  try{
    const raw=await groq(prompt,'You are a Google Ads expert. Return valid JSON only.',1200);
    const assets=parseJSON(raw);
    if(assets){
      if(assets.headlines)assets.headlines=assets.headlines.slice(0,15).map(h=>h.slice(0,30));
      if(assets.descriptions)assets.descriptions=assets.descriptions.slice(0,4).map(d=>d.slice(0,90));
      if(assets.longHeadlines)assets.longHeadlines=assets.longHeadlines.slice(0,5).map(h=>h.slice(0,90));
      return{...assets,setupGuide:getSetupGuide(businessName,budget),estimatedMonthlyBudget:budget};
    }
  }catch(err){console.error('PMax error:',err.message);}
  return{campaignName:`${businessName} — Performance Max`,headlines:[businessName.slice(0,30),`Best ${(industry||'Service').slice(0,24)}`,'Free Quote Today','Call Us Now','Fast & Reliable'],longHeadlines:[`${businessName} — Professional ${industry||'Services'} You Can Trust`],descriptions:[`Professional ${industry||'services'} from ${businessName}. Call for a free quote.`,'Trusted local experts. Affordable rates. Fast turnaround.'],callToActions:['Get Quote','Call Now','Learn More'],sitelinks:[{text:'Our Services',description1:'See all services',description2:'Tailored solutions',url:`${url}/services`},{text:'Contact Us',description1:'Get in touch',description2:'Free consultation',url:`${url}/contact`}],audienceSignals:{interests:[`${industry} services`,'local services'],demographics:'Age 25-65 local area',customSegments:[`best ${industry||'service'} near me`,`${industry||'service'} company`]},biddingStrategy:{type:'Maximize conversions',targetCPA:`$${Math.round((budget||500)/20)}`,recommendation:'Start with maximize conversions. After 30 conversions, switch to Target CPA.'},imageIdeas:[{type:'Square 1:1 (1200x1200px)',description:`Photo of ${businessName} team or work`},{type:'Landscape 1.91:1 (1200x628px)',description:`${industry||'service'} in action`}],expectedResults:{impressions:`${Math.round((budget||500)*20).toLocaleString()}/month`,clicks:`${Math.round((budget||500)*0.5).toLocaleString()}/month`,conversions:`${Math.round((budget||500)/25)}/month`,estimatedCPA:`$${Math.round((budget||500)/Math.max(1,Math.round((budget||500)/25)))}`},setupGuide:getSetupGuide(businessName,budget),estimatedMonthlyBudget:budget};
};
const getSetupGuide=(businessName,budget)=>[
  {step:1,title:'Create new campaign',detail:'Google Ads → New Campaign → Performance Max → Enter website URL'},
  {step:2,title:'Set budget & bidding',detail:`Start with $${Math.round((budget||500)/30)}/day. Choose "Maximize conversions"`},
  {step:3,title:'Paste AI-generated assets',detail:'Copy headlines, descriptions and long headlines from above'},
  {step:4,title:'Upload images',detail:'Minimum: 1 square (1:1), 1 landscape (1.91:1) — high quality photos'},
  {step:5,title:'Add audience signals',detail:'Add the interest categories and search terms listed above'},
  {step:6,title:'Connect Google Analytics',detail:'Essential for conversion tracking — without it PMax cannot optimise'},
  {step:7,title:'Review and publish',detail:'Check all assets, set start date. Wait minimum 2 weeks before making changes'},
];
module.exports = { generatePerformanceMaxAssets };

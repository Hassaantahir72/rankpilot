const { groq, parseJSON } = require('./aiHelpers');
const axios = require('axios');

const generateBlogPost = async ({businessName,industry,keyword,tone='professional',audience='general'}) => {
  const outlinePrompt=`Create blog post outline for "${keyword}" for ${businessName} (${industry}). Return JSON: {"title":"SEO title","slug":"url-slug","metaTitle":"under 60 chars","metaDescription":"under 155 chars","sections":[{"heading":"H2","keyPoints":["point"]}],"faqQuestions":["FAQ?"]}`;
  let outline;
  try{const raw=await groq(outlinePrompt,'You are an SEO content strategist. Return valid JSON only.',600);outline=parseJSON(raw);}catch{}
  if(!outline)outline={title:`Complete Guide to ${keyword}`,slug:keyword.toLowerCase().replace(/\s+/g,'-'),metaTitle:`${keyword} — Guide | ${businessName}`,metaDescription:`Everything about ${keyword}. Expert advice from ${businessName}.`,sections:[{heading:`What is ${keyword}?`,keyPoints:['definition','importance']},{heading:`Benefits of ${keyword}`,keyPoints:['advantages']},{heading:`How to Get Started`,keyPoints:['steps']},{heading:`Why Choose ${businessName}`,keyPoints:['expertise']}],faqQuestions:[`What does ${keyword} cost?`,`How long does ${keyword} take?`]};

  let content=`Are you looking for expert advice on ${keyword}? You've come to the right place. At ${businessName}, we've helped hundreds of clients with exactly this. In this guide, we'll cover everything you need to know.\n\n`;
  for(const s of (outline.sections||[]).slice(0,4)){
    try{const sc=await groq(`Write a 180-word section titled "${s.heading}" for a blog post about "${keyword}" for ${businessName} (${industry}). Key points: ${s.keyPoints?.join(', ')}. Tone: ${tone}. Plain text with markdown headings.`,'Write engaging content.',400);content+=`## ${s.heading}\n\n${sc.trim()}\n\n`;}
    catch{content+=`## ${s.heading}\n\nWhen it comes to ${s.heading.toLowerCase()}, there are several important factors to consider. At ${businessName}, we've worked with hundreds of clients on exactly this.\n\nThe key thing to understand is that ${keyword} requires a strategic approach. Here's what we recommend:\n\n- Start with a clear goal in mind\n- Research your specific situation\n- Implement proven strategies step by step\n- Monitor results and adjust\n\n`;}
    await new Promise(r=>setTimeout(r,300));
  }
  content+=`## Conclusion\n\n${keyword} doesn't have to be complicated. With the right guidance from ${businessName}, you can achieve great results. Ready to get started? Contact us today for a free consultation.\n\n`;
  if(outline.faqQuestions?.length){
    content+=`## Frequently Asked Questions\n\n`;
    for(const q of outline.faqQuestions.slice(0,3)){content+=`### ${q}\n\nThis is a common question we get at ${businessName}. The answer depends on your specific situation. Contact us for personalised advice.\n\n`;}
  }
  const wc=content.split(' ').length;
  return{title:outline.title,slug:outline.slug,metaTitle:outline.metaTitle,metaDescription:outline.metaDescription,content:content.trim(),wordCount:wc,estimatedReadTime:`${Math.ceil(wc/200)} min read`,targetKeywords:[keyword],htmlContent:content.replace(/## (.*)/g,'<h2>$1</h2>').replace(/### (.*)/g,'<h3>$1</h3>').replace(/\n\n/g,'</p><p>').replace(/^/,'<p>').replace(/$/,'</p>'),imagePrompts:[`Professional ${industry} team — featured image for "${keyword}"`,`Infographic showing steps for ${keyword}`]};
};

const publishToWordPress = async ({siteUrl,username,appPassword,post}) => {
  try{
    const auth=Buffer.from(`${username}:${appPassword}`).toString('base64');
    const {data}=await axios.post(`${siteUrl}/wp-json/wp/v2/posts`,{title:post.title,content:post.htmlContent,status:'draft',slug:post.slug,excerpt:post.metaDescription},{headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/json'},timeout:30000});
    return{success:true,postId:data.id,editUrl:`${siteUrl}/wp-admin/post.php?post=${data.id}&action=edit`,viewUrl:data.link};
  }catch(err){return{success:false,error:err.response?.data?.message||err.message};}
};

const generateBlogTopics = async ({businessName,industry,keywords=[],count=10}) => {
  try{
    const prompt=`Generate ${count} blog topic ideas for ${businessName} (${industry}). Keywords: ${keywords.slice(0,5).join(', ')}. Return JSON array: [{"title":"","keyword":"","type":"how-to|listicle|guide","difficulty":"easy|medium","estimatedTraffic":"500-1000/month","priority":"high|medium|low"}]`;
    const raw=await groq(prompt,'Return valid JSON array only.',600);
    return parseJSON(raw)||getDefaultTopics(businessName,industry);
  }catch{return getDefaultTopics(businessName,industry);}
};
const getDefaultTopics=(businessName,industry)=>[
  {title:`10 Things to Look for When Choosing a ${industry} Provider`,keyword:`best ${(industry||'service').toLowerCase()}`,type:'listicle',difficulty:'easy',estimatedTraffic:'500-1500/month',priority:'high'},
  {title:`How Much Does ${industry} Cost in 2024?`,keyword:`${(industry||'service').toLowerCase()} cost`,type:'guide',difficulty:'easy',estimatedTraffic:'1000-3000/month',priority:'high'},
  {title:`${industry} Near Me: How to Find the Best Local Provider`,keyword:`${(industry||'service').toLowerCase()} near me`,type:'guide',difficulty:'medium',estimatedTraffic:'2000-5000/month',priority:'high'},
  {title:`The Complete Guide to ${industry}`,keyword:`${(industry||'service').toLowerCase()} guide`,type:'guide',difficulty:'medium',estimatedTraffic:'800-2000/month',priority:'medium'},
  {title:`Common ${industry} Mistakes to Avoid`,keyword:`${(industry||'service').toLowerCase()} mistakes`,type:'listicle',difficulty:'easy',estimatedTraffic:'300-800/month',priority:'medium'},
];
module.exports = { generateBlogPost, publishToWordPress, generateBlogTopics };

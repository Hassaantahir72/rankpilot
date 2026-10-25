const { groq, parseJSON } = require('./aiHelpers');
const axios = require('axios');
const brevoRequest = async (endpoint,method='GET',data=null) => {
  if(!process.env.BREVO_API_KEY)throw new Error('BREVO_API_KEY not set. Get free key at brevo.com');
  const res=await axios({method,url:`https://api.brevo.com/v3${endpoint}`,headers:{'api-key':process.env.BREVO_API_KEY,'Content-Type':'application/json'},data,timeout:15000});
  return res.data;
};
const generateEmailSequence = async ({businessName,industry,goal,targetAudience,sequenceType='welcome'}) => {
  const prompt=`Create a 3-email ${sequenceType} sequence for ${businessName} (${industry}). Goal: ${goal||'engage customers'}. Audience: ${targetAudience||'potential customers'}.\nReturn JSON array: [{"emailNumber":1,"subject":"subject","sendDay":0,"body":"email body 150 words","cta":"Button text","purpose":"what this achieves"}]`;
  try {
    const raw=await groq(prompt,'You are an expert email copywriter. Return valid JSON array only.',1200);
    const emails=parseJSON(raw);
    if(Array.isArray(emails))return{sequenceType,sequenceName:sequenceType.charAt(0).toUpperCase()+sequenceType.slice(1)+' Series',emails,totalEmails:emails.length};
  } catch {}
  return {sequenceType,sequenceName:'Welcome Series',totalEmails:3,emails:[
    {emailNumber:1,sendDay:0,subject:`Welcome to ${businessName}!`,body:`Hi [First Name],\n\nWelcome to ${businessName}! We're thrilled to have you.\n\nWe specialise in ${industry||'professional services'} and we're here to help you get great results.\n\nExpect:\n• Expert service tailored to your needs\n• Fast response times\n• Transparent pricing\n\nReply to this email or click below to get started!\n\n${businessName} Team`,cta:'Get Started',purpose:'Build initial trust'},
    {emailNumber:2,sendDay:3,subject:`How ${businessName} helps businesses like yours`,body:`Hi [First Name],\n\nOur clients typically see:\n• 40% improvement in results\n• Faster delivery times\n• Better ROI\n\nBook a free 15-minute consultation to talk about your goals.\n\n${businessName} Team`,cta:'Book Free Consultation',purpose:'Build credibility'},
    {emailNumber:3,sendDay:7,subject:'Special offer for new clients — expires soon',body:`Hi [First Name],\n\nAs a new contact, we're offering you 20% off your first service with ${businessName}.\n\nOffer expires in 48 hours. Use code WELCOME20.\n\n${businessName} Team`,cta:'Claim Your Discount',purpose:'Convert with urgency'},
  ]};
};
const generateSubjectLines = async (topic,businessName) => {
  try {
    const raw=await groq(`Generate 8 email subject lines for "${topic}" from ${businessName}. Mix curiosity, urgency, benefit, question. Return JSON array.`,'Return JSON array of strings only.',400);
    return parseJSON(raw)||[`[Important] ${topic}`,`The truth about ${topic}`,`Quick question about ${topic}`,`How to ${topic} in 5 minutes`,`Last chance: ${topic}`];
  } catch { return [`[Important] ${topic}`,`The truth about ${topic}`,`Quick question about ${topic}`]; }
};
const createContact = async (email,attributes={}) => brevoRequest('/contacts','POST',{email,attributes,updateEnabled:true});
const getCampaignStats = async () => brevoRequest('/emailCampaigns?limit=10&sort=desc');
module.exports = { generateEmailSequence, generateSubjectLines, createContact, getCampaignStats };

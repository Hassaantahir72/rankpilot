const { googleAutocomplete, estimateMetrics } = require('./serpService');
const checkGoogleBusinessProfile = async (businessName) => ({
  checked:true,
  recommendations:[
    {item:'Business name',status:'check',action:'Ensure name matches exactly across all platforms'},
    {item:'Business category',status:'check',action:'Choose the most specific primary category'},
    {item:'Business hours',status:'check',action:'Add accurate opening hours including holidays'},
    {item:'Phone number',status:'check',action:'Add local phone number for better local rankings'},
    {item:'Business address',status:'check',action:'Add full physical address'},
    {item:'Business description',status:'check',action:'Write 750-char description with main keywords'},
    {item:'Photos',status:'check',action:'Add 10+ high-quality photos — businesses with photos get 42% more direction requests'},
    {item:'Google Posts',status:'check',action:'Post weekly updates'},
    {item:'Q&A section',status:'check',action:'Add 5+ questions and answers with keywords'},
    {item:'Review responses',status:'check',action:'Respond to ALL reviews within 24 hours'},
  ],
});
const checkNAPConsistency = (businessName, phone, address) => ({
  businessName, phone, address,
  directories:[
    {name:'Google Business',url:'https://business.google.com',priority:'critical'},
    {name:'Yelp',url:'https://yelp.com',priority:'high'},
    {name:'Facebook',url:'https://facebook.com',priority:'high'},
    {name:'Bing Places',url:'https://bingplaces.com',priority:'high'},
    {name:'Apple Maps',url:'https://mapsconnect.apple.com',priority:'high'},
    {name:'Yellow Pages',url:'https://yellowpages.com',priority:'medium'},
    {name:'Foursquare',url:'https://foursquare.com',priority:'medium'},
    {name:'Trustpilot',url:'https://trustpilot.com',priority:'medium'},
  ].map(d=>({...d,status:'unchecked',action:`Verify NAP is consistent on ${d.name}`})),
  importance:'NAP consistency is a critical local ranking factor.',
  quickActions:['Use exact same business name everywhere','Use same phone format everywhere','Use same address format everywhere','Check all directories every 3 months'],
});
const getLocalKeywords = async (businessType, city) => {
  const seeds = [`${businessType} ${city}`,`best ${businessType} ${city}`,`${businessType} near me`,`affordable ${businessType} ${city}`,`${businessType} in ${city}`];
  const keywords = [];
  for (const seed of seeds.slice(0,3)) {
    const s = await googleAutocomplete(seed);
    s.forEach(kw=>keywords.push({keyword:kw,...estimateMetrics(kw),localIntent:kw.includes(city.toLowerCase())||kw.includes('near me')}));
    await new Promise(r=>setTimeout(r,250));
  }
  return [...new Map(keywords.map(k=>[k.keyword,k])).values()].sort((a,b)=>b.priority-a.priority).slice(0,50);
};
const getCitationOpportunities = (industry='general') => ({
  essential:[
    {name:'Google Business Profile',url:'https://business.google.com',da:100,free:true,priority:1},
    {name:'Bing Places',url:'https://bingplaces.com',da:94,free:true,priority:2},
    {name:'Apple Maps Connect',url:'https://mapsconnect.apple.com',da:100,free:true,priority:3},
    {name:'Facebook Business',url:'https://facebook.com/business',da:96,free:true,priority:4},
    {name:'Yelp',url:'https://biz.yelp.com',da:92,free:true,priority:5},
    {name:'LinkedIn Company',url:'https://linkedin.com/company/setup',da:97,free:true,priority:6},
    {name:'Trustpilot',url:'https://trustpilot.com/signup/business',da:91,free:true,priority:7},
  ],
  totalOpportunities:7,
  estimatedDABoost:'+15-25 Domain Authority from consistent citations',
  timeToComplete:'2-3 hours',
});
const getReviewRequestTemplates = (businessName, service) => ({
  email:{ subject:`How was your experience with ${businessName}?`, body:`Hi [Customer Name],\n\nThank you for choosing ${businessName} for your ${service||'recent service'}.\n\nCould you take 2 minutes to leave us a Google review?\n\n👉 Leave a review: [YOUR GOOGLE REVIEW LINK]\n\nThank you!\n\n${businessName} Team` },
  sms:`Hi [Name]! Thanks for using ${businessName}. Could you leave us a quick Google review? [LINK] — takes 2 mins!`,
  response_positive:`Thank you so much for your wonderful review! We're thrilled you had a great experience with ${businessName}. We look forward to seeing you again! 😊`,
  response_negative:`Thank you for your honest feedback. We're sorry your experience didn't meet our standards at ${businessName}. Please contact us so we can resolve this personally.`,
});
module.exports = { checkGoogleBusinessProfile, checkNAPConsistency, getLocalKeywords, getCitationOpportunities, getReviewRequestTemplates };

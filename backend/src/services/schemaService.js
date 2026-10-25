const generateLocalBusinessSchema = (data) => {
  const {name,url,phone,email,address,city,country,postcode,industry,description,rating,reviewCount}=data;
  const typeMap={'Restaurant':'Restaurant','Dentist':'Dentist','Law Firm':'LegalService','Fitness & Gym':'HealthClub','Healthcare':'MedicalClinic','Plumbing':'Plumber','Construction':'HomeAndConstructionBusiness'};
  const schemaType=Object.keys(typeMap).find(k=>industry?.includes(k))?typeMap[Object.keys(typeMap).find(k=>industry?.includes(k))]:'LocalBusiness';
  return {
    '@context':'https://schema.org','@type':schemaType,name,url,
    ...(phone&&{telephone:phone}),(email&&{email})||({}),
    ...(description&&{description}),
    ...(address&&{address:{'@type':'PostalAddress',streetAddress:address,addressLocality:city||'',addressCountry:country||'GB',postalCode:postcode||''}}),
    ...(rating&&{aggregateRating:{'@type':'AggregateRating',ratingValue:rating,reviewCount:reviewCount||1,bestRating:5,worstRating:1}}),
    sameAs:[],
  };
};
const generateFAQSchema = (faqs) => ({'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs.map(f=>({'@type':'Question',name:f.question,acceptedAnswer:{'@type':'Answer',text:f.answer}}))});
const generateArticleSchema = (data) => ({'@context':'https://schema.org','@type':'Article',headline:data.title,description:data.description,author:{'@type':'Person',name:data.author||data.businessName},publisher:{'@type':'Organization',name:data.businessName},datePublished:data.datePublished||new Date().toISOString(),url:data.url});
const generateBreadcrumbSchema = (items) => ({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,item:item.url}))});
const getAllSchemaTypes = (d) => [
  {type:'LocalBusiness',label:'Local Business (Homepage)',code:generateLocalBusinessSchema(d),priority:'critical',description:'Tells Google about your business — name, address, phone, hours',placement:'Add to <head> of homepage'},
  {type:'FAQ',label:'FAQ Page',code:generateFAQSchema([{question:`What services does ${d.name} offer?`,answer:`${d.name} offers professional ${d.industry||'services'} in ${d.city||'your area'}.`},{question:`How can I contact ${d.name}?`,answer:`Contact us at ${d.phone||'our phone'} or ${d.email||'our email'}.`},{question:`Where is ${d.name} located?`,answer:`We are at ${d.address||'our address'}, ${d.city||'our city'}.`}]),priority:'high',description:'Creates FAQ rich snippets in Google results',placement:'Add to FAQ or homepage'},
  ...(d.url?[{type:'BreadcrumbList',label:'Breadcrumb Navigation',code:generateBreadcrumbSchema([{name:'Home',url:d.url},{name:'Services',url:d.url+'/services'}]),priority:'medium',description:'Shows breadcrumb in Google results',placement:'Add to every page'}]:[]),
];
const formatSchemaCode = (schema) => `<script type="application/ld+json">\n${JSON.stringify(schema,null,2)}\n</script>`;
module.exports = { generateLocalBusinessSchema, generateFAQSchema, generateArticleSchema, generateBreadcrumbSchema, getAllSchemaTypes, formatSchemaCode };

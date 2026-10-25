const { groq, parseJSON } = require('./aiHelpers');
const generateReviewResponse = async ({businessName,reviewText,rating,reviewerName}) => {
  const sentiment=rating>=4?'positive':rating===3?'neutral':'negative';
  const prompt=`Write a professional ${sentiment} Google review response for ${businessName}.\nReviewer: ${reviewerName||'A customer'} | Rating: ${rating}/5\nReview: "${reviewText}"\nRules: Thank by name. For negative: apologize, offer to make right. Under 80 words. Sound human.\nReturn JSON: {"response":"text","tone":"grateful|empathetic|professional"}`;
  try {
    const raw=await groq(prompt,'You are an expert in customer service and reputation management. Return JSON only.',300);
    const p=parseJSON(raw);
    if(p?.response)return p;
  } catch {}
  const name=reviewerName||'there';
  const response=rating>=4?`Thank you so much for your wonderful review, ${name}! We're delighted you had a great experience with ${businessName}. We look forward to seeing you again soon!`:rating===3?`Thank you for your honest feedback, ${name}. We appreciate you choosing ${businessName} and would love to hear how we can improve. Please feel free to contact us directly.`:`We're truly sorry, ${name}. This is not the standard we hold at ${businessName}. Please contact us so we can make this right for you.`;
  return{response,tone:sentiment};
};
const generateBatchResponses = async (reviews,businessName) => {
  const responses=[];
  for(const review of reviews.slice(0,10)){const r=await generateReviewResponse({businessName,...review});responses.push({...review,suggestedResponse:r.response,tone:r.tone});await new Promise(r=>setTimeout(r,400));}
  return responses;
};
const generateReviewRequestEmail = ({businessName,customerName,service,googleLink}) => ({
  subject:`How was your experience with ${businessName}?`,
  body:`Hi ${customerName},\n\nThank you for choosing ${businessName} for your ${service||'recent service'}.\n\nCould you take 2 minutes to leave us a Google review?\n\n⭐ Leave your review here: ${googleLink||'[Add your Google Review link]'}\n\nIt really means a lot to us!\n\nThank you,\nThe ${businessName} Team`,
  smsVersion:`Hi ${customerName}! Thanks for using ${businessName}. Leave us a quick Google review? ${googleLink||'[Link]'} — 2 mins! 😊`,
});
const analyzeReviews = (reviews=[]) => {
  if(!reviews.length)return null;
  const total=reviews.length;
  const avgRating=reviews.reduce((s,r)=>s+r.rating,0)/total;
  const dist={5:0,4:0,3:0,2:0,1:0};
  reviews.forEach(r=>dist[r.rating]=(dist[r.rating]||0)+1);
  const unanswered=reviews.filter(r=>!r.hasResponse).length;
  return{total,avgRating:Math.round(avgRating*10)/10,distribution:dist,positive:reviews.filter(r=>r.rating>=4).length,negative:reviews.filter(r=>r.rating<=2).length,unanswered,responseRate:Math.round(((total-unanswered)/total)*100),sentiment:avgRating>=4.5?'excellent':avgRating>=4?'good':avgRating>=3?'mixed':'poor',recommendations:[unanswered>0&&`Respond to ${unanswered} unanswered reviews`,avgRating<4&&'Send review requests to happy customers',total<10&&'You need more reviews — email past customers'].filter(Boolean)};
};
module.exports = { generateReviewResponse, generateBatchResponses, generateReviewRequestEmail, analyzeReviews };

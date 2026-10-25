const axios = require('axios');

const groq = async (prompt, sys = 'Return valid JSON only.', maxTokens = 1200) => {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set in .env');
  const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama3-70b-8192', max_tokens: maxTokens, temperature: 0.4,
    messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }],
  }, { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, timeout: 45000 });
  return res.data.choices[0].message.content;
};

const parseJSON = (raw) => {
  try { return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()); }
  catch {
    const m = raw.match(/[\[{][\s\S]*[\]}]/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return null;
  }
};

module.exports = { groq, parseJSON };

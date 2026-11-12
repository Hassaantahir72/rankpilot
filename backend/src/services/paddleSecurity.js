const crypto = require('crypto');

const verifyPaddleSignature = (rawBody, header, secret, nowMs = Date.now()) => {
  if (!Buffer.isBuffer(rawBody) || typeof header !== 'string' || !secret) return false;
  const parts = Object.fromEntries(header.split(';').map(part => {
    const index = part.indexOf('=');
    return index > 0 ? [part.slice(0,index).trim(), part.slice(index+1).trim()] : ['', ''];
  }).filter(([key,value]) => key && value));
  if (!/^\\d+$/.test(parts.ts || '') || !parts.h1 || !/^[a-f0-9]{64}$/i.test(parts.h1)) return false;
  const timestamp = Number(parts.ts);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowMs/1000 - timestamp) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(parts.ts + ':' + rawBody.toString('utf8')).digest();
  const supplied = Buffer.from(parts.h1, 'hex');
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
};

const minorAmount = (value, currency) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  const zeroDecimal = new Set(['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF']);
  return Math.round(n * (zeroDecimal.has(String(currency || '').toUpperCase()) ? 1 : 100));
};

module.exports = { verifyPaddleSignature, minorAmount };

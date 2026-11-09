const crypto = require('crypto');

const minorAmount = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= Number.MAX_SAFE_INTEGER ? Math.round(amount) : null;
};

const validSignature = (rawBody, supplied, secret) => {
  if (!Buffer.isBuffer(rawBody) || typeof supplied !== 'string' || !secret || !/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  let actual;
  try { actual = Buffer.from(supplied, 'hex'); } catch { return false; }
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

module.exports = { minorAmount, validSignature };

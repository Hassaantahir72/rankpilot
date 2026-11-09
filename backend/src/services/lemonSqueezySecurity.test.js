const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { minorAmount, validSignature } = require('./lemonSqueezySecurity');

test('converts provider currency minor-unit values safely', () => {
  assert.equal(minorAmount(1199), 1199);
  assert.equal(minorAmount('1199'), 1199);
  assert.equal(minorAmount(1859.76), 1860);
  assert.equal(minorAmount(null), null);
  assert.equal(minorAmount(undefined), null);
  assert.equal(minorAmount(''), null);
  assert.equal(minorAmount(-1), null);
  assert.equal(minorAmount(Number.POSITIVE_INFINITY), null);
});

test('validates Lemon Squeezy HMAC signatures with constant-time comparison', () => {
  const body = Buffer.from('{"meta":{"event_name":"order_created"}}');
  const secret = 'test-webhook-secret';
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  assert.equal(validSignature(body, signature, secret), true);
  assert.equal(validSignature(body, signature.toUpperCase(), secret), true);
  assert.equal(validSignature(body, '0'.repeat(64), secret), false);
  assert.equal(validSignature(body, signature, ''), false);
  assert.equal(validSignature(body.toString('utf8'), signature, secret), false);
  assert.equal(validSignature(body, 'not-a-signature', secret), false);
});

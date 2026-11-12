const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyPaddleSignature, minorAmount } = require('./paddleSecurity');

test('verifies Paddle HMAC signature over exact raw body', () => {
  const now = 1762900000000;
  const ts = String(Math.floor(now / 1000));
  const body = Buffer.from('{"event_type":"transaction.completed"}');
  const secret = 'paddle-webhook-test-secret';
  const h1 = crypto.createHmac('sha256', secret).update(ts + ':' + body.toString('utf8')).digest('hex');
  assert.equal(verifyPaddleSignature(body, 'ts=' + ts + ';h1=' + h1, secret, now), true);
  assert.equal(verifyPaddleSignature(body, 'ts=' + ts + ';h1=' + '0'.repeat(64), secret, now), false);
  assert.equal(verifyPaddleSignature(body, 'ts=' + ts + ';h1=' + h1, 'wrong-secret', now), false);
  assert.equal(verifyPaddleSignature(body.toString('utf8'), 'ts=' + ts + ';h1=' + h1, secret, now), false);
});

test('rejects stale Paddle signatures', () => {
  const now = 1762900000000;
  const ts = String(Math.floor(now / 1000) - 301);
  const body = Buffer.from('{}');
  const secret = 'paddle-webhook-test-secret';
  const h1 = crypto.createHmac('sha256', secret).update(ts + ':' + body.toString('utf8')).digest('hex');
  assert.equal(verifyPaddleSignature(body, 'ts=' + ts + ';h1=' + h1, secret, now), false);
});

test('converts Paddle decimal totals to currency minor units', () => {
  assert.equal(minorAmount('19900', 'USD'), 19900);
  assert.equal(minorAmount('29.99', 'USD'), 2999);
  assert.equal(minorAmount('2500', 'JPY'), 2500);
  assert.equal(minorAmount('-1', 'USD'), null);
  assert.equal(minorAmount('invalid', 'USD'), null);
});

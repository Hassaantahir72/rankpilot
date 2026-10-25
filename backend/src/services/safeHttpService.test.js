const test = require('node:test');
const assert = require('node:assert/strict');
const { isPublicIp, parseHttpUrl, validatePublicUrl } = require('./safeHttpService');

test('allows common public IPv4 addresses', () => {
  assert.equal(isPublicIp('8.8.8.8'), true);
  assert.equal(isPublicIp('1.1.1.1'), true);
});

test('rejects private, loopback, link-local, shared, and reserved IPv4 ranges', () => {
  for (const ip of ['0.0.0.0', '10.0.0.1', '100.64.0.1', '127.0.0.1', '169.254.1.1',
    '172.16.0.1', '192.168.1.1', '192.0.2.1', '198.18.0.1', '203.0.113.1', '224.0.0.1', '240.0.0.1']) {
    assert.equal(isPublicIp(ip), false, ip);
  }
});

test('rejects loopback, private, link-local, and documentation IPv6 addresses', () => {
  for (const ip of ['::1', '::', 'fc00::1', 'fe80::1', 'ff02::1', '2001:db8::1', '2002::1']) {
    assert.equal(isPublicIp(ip), false, ip);
  }
  assert.equal(isPublicIp('2606:4700:4700::1111'), true);
});

test('rejects unsupported protocols and URL credentials', () => {
  assert.throws(() => parseHttpUrl('file:///etc/passwd'), /Only HTTP and HTTPS/);
  assert.throws(() => parseHttpUrl('https://user:pass@example.com'), /credentials/);
  assert.throws(() => parseHttpUrl('https://localhost'), /Private and local/);
  assert.throws(() => parseHttpUrl('https://app.local'), /Private and local/);
});

test('rejects literal private network URLs before any request is made', async () => {
  await assert.rejects(validatePublicUrl('http://127.0.0.1'), /Private and non-public/);
  await assert.rejects(validatePublicUrl('http://169.254.169.254/latest/meta-data/'), /Private and non-public/);
  await assert.rejects(validatePublicUrl('http://[::1]'), /Private and non-public/);
});

test('normalizes a public URL without its fragment', () => {
  assert.equal(parseHttpUrl('https://example.com/path#section').toString(), 'https://example.com/path');
});

/**
 * Safe outbound HTTP helper for user-supplied URLs.
 *
 * Blocks SSRF by allowing only public HTTP(S) destinations, resolving and
 * validating every hop, pinning the validated address for the request, and
 * validating redirects before following them.
 */
const axios = require('axios');
const dns = require('node:dns').promises;
const net = require('node:net');
const http = require('node:http');
const https = require('node:https');

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const ipv4ToInt = (ip) => ip.split('.').reduce((n, part) => ((n << 8) | Number(part)) >>> 0, 0);
const inV4Range = (ip, base, bits) => {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
};

const isPublicIp = (ip) => {
  const family = net.isIP(ip);
  if (family === 4) {
    const blocked = [
      ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10],
      ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
      ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24],
      ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
      ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
    ];
    return !blocked.some(([base, bits]) => inV4Range(ip, base, bits));
  }
  if (family === 6) {
    const normalized = ip.toLowerCase().split('%')[0];
    if (normalized.startsWith('::ffff:')) {
      const mapped = normalized.slice(7);
      return net.isIP(mapped) === 4 && isPublicIp(mapped);
    }
    // Only global-unicast 2000::/3 is allowed. This excludes loopback,
    // link-local, unique-local, unspecified, multicast and most special ranges.
    if (!/^2[0-9a-f]{3}:/.test(normalized)) return false;
    if (normalized.startsWith('2001:db8:') || normalized.startsWith('2001:10:') ||
        normalized.startsWith('2001:20:') || normalized.startsWith('2002:')) return false;
    return true;
  }
  return false;
};

const parseHttpUrl = (input) => {
  let url;
  try { url = new URL(input); } catch { throw new Error('A valid public website URL is required.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
  if (url.username || url.password) throw new Error('URLs containing credentials are not allowed.');
  if (!url.hostname || url.hostname.length > 253) throw new Error('Invalid website hostname.');
  if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost') ||
      url.hostname.endsWith('.local') || url.hostname.endsWith('.internal')) {
    throw new Error('Private and local network destinations are not allowed.');
  }
  if (url.port && (!/^\d+$/.test(url.port) || Number(url.port) < 1 || Number(url.port) > 65535)) {
    throw new Error('Invalid destination port.');
  }
  url.hash = '';
  return url;
};

const resolvePublicAddress = async (hostname) => {
  const literal = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(literal)) {
    if (!isPublicIp(literal)) throw new Error('Private and non-public network destinations are not allowed.');
    return { address: literal, family: net.isIP(literal) };
  }
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some(record => !isPublicIp(record.address))) {
    throw new Error('Website hostname resolves to a private or non-public address.');
  }
  // Pin the validated address for this request to reduce DNS-rebinding risk.
  return records.find(record => record.family === 4) || records[0];
};

const makePinnedLookup = (hostname, address, family) => (requestedHost, options, callback) => {
  if (requestedHost !== hostname) return callback(new Error('Unexpected outbound hostname.'));
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (options && options.all) return callback(null, [{ address, family }]);
  return callback(null, address, family);
};

const fetchPublicUrl = async (input, options = {}) => {
  const timeout = Math.min(Math.max(Number(options.timeout) || DEFAULT_TIMEOUT_MS, 1000), 30000);
  const maxBytes = Math.min(Math.max(Number(options.maxBytes) || DEFAULT_MAX_BYTES, 1024), 5 * 1024 * 1024);
  const maxRedirects = Math.min(Math.max(Number.isInteger(options.maxRedirects) ? options.maxRedirects : 4, 0), 5);
  let current = parseHttpUrl(input);

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const hostname = current.hostname.replace(/^\[|\]$/g, '');
    const resolved = await resolvePublicAddress(hostname);
    const lookup = makePinnedLookup(hostname, resolved.address, resolved.family);
    const agentOptions = { keepAlive: false, lookup };
    const response = await axios.get(current.toString(), {
      timeout,
      maxRedirects: 0,
      maxContentLength: maxBytes,
      maxBodyLength: maxBytes,
      responseType: 'text',
      transformResponse: [data => data],
      validateStatus: () => true,
      headers: {
        'User-Agent': options.userAgent || 'RankPilotBot/1.0 (+https://rankpilot.ai/bot)',
        'Accept': options.accept || 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.5',
      },
      httpAgent: new http.Agent(agentOptions),
      httpsAgent: new https.Agent(agentOptions),
    });

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.location;
      if (!location) return response;
      if (hop === maxRedirects) throw new Error('Website exceeded the redirect limit.');
      current = parseHttpUrl(new URL(location, current).toString());
      continue;
    }
    return response;
  }
  throw new Error('Website redirect limit exceeded.');
};

const validatePublicUrl = async (input) => {
  const url = parseHttpUrl(/^https?:\/\//i.test(String(input || '')) ? String(input) : `https://${String(input || '')}`);
  await resolvePublicAddress(url.hostname.replace(/^\[|\]$/g, ''));
  return url.toString();
};

module.exports = { fetchPublicUrl, validatePublicUrl, parseHttpUrl, isPublicIp };

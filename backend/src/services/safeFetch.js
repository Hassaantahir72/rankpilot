const axios = require('axios');
const dns = require('node:dns/promises');
const net = require('node:net');

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

const ipv4ToInt = (ip) => ip.split('.').reduce((value, octet) => ((value << 8) | Number(octet)) >>> 0, 0);

const isPrivateIPv4 = (ip) => {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0);
};

const isPrivateIPv6 = (ip) => {
  const value = ip.toLowerCase().split('%')[0];
  if (value === '::' || value === '::1') return true;
  if (value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') ||
      value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb') ||
      value.startsWith('ff')) return true;
  const mapped = value.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
};

const isPublicAddress = (address) => {
  const family = net.isIP(address);
  if (family === 4) return !isPrivateIPv4(address);
  if (family === 6) return !isPrivateIPv6(address);
  return false;
};

const validatePublicUrl = async (input) => {
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error('A valid public website URL is required.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS website URLs are supported.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Website URLs must not contain embedded credentials.');
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') || hostname.endsWith('.internal') ||
      hostname === 'metadata.google.internal') {
    throw new Error('Private, local, and metadata hostnames are not allowed.');
  }

  const literalFamily = net.isIP(hostname);
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await dns.lookup(hostname, { all: true, verbatim: true }).catch(() => []);

  if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) {
    throw new Error('Website hostname must resolve only to public IP addresses.');
  }

  return parsed;
};

/**
 * Fetch a public URL while validating each redirect target. Automatic redirects
 * are disabled so a redirect cannot bypass the public-IP checks.
 */
const safeGet = async (input, options = {}) => {
  let current = input;
  const maxRedirects = Math.min(Number.isInteger(options.maxRedirects) ? options.maxRedirects : MAX_REDIRECTS, MAX_REDIRECTS);
  const maxContentLength = Math.min(Number.isFinite(options.maxContentLength) ? options.maxContentLength : DEFAULT_MAX_BYTES, DEFAULT_MAX_BYTES);
  const timeout = Number.isFinite(options.timeout) ? options.timeout : 15000;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const parsed = await validatePublicUrl(current);
    const response = await axios.get(parsed.toString(), {
      headers: options.headers,
      timeout,
      maxRedirects: 0,
      maxContentLength,
      maxBodyLength: maxContentLength,
      responseType: options.responseType || 'text',
      transformResponse: options.transformResponse,
      validateStatus: status => status < 500,
    }).catch(error => {
      if (error.response) return error.response;
      throw error;
    });

    if (!REDIRECT_STATUSES.has(response.status)) return response;

    const location = response.headers?.location;
    if (!location) return response;
    if (hop === maxRedirects) throw new Error('Website exceeded the allowed redirect limit.');
    current = new URL(location, parsed).toString();
  }

  throw new Error('Website exceeded the allowed redirect limit.');
};

module.exports = { safeGet, validatePublicUrl, isPublicAddress };

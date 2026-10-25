const { query, queryOne, queryAll } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const PROVIDERS = {
  safepay: {
    displayName: 'Safepay',
    description: 'Pakistan-focused payments',
    // Checkout and signed-webhook adapters must be implemented and verified before enabling.
    configured: () => Boolean(process.env.SAFEPAY_API_KEY && process.env.SAFEPAY_SECRET_KEY && process.env.SAFEPAY_WEBHOOK_SECRET),
    adapterReady: () => false,
  },
  lemon_squeezy: {
    displayName: 'Lemon Squeezy',
    description: 'International subscriptions',
    configured: () => Boolean(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID && process.env.LEMONSQUEEZY_WEBHOOK_SECRET && process.env.LEMONSQUEEZY_VARIANT_STARTER_MONTHLY && process.env.LEMONSQUEEZY_VARIANT_GROWTH_MONTHLY && process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY && process.env.LEMONSQUEEZY_VARIANT_AGENCY_MONTHLY && process.env.LEMONSQUEEZY_VARIANT_STARTER_ANNUAL && process.env.LEMONSQUEEZY_VARIANT_GROWTH_ANNUAL && process.env.LEMONSQUEEZY_VARIANT_PRO_ANNUAL && process.env.LEMONSQUEEZY_VARIANT_AGENCY_ANNUAL),
    adapterReady: () => process.env.LEMONSQUEEZY_ADAPTER_READY === 'true',
  },
  manual_bank_transfer: {
    displayName: 'Manual bank transfer',
    description: 'Manual payment requiring admin verification',
    configured: () => Boolean(process.env.MANUAL_PAYMENT_INSTRUCTIONS),
    adapterReady: () => false,
  },
};

const safePublicConfig = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const allowed = ['badge','help_text','currency_label','country_note'];
  const safe = {};
  for (const key of allowed) {
    if (typeof value[key] === 'string') safe[key] = value[key].slice(0, 120);
  }
  return safe;
};

const statusFor = (providerKey) => {
  const provider = PROVIDERS[providerKey];
  return {
    configured: Boolean(provider && provider.configured()),
    adapterReady: Boolean(provider && provider.adapterReady()),
    ready: Boolean(provider && provider.configured() && provider.adapterReady()),
  };
};

const publicList = async (_req, res) => {
  try {
    const rows = await queryAll(
      'SELECT id,provider_key,display_name,description,enabled,public_config,sort_order FROM payment_methods WHERE enabled=TRUE ORDER BY sort_order,display_name'
    );
    const methods = rows.filter(row => statusFor(row.provider_key).ready).map(row => ({
      id: row.id,
      provider: row.provider_key,
      name: row.display_name,
      description: row.description,
      config: safePublicConfig(row.public_config),
    }));
    res.set('Cache-Control', 'no-store');
    return res.json({ methods });
  } catch (err) {
    console.error('Public payment methods lookup failed:', err.message);
    return res.status(500).json({ error: 'Could not load payment methods.' });
  }
};

const adminList = async (_req, res) => {
  try {
    const rows = await queryAll(
      'SELECT id,provider_key,display_name,description,enabled,sort_order,created_at,updated_at FROM payment_methods ORDER BY sort_order,display_name'
    );
    return res.json({ methods: rows.map(row => ({ ...row, ...statusFor(row.provider_key) })) });
  } catch (err) {
    console.error('Admin payment methods lookup failed:', err.message);
    return res.status(500).json({ error: 'Could not load payment methods.' });
  }
};

const create = async (req, res) => {
  const providerKey = String(req.body?.provider_key || '');
  const provider = PROVIDERS[providerKey];
  const displayName = typeof req.body?.display_name === 'string' ? req.body.display_name.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  const sortOrder = req.body?.sort_order === undefined ? 100 : Number(req.body.sort_order);
  if (!provider || !displayName || displayName.length > 80 || description.length > 240 ||
      !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
    return res.status(400).json({ error: 'Invalid payment method fields.' });
  }
  // Do not accept secret credentials, arbitrary checkout URLs, or client-supplied "configured" flags.
  if (req.body?.secret || req.body?.api_key || req.body?.checkout_url || req.body?.enabled) {
    return res.status(400).json({ error: 'Secrets and checkout configuration must be configured server-side. New methods start disabled.' });
  }
  try {
    const id = uuidv4();
    const row = await queryOne(
      'INSERT INTO payment_methods (id,provider_key,display_name,description,enabled,public_config,sort_order,created_at,updated_at) VALUES ($1,$2,$3,$4,FALSE,$5::jsonb,$6,NOW(),NOW()) RETURNING id,provider_key,display_name,description,enabled,public_config,sort_order,created_at,updated_at',
      [id, providerKey, displayName, description, JSON.stringify({}), sortOrder]
    );
    return res.status(201).json({ method: { ...row, ...statusFor(providerKey) } });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'This provider already exists. Edit its existing entry instead.' });
    console.error('Payment method create failed:', err.message);
    return res.status(500).json({ error: 'Could not create payment method.' });
  }
};

const update = async (req, res) => {
  const id = req.params.id;
  const allowed = ['display_name','description','sort_order','enabled'];
  const fields = Object.keys(req.body || {});
  if (!fields.length || fields.some(field => !allowed.includes(field))) {
    return res.status(400).json({ error: 'Only display_name, description, sort_order, and enabled can be updated.' });
  }
  try {
    const current = await queryOne('SELECT id,provider_key FROM payment_methods WHERE id=$1', [id]);
    if (!current) return res.status(404).json({ error: 'Payment method not found.' });
    const values = [];
    const sets = [];
    for (const field of fields) {
      const value = req.body[field];
      if (field === 'display_name' && (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 80)) return res.status(400).json({ error: 'Display name must be 2–80 characters.' });
      if (field === 'description' && (typeof value !== 'string' || value.trim().length > 240)) return res.status(400).json({ error: 'Description must be 240 characters or fewer.' });
      if (field === 'sort_order' && (!Number.isInteger(value) || value < 0 || value > 10000)) return res.status(400).json({ error: 'Invalid sort order.' });
      if (field === 'enabled' && typeof value !== 'boolean') return res.status(400).json({ error: 'Enabled must be a boolean.' });
      if (field === 'enabled' && value === true) {
        const status = statusFor(current.provider_key);
        if (!status.configured) return res.status(409).json({ error: 'Provider credentials are missing. Configure them as server-side environment variables first.' });
        if (!status.adapterReady) return res.status(409).json({ error: 'This provider checkout/webhook adapter has not passed integration testing. It cannot be enabled yet.' });
      }
      values.push(field === 'display_name' || field === 'description' ? value.trim() : value);
      sets.push(field + '=$' + values.length);
    }
    values.push(id);
    const row = await queryOne(
      'UPDATE payment_methods SET ' + sets.join(',') + ',updated_at=NOW() WHERE id=$' + values.length + ' RETURNING id,provider_key,display_name,description,enabled,public_config,sort_order,created_at,updated_at',
      values
    );
    return res.json({ method: { ...row, ...statusFor(row.provider_key) } });
  } catch (err) {
    console.error('Payment method update failed:', err.message);
    return res.status(500).json({ error: 'Could not update payment method.' });
  }
};

const remove = async (req, res) => {
  try {
    const result = await query('DELETE FROM payment_methods WHERE id=$1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Payment method not found.' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Payment method removal failed:', err.message);
    return res.status(500).json({ error: 'Could not remove payment method.' });
  }
};

module.exports = { publicList, adminList, create, update, remove };

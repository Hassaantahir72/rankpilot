const express = require('express');
const router = express.Router();
const { authMiddleware, requireVerified } = require('../middleware/auth');
const { queryOne } = require('../config/db');

const PLAN_IDS = ['starter','growth','pro','agency'];
const INTERVALS = ['monthly','annual'];
const variantEnv = (plan, interval) => 'LEMONSQUEEZY_VARIANT_' + plan.toUpperCase() + '_' + interval.toUpperCase();

router.post('/checkout', authMiddleware, requireVerified, async (req, res) => {
  const provider = req.body?.provider;
  const plan = req.body?.plan;
  const interval = req.body?.interval || 'monthly';
  if (provider !== 'lemon_squeezy') return res.status(503).json({ error: 'This provider checkout integration is not available yet.' });
  if (!PLAN_IDS.includes(plan) || !INTERVALS.includes(interval)) return res.status(400).json({ error: 'Choose a valid plan and billing interval.' });
  const variantId = process.env[variantEnv(plan, interval)];
  if (process.env.LEMONSQUEEZY_ADAPTER_READY !== 'true' || !process.env.LEMONSQUEEZY_API_KEY || !process.env.LEMONSQUEEZY_STORE_ID ||
      !process.env.LEMONSQUEEZY_WEBHOOK_SECRET || !variantId || !process.env.FRONTEND_URL) {
    return res.status(503).json({ error: 'Lemon Squeezy is not fully configured for checkout.' });
  }
  try {
    const method = await queryOne("SELECT id FROM payment_methods WHERE provider_key='lemon_squeezy' AND enabled=TRUE");
    if (!method) return res.status(503).json({ error: 'This payment method is not enabled by the administrator.' });
    const existing = await queryOne('SELECT stripe_subscription_id,provider_subscription_id FROM users WHERE id=$1', [req.user.id]);
    if (existing?.stripe_subscription_id || existing?.provider_subscription_id) {
      return res.status(409).json({ error: 'An existing subscription is linked to this account. Contact support to change providers.', code: 'SUBSCRIPTION_EXISTS' });
    }
    const frontend = new URL(process.env.FRONTEND_URL);
    if (process.env.NODE_ENV === 'production' && frontend.protocol !== 'https:') return res.status(503).json({ error: 'Secure frontend URL is not configured.' });
    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.LEMONSQUEEZY_API_KEY, 'Accept': 'application/vnd.api+json', 'Content-Type': 'application/vnd.api+json' },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: { email: req.user.email, name: req.user.name || undefined, custom: { user_id: String(req.user.id), plan, interval } },
            product_options: { redirect_url: frontend.origin + '/onboarding?checkout=complete&plan=' + encodeURIComponent(plan) + '&interval=' + encodeURIComponent(interval) },
            test_mode: process.env.LEMONSQUEEZY_TEST_MODE === 'true',
          },
          relationships: {
            store: { data: { type: 'stores', id: String(process.env.LEMONSQUEEZY_STORE_ID) } },
            variant: { data: { type: 'variants', id: String(variantId) } },
          },
        },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Lemon Squeezy checkout API rejected request:', response.status);
      return res.status(502).json({ error: 'Could not create checkout with the payment provider.' });
    }
    const checkoutUrl = payload?.data?.attributes?.url;
    let parsed;
    try { parsed = new URL(checkoutUrl); } catch {}
    if (!parsed || parsed.protocol !== 'https:' || !(parsed.hostname === 'lemonsqueezy.com' || parsed.hostname.endsWith('.lemonsqueezy.com'))) {
      return res.status(502).json({ error: 'Payment provider returned an invalid checkout URL.' });
    }
    return res.json({ url: parsed.toString(), provider: 'lemon_squeezy' });
  } catch (err) {
    console.error('Lemon Squeezy checkout failed:', err.message);
    return res.status(500).json({ error: 'Could not start checkout.' });
  }
});

router.post('/portal', authMiddleware, requireVerified, async (req, res) => {
  try {
    const user = await queryOne('SELECT provider_subscription_id,payment_provider FROM users WHERE id=$1', [req.user.id]);
    if (!user?.provider_subscription_id || user.payment_provider !== 'lemon_squeezy') {
      return res.status(409).json({ error: 'No Lemon Squeezy subscription is linked to this account.', code: 'LEGACY_BILLING' });
    }
    if (!process.env.LEMONSQUEEZY_API_KEY) return res.status(503).json({ error: 'Provider billing management is not configured.' });
    const response = await fetch('https://api.lemonsqueezy.com/v1/subscriptions/' + encodeURIComponent(user.provider_subscription_id), {
      headers: { 'Authorization': 'Bearer ' + process.env.LEMONSQUEEZY_API_KEY, 'Accept': 'application/vnd.api+json' },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ error: 'Could not retrieve the provider billing portal.' });
    const portalUrl = payload?.data?.attributes?.urls?.customer_portal || payload?.data?.attributes?.urls?.update_payment_method;
    let parsed;
    try { parsed = new URL(portalUrl); } catch {}
    if (!parsed || parsed.protocol !== 'https:' || !(parsed.hostname === 'lemonsqueezy.com' || parsed.hostname.endsWith('.lemonsqueezy.com'))) {
      return res.status(502).json({ error: 'Payment provider returned an invalid billing portal URL.' });
    }
    return res.json({ url: parsed.toString(), provider: 'lemon_squeezy' });
  } catch (err) {
    console.error('Lemon Squeezy billing portal failed:', err.message);
    return res.status(500).json({ error: 'Could not open provider billing management.' });
  }
});

module.exports = router;

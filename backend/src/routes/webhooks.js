const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const billingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many billing requests. Please try again later.' },
});
const { authMiddleware, requireVerified } = require('../middleware/auth');
const { queryOne, query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error('Stripe billing is not configured.');
    error.code = 'STRIPE_NOT_CONFIGURED';
    throw error;
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
};

const getPlanMap = () => {
  const configured = [
    [process.env.STRIPE_PRICE_STARTER, 'starter'],
    [process.env.STRIPE_PRICE_GROWTH, 'growth'],
    [process.env.STRIPE_PRICE_PRO, 'pro'],
    [process.env.STRIPE_PRICE_AGENCY, 'agency'],
    [process.env.STRIPE_PRICE_STARTER_ANNUAL, 'starter'],
    [process.env.STRIPE_PRICE_GROWTH_ANNUAL, 'growth'],
    [process.env.STRIPE_PRICE_PRO_ANNUAL, 'pro'],
    [process.env.STRIPE_PRICE_AGENCY_ANNUAL, 'agency'],
  ].filter(([priceId]) => typeof priceId === 'string' && priceId.startsWith('price_'));
  const map = Object.create(null);
  const ambiguous = new Set();
  for (const [priceId, plan] of configured) {
    if (map[priceId] && map[priceId] !== plan) ambiguous.add(priceId);
    else map[priceId] = plan;
  }
  // Fail closed if an operator accidentally assigns one Stripe Price ID to multiple plans.
  for (const priceId of ambiguous) delete map[priceId];
  return map;
};

const getFrontendBaseUrl = () => {
  const configured = process.env.FRONTEND_URL;
  if (!configured) throw new Error('FRONTEND_URL is not configured.');
  const parsed = new URL(configured);
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error('FRONTEND_URL must use HTTPS in production.');
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Invalid FRONTEND_URL protocol.');
  return parsed.origin;
};

const recordBillingHistory = async ({ userId, externalId, amount, currency, plan, periodStart = null, periodEnd = null }) => {
  await query(
    `INSERT INTO billing_history (id,user_id,stripe_invoice_id,amount,currency,status,plan,period_start,period_end,created_at)
     VALUES ($1,$2,$3,$4,$5,'paid',$6,$7,$8,NOW())
`,
    [uuidv4(), userId, externalId, (amount || 0) / 100, currency || 'usd', plan,
      periodStart ? new Date(periodStart * 1000) : null,
      periodEnd ? new Date(periodEnd * 1000) : null]
  );
};

// Stripe webhook: this route must receive the unparsed raw body. Signature verification is mandatory.
router.post('/stripe', async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Stripe webhook is not configured.' });
  }

  let stripe;
  let event;
  try {
    stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.warn('Stripe webhook signature verification failed.');
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  try {
    const claimed = await queryOne(
      'INSERT INTO stripe_webhook_events (id,event_type,created_at) VALUES ($1,$2,NOW()) ON CONFLICT (id) DO NOTHING RETURNING id',
      [event.id, event.type]
    );
    if (!claimed) return res.status(200).json({ received: true, duplicate: true });

    const planMap = getPlanMap();
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId || session.client_reference_id;
        const metadataPriceId = session.metadata?.priceId;
        if (session.mode !== 'subscription' || !userId || !session.customer || !session.subscription || !metadataPriceId) {
          throw new Error('Checkout session is missing required subscription metadata.');
        }

        const plan = planMap[metadataPriceId];
        if (!plan) throw new Error('Checkout session references an unconfigured price.');

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const actualPriceId = subscription.items?.data?.[0]?.price?.id;
        if (String(subscription.customer) !== String(session.customer) || actualPriceId !== metadataPriceId) {
          throw new Error('Checkout customer or price does not match the subscription.');
        }

        // Only grant paid access after Stripe confirms an active subscription and completed/no-payment-required first payment.
        if (subscription.status !== 'active' || !['paid', 'no_payment_required'].includes(session.payment_status)) {
          break;
        }

        const otherOwner = await queryOne(
          'SELECT id FROM users WHERE stripe_customer_id=$1 AND id<>$2 LIMIT 1',
          [session.customer, userId]
        );
        if (otherOwner) throw new Error('Stripe customer is associated with another account.');

        const updated = await query(
          `UPDATE users SET plan=$1,subscription_status='active',stripe_customer_id=$2,
             stripe_subscription_id=$3,stripe_price_id=$4,updated_at=NOW()
           WHERE id=$5 AND (stripe_customer_id IS NULL OR stripe_customer_id=$2)`,
          [plan, session.customer, session.subscription, metadataPriceId, userId]
        );
        if (updated.rowCount !== 1) throw new Error('Unable to safely associate Stripe subscription with account.');

        // Invoice webhooks are the source of truth for payment history; do not double-count checkout sessions.
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const user = await queryOne('SELECT id,plan,stripe_subscription_id FROM users WHERE stripe_customer_id=$1', [invoice.customer]);
        if (user) {
          let plan = user.plan;
          const subscriptionId = invoice.subscription;
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = subscription.items?.data?.[0]?.price?.id;
            if (planMap[priceId]) plan = planMap[priceId];
          }
          await query(
            `UPDATE users SET plan=$1,subscription_status='active',
              stripe_subscription_id=COALESCE($2,stripe_subscription_id),updated_at=NOW() WHERE id=$3`,
            [plan, subscriptionId || null, user.id]
          );
          await recordBillingHistory({
            userId: user.id, externalId: invoice.id, amount: invoice.amount_paid,
            currency: invoice.currency, plan,
            periodStart: invoice.period_start, periodEnd: invoice.period_end,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await query("UPDATE users SET subscription_status='past_due',updated_at=NOW() WHERE stripe_customer_id=$1", [invoice.customer]);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await query(
          `UPDATE users SET subscription_status='cancelled',plan='free',stripe_subscription_id=NULL,
             stripe_price_id=NULL,updated_at=NOW() WHERE stripe_subscription_id=$1`,
          [subscription.id]
        );
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const plan = planMap[priceId];
        if (!plan) {
          // A legacy/unconfigured price must never grant a new tier; acknowledge it to avoid endless Stripe retries.
          console.error('Stripe subscription references an unconfigured price; subscription was not upgraded.');
          break;
        }

        const statusMap = {
          active: 'active',
          past_due: 'past_due',
          unpaid: 'past_due',
          paused: 'paused',
          canceled: 'cancelled',
          incomplete: 'past_due',
          incomplete_expired: 'cancelled',
          trialing: 'past_due',
        };
        const status = statusMap[subscription.status] || 'past_due';
        const metadataUserId = subscription.metadata?.userId;
        const customerOwner = await queryOne(
          'SELECT id FROM users WHERE stripe_customer_id=$1 ORDER BY created_at ASC LIMIT 1',
          [subscription.customer]
        );
        const userId = customerOwner?.id || metadataUserId;
        if (!userId) break;
        const updated = await query(
          `UPDATE users SET plan=$1,subscription_status=$2,stripe_price_id=$3,
             stripe_subscription_id=$4,stripe_customer_id=COALESCE(stripe_customer_id,$5),updated_at=NOW()
           WHERE id=$6 AND (stripe_customer_id IS NULL OR stripe_customer_id=$5)
             AND (stripe_subscription_id IS NULL OR stripe_subscription_id=$4)`,
          [status === 'active' ? plan : (status === 'cancelled' ? 'free' : plan), status, priceId,
            subscription.id, subscription.customer, userId]
        );
        if (updated.rowCount !== 1) throw new Error('Could not safely associate subscription update with account.');
        break;
      }
    }
    res.status(200).json({ received: true });
  } catch (err) {
    // Release the idempotency claim so Stripe can retry failed processing.
    try { await query('DELETE FROM stripe_webhook_events WHERE id=$1', [event.id]); } catch {}
    console.error('Stripe webhook processing failed:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed. Stripe may retry this event.' });
  }
});

// Create a subscription checkout session. Plan and price are allow-listed server-side.
router.post('/create-checkout', authMiddleware, requireVerified, billingRateLimit, async (req, res) => {
  const { priceId } = req.body || {};
  const planMap = getPlanMap();
  if (typeof priceId !== 'string' || !planMap[priceId]) {
    return res.status(400).json({ error: 'Invalid plan selected.' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Checkout is not configured yet.' });
  }

  try {
    const stripe = getStripe();
    const frontendUrl = getFrontendBaseUrl();
    const current = await queryOne(
      'SELECT plan,subscription_status,stripe_customer_id,stripe_subscription_id FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!current) return res.status(401).json({ error: 'Account not found.' });

    if (current.stripe_subscription_id && ['active', 'past_due', 'paused'].includes(current.subscription_status)) {
      return res.status(409).json({
        error: 'You already have a subscription. Use Manage subscription to change plans or update payment methods.',
        code: 'SUBSCRIPTION_EXISTS',
      });
    }

    let customerId = current.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create(
        { email: req.user.email, name: req.user.name, metadata: { userId: req.user.id } },
        { idempotencyKey: `rankpilot-customer-${req.user.id}` }
      );
      customerId = customer.id;
      const saved = await query(
        'UPDATE users SET stripe_customer_id=$1 WHERE id=$2 AND (stripe_customer_id IS NULL OR stripe_customer_id=$1)',
        [customerId, req.user.id]
      );
      if (saved.rowCount !== 1) {
        const refreshed = await queryOne('SELECT stripe_customer_id FROM users WHERE id=$1', [req.user.id]);
        if (!refreshed?.stripe_customer_id) throw new Error('Could not safely save Stripe customer.');
        customerId = refreshed.stripe_customer_id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard/billing?cancelled=true`,
      client_reference_id: req.user.id,
      metadata: { userId: req.user.id, priceId },
      subscription_data: { metadata: { userId: req.user.id, priceId } },
      payment_method_collection: 'always',
      allow_promotion_codes: true,
    }, {
      idempotencyKey: `rankpilot-checkout-${req.user.id}-${priceId}-${Math.floor(Date.now() / 60000)}`,
    });

    if (!session.url || !session.url.startsWith('https://checkout.stripe.com/')) {
      throw new Error('Stripe did not return a valid hosted checkout URL.');
    }
    return res.json({ url: session.url });
  } catch (err) {
    if (err.code === 'STRIPE_NOT_CONFIGURED') return res.status(503).json({ error: 'Checkout is not configured yet.' });
    console.error('Checkout session creation failed:', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

// Create a customer-owned billing portal session for subscription and payment-method management.
router.post('/portal', authMiddleware, requireVerified, billingRateLimit, async (req, res) => {
  try {
    const stripe = getStripe();
    const frontendUrl = getFrontendBaseUrl();
    const user = await queryOne('SELECT stripe_customer_id FROM users WHERE id=$1', [req.user.id]);
    if (!user?.stripe_customer_id) return res.status(400).json({ error: 'No billing customer found. Choose a plan first.' });

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${frontendUrl}/dashboard/billing`,
    });
    if (!session.url || !session.url.startsWith('https://billing.stripe.com/')) {
      throw new Error('Stripe did not return a valid billing portal URL.');
    }
    return res.json({ url: session.url });
  } catch (err) {
    if (err.code === 'STRIPE_NOT_CONFIGURED') return res.status(503).json({ error: 'Billing portal is not configured yet.' });
    console.error('Billing portal creation failed:', err.message);
    return res.status(500).json({ error: 'Failed to open billing portal.' });
  }
});

module.exports = router;

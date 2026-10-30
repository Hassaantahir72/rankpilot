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

    // Keep a durable, inspectable record of every claimed Stripe event.
    await query(
      `INSERT INTO provider_event_inbox
         (id,provider,provider_event_id,event_type,status,payload,received_at)
       VALUES ($1,'stripe',$2,$3,'received',$4,NOW())
       ON CONFLICT (provider,provider_event_id) DO UPDATE
         SET status='received',payload=EXCLUDED.payload,error=NULL,processed_at=NULL,received_at=NOW()`,
      [uuidv4(), event.id, event.type, JSON.stringify(event)]
    );

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

          // Durable order + transaction ledger. Amounts remain in minor units and original currency.
          const orderId = uuidv4();
          await query(
            `INSERT INTO orders (id,user_id,provider,provider_order_id,subscription_id,status,currency,subtotal_minor,total_minor,plan,description,metadata,created_at,updated_at)
             VALUES ($1,$2,'stripe',$3,$4,'paid',$5,$6,$6,$7,'Subscription invoice',$8,NOW(),NOW())
             ON CONFLICT (provider,provider_order_id) DO UPDATE SET status='paid',updated_at=NOW()`,
            [orderId,user.id,invoice.id,subscriptionId || null,(invoice.currency || 'usd').toUpperCase(),invoice.amount_paid || 0,plan,JSON.stringify({ invoiceNumber: invoice.number || null })]
          );
          const order = await queryOne('SELECT id FROM orders WHERE provider=$1 AND provider_order_id=$2', ['stripe',invoice.id]);
          await query(
            `INSERT INTO payment_transactions (id,order_id,user_id,provider,provider_transaction_id,provider_event_id,type,status,amount_minor,currency,description,occurred_at,metadata)
             VALUES ($1,$2,$3,'stripe',$4,$5,'payment','succeeded',$6,$7,'Stripe invoice payment',NOW(),$8)
             ON CONFLICT (provider,provider_transaction_id,type) DO UPDATE SET status='succeeded',amount_minor=EXCLUDED.amount_minor,metadata=EXCLUDED.metadata`,
            [uuidv4(),order.id,user.id,invoice.payment_intent || invoice.id,event.id,invoice.amount_paid || 0,(invoice.currency || 'usd').toUpperCase(),JSON.stringify({ invoiceId: invoice.id, subscriptionId: subscriptionId || null })]
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await query("UPDATE users SET subscription_status='past_due',updated_at=NOW() WHERE stripe_customer_id=$1", [invoice.customer]);
        const failedUser = await queryOne('SELECT id FROM users WHERE stripe_customer_id=$1', [invoice.customer]);
        if (failedUser) {
          const failedOrderId = uuidv4();
          await query(
            `INSERT INTO orders (id,user_id,provider,provider_order_id,subscription_id,status,currency,subtotal_minor,total_minor,description,metadata,created_at,updated_at)
             VALUES ($1,$2,'stripe',$3,$4,'failed',$5,$6,$6,'Failed subscription invoice',$7,NOW(),NOW())
             ON CONFLICT (provider,provider_order_id) DO UPDATE SET status='failed',updated_at=NOW()`,
            [failedOrderId,failedUser.id,invoice.id,invoice.subscription || null,(invoice.currency || 'usd').toUpperCase(),invoice.amount_due || 0,JSON.stringify({ invoiceNumber: invoice.number || null })]
          );
          const failedOrder = await queryOne('SELECT id FROM orders WHERE provider=$1 AND provider_order_id=$2', ['stripe',invoice.id]);
          await query(
            `INSERT INTO payment_transactions (id,order_id,user_id,provider,provider_transaction_id,provider_event_id,type,status,amount_minor,currency,description,occurred_at,metadata)
             VALUES ($1,$2,$3,'stripe',$4,$5,'payment','failed',$6,$7,'Failed Stripe invoice payment',NOW(),$8)
             ON CONFLICT (provider,provider_transaction_id,type) DO UPDATE SET status='failed',amount_minor=EXCLUDED.amount_minor,metadata=EXCLUDED.metadata`,
            [uuidv4(),failedOrder.id,failedUser.id,invoice.payment_intent || invoice.id,event.id,invoice.amount_due || 0,(invoice.currency || 'usd').toUpperCase(),JSON.stringify({ invoiceId: invoice.id })]
          );
        }
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
        const customerOwner = await queryOne(
          'SELECT id FROM users WHERE stripe_subscription_id=$1 OR stripe_customer_id=$2 ORDER BY (stripe_subscription_id=$1) DESC, created_at ASC LIMIT 1',
          [subscription.id, subscription.customer]
        );
        const userId = customerOwner?.id || subscription.metadata?.userId;
        if (!userId) break;

        if (!plan) {
          // Keep legacy entitlements unchanged, but still enforce failed/canceled subscription states.
          console.error('Stripe subscription references an unconfigured price; no new plan will be granted.');
          if (status === 'cancelled') {
            await query(
              `UPDATE users SET plan='free',subscription_status='cancelled',stripe_subscription_id=NULL,
                 stripe_price_id=NULL,updated_at=NOW() WHERE id=$1 AND stripe_customer_id=$2`,
              [userId, subscription.customer]
            );
          } else {
            const updated = await query(
              'UPDATE users SET subscription_status=$1,stripe_subscription_id=$2,stripe_customer_id=COALESCE(stripe_customer_id,$3),updated_at=NOW() WHERE id=$4 AND (stripe_customer_id IS NULL OR stripe_customer_id=$3) AND (stripe_subscription_id IS NULL OR stripe_subscription_id=$2)',
              [status, subscription.id, subscription.customer, userId]
            );
            if (updated.rowCount !== 1) throw new Error('Could not safely associate legacy subscription update with account.');
          }
          break;
        }

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
    await query(
      `UPDATE provider_event_inbox SET status='processed',processed_at=NOW(),error=NULL
       WHERE provider='stripe' AND provider_event_id=$1`, [event.id]
    );
    res.status(200).json({ received: true });
  } catch (err) {
    // Retain the failed inbox row for admin visibility, but release the claim so Stripe can retry.
    try {
      await query(
        `UPDATE provider_event_inbox SET status='failed',error=$2
         WHERE provider='stripe' AND provider_event_id=$1`,
        [event.id, String(err.message || 'Processing failed').slice(0, 1000)]
      );
    } catch {}
    try { await query('DELETE FROM stripe_webhook_events WHERE id=$1', [event.id]); } catch {}
    console.error('Stripe webhook processing failed:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed. Stripe may retry this event.' });
  }
});

// New Stripe checkouts are disabled for this Pakistan-based deployment.
// Existing Stripe subscriptions retain the legacy portal/webhook paths for migration support.
router.post('/create-checkout', authMiddleware, requireVerified, billingRateLimit, (_req, res) => {
  return res.status(410).json({
    error: 'New Stripe checkout is disabled. Use an enabled provider from the payment methods shown on the website.',
    code: 'STRIPE_CHECKOUT_DISABLED',
  });
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

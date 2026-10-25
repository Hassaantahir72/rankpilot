const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { queryOne, query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Stripe webhook — raw body
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const planMap = Object.fromEntries([
    [process.env.STRIPE_PRICE_STARTER, 'starter'],
    [process.env.STRIPE_PRICE_GROWTH, 'growth'],
    [process.env.STRIPE_PRICE_PRO, 'pro'],
    [process.env.STRIPE_PRICE_AGENCY, 'agency'],
    [process.env.STRIPE_PRICE_STARTER_ANNUAL, 'starter'],
    [process.env.STRIPE_PRICE_GROWTH_ANNUAL, 'growth'],
    [process.env.STRIPE_PRICE_PRO_ANNUAL, 'pro'],
    [process.env.STRIPE_PRICE_AGENCY_ANNUAL, 'agency'],
  ].filter(([priceId]) => Boolean(priceId)));

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const priceId = session.metadata?.priceId;
        if (userId) {
          const plan = planMap[priceId];
          if (!plan) throw new Error('Checkout completed with an unconfigured Stripe price ID.');
          await query('UPDATE users SET plan=$1,subscription_status=$$active$$,stripe_customer_id=$2,stripe_subscription_id=$3,stripe_price_id=$4,updated_at=NOW() WHERE id=$5',
            [plan, session.customer, session.subscription, priceId, userId]);
          await query('INSERT INTO billing_history (id,user_id,stripe_invoice_id,amount,currency,status,plan,created_at) VALUES ($1,$2,$3,$4,$5,$$paid$$,$6,NOW())',
            [uuidv4(), userId, session.id, (session.amount_total||0)/100, session.currency||'usd', plan]);
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const user = await queryOne('SELECT id,plan FROM users WHERE stripe_customer_id=$1', [invoice.customer]);
        if (user) {
          await query("UPDATE users SET subscription_status='active',updated_at=NOW() WHERE id=$1", [user.id]);
          await query('INSERT INTO billing_history (id,user_id,stripe_invoice_id,amount,currency,status,plan,period_start,period_end,created_at) VALUES ($1,$2,$3,$4,$5,$$paid$$,$6,$7,$8,NOW())',
            [uuidv4(), user.id, invoice.id, (invoice.amount_paid||0)/100, invoice.currency||'usd', user.plan,
             invoice.period_start ? new Date(invoice.period_start*1000) : null,
             invoice.period_end   ? new Date(invoice.period_end*1000)   : null]);
        }
        break;
      }
      case 'invoice.payment_failed':
        await query("UPDATE users SET subscription_status='past_due',updated_at=NOW() WHERE stripe_customer_id=$1", [event.data.object.customer]);
        break;
      case 'customer.subscription.deleted':
        await query("UPDATE users SET subscription_status='cancelled',plan='free',updated_at=NOW() WHERE stripe_subscription_id=$1", [event.data.object.id]);
        break;
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = planMap[priceId];
        if (!plan) throw new Error('Subscription updated with an unconfigured Stripe price ID.');
        await query('UPDATE users SET plan=$1,subscription_status=$2,stripe_price_id=$3,updated_at=NOW() WHERE stripe_subscription_id=$4',
          [plan, sub.status, priceId, sub.id]);
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'Webhook processing failed. Stripe may retry this event.' });
  }
  res.json({ received: true });
});

// Create Stripe checkout session
router.post('/create-checkout', authMiddleware, async (req, res) => {
  const { priceId } = req.body;
  const validPrices = [process.env.STRIPE_PRICE_STARTER, process.env.STRIPE_PRICE_GROWTH, process.env.STRIPE_PRICE_PRO, process.env.STRIPE_PRICE_AGENCY, process.env.STRIPE_PRICE_STARTER_ANNUAL, process.env.STRIPE_PRICE_GROWTH_ANNUAL, process.env.STRIPE_PRICE_PRO_ANNUAL, process.env.STRIPE_PRICE_AGENCY_ANNUAL].filter(Boolean);
  if (!validPrices.includes(priceId)) return res.status(400).json({ error: 'Invalid plan selected.' });

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const savedCustomer = await queryOne('SELECT stripe_customer_id FROM users WHERE id=$1', [req.user.id]);
    let customerId = savedCustomer?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: req.user.email, name: req.user.name, metadata: { userId: req.user.id } });
      customerId = customer.id;
      await query('UPDATE users SET stripe_customer_id=$1 WHERE id=$2', [customerId, req.user.id]);
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/billing?cancelled=true`,
      metadata: { userId: req.user.id, priceId },
      allow_promotion_codes: true,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

// Open Stripe billing portal
router.post('/portal', authMiddleware, async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const user = await queryOne('SELECT stripe_customer_id FROM users WHERE id=$1', [req.user.id]);
    if (!user?.stripe_customer_id) return res.status(400).json({ error: 'No active subscription found.' });
    const session = await stripe.billingPortal.sessions.create({ customer: user.stripe_customer_id, return_url: `${process.env.FRONTEND_URL}/dashboard/billing` });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    res.status(500).json({ error: 'Failed to open billing portal.' });
  }
});

module.exports = router;

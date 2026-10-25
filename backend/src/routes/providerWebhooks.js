const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { query, queryOne } = require('../config/db');

const variantPlans = () => {
  const map = Object.create(null);
  for (const plan of ['starter','growth','pro','agency']) {
    for (const interval of ['monthly','annual']) {
      const id = process.env['LEMONSQUEEZY_VARIANT_' + plan.toUpperCase() + '_' + interval.toUpperCase()];
      if (id && /^\d+$/.test(String(id))) map[String(id)] = plan;
    }
  }
  return map;
};

const validSignature = (rawBody, supplied, secret) => {
  if (!Buffer.isBuffer(rawBody) || typeof supplied !== 'string' || !secret || !/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  let actual;
  try { actual = Buffer.from(supplied, 'hex'); } catch { return false; }
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

router.post('/lemon-squeezy', async (req, res) => {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: 'Webhook is not configured.' });
  if (!validSignature(req.body, req.headers['x-signature'], secret)) return res.status(400).json({ error: 'Invalid webhook signature.' });

  let event;
  try { event = JSON.parse(req.body.toString('utf8')); }
  catch { return res.status(400).json({ error: 'Invalid webhook payload.' }); }
  const eventName = event?.meta?.event_name;
  const resource = event?.data;
  const attrs = resource?.attributes || {};
  const subscriptionId = resource?.type === 'subscriptions' ? String(resource.id || '') : '';
  if (!eventName || !resource?.id) return res.status(400).json({ error: 'Incomplete webhook payload.' });

  // Orders are not proof of an active subscription. Only signed subscription lifecycle events affect entitlements.
  const lifecycleEvents = new Set(['subscription_created','subscription_updated','subscription_resumed','subscription_cancelled','subscription_expired','subscription_paused','subscription_payment_success','subscription_payment_failed']);
  if (!lifecycleEvents.has(eventName)) return res.status(200).json({ received: true, ignored: true });
  const eventKey = crypto.createHash('sha256')
    .update(['lemon_squeezy',eventName,String(resource.id),String(attrs.updated_at || ''),String(attrs.status || ''),String(attrs.variant_id || '')].join(':'))
    .digest('hex');

  try {
    const claimed = await queryOne(
      'INSERT INTO payment_provider_events (event_key,provider_key,event_type,created_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (event_key) DO NOTHING RETURNING event_key',
      [eventKey,'lemon_squeezy',eventName]
    );
    if (!claimed) return res.status(200).json({ received: true, duplicate: true });
    const plan = variantPlans()[String(attrs.variant_id || '')];
    const custom = event?.meta?.custom_data || {};
    let user = subscriptionId ? await queryOne("SELECT id,plan,provider_subscription_id,provider_subscription_updated_at FROM users WHERE payment_provider='lemon_squeezy' AND provider_subscription_id=$1", [subscriptionId]) : null;
    if (!user && custom.user_id) user = await queryOne('SELECT id,plan,provider_subscription_id,provider_subscription_updated_at FROM users WHERE id=$1', [String(custom.user_id)]);
    if (!user) {
      await query('DELETE FROM payment_provider_events WHERE event_key=$1', [eventKey]);
      return res.status(200).json({ received: true, pending: true });
    }
    const eventUpdatedAt = attrs.updated_at && !Number.isNaN(Date.parse(attrs.updated_at)) ? new Date(attrs.updated_at) : null;
    if (eventUpdatedAt && user.provider_subscription_updated_at && eventUpdatedAt < new Date(user.provider_subscription_updated_at)) {
      return res.status(200).json({ received: true, stale: true });
    }

    if (['subscription_created','subscription_updated','subscription_resumed'].includes(eventName)) {
      if (attrs.status === 'active' && plan && subscriptionId) {
        const conflict = await queryOne('SELECT id FROM users WHERE provider_subscription_id=$1 AND id<>$2 LIMIT 1', [subscriptionId,user.id]);
        if (conflict) throw new Error('Provider subscription is already linked to another account.');
        const endsAt = attrs.ends_at && !Number.isNaN(Date.parse(attrs.ends_at)) ? new Date(attrs.ends_at) : null;
        const updated = await query(
          "UPDATE users SET plan=$1,subscription_status='active',payment_provider='lemon_squeezy',provider_subscription_id=$2,provider_customer_id=$3,provider_variant_id=$4,provider_subscription_updated_at=COALESCE($6,NOW()),provider_subscription_ends_at=$7,updated_at=NOW() WHERE id=$5 AND stripe_subscription_id IS NULL AND (payment_provider IS NULL OR payment_provider='lemon_squeezy') AND (provider_subscription_id IS NULL OR provider_subscription_id=$2)",
          [plan,subscriptionId,String(attrs.customer_id || ''),String(attrs.variant_id),user.id,eventUpdatedAt,endsAt]
        );
        if (updated.rowCount !== 1) throw new Error('Subscription could not be safely linked to this account.');
      } else if (attrs.status && attrs.status !== 'active' && subscriptionId) {
        await query("UPDATE users SET subscription_status='past_due',provider_subscription_updated_at=COALESCE($3,NOW()),updated_at=NOW() WHERE id=$1 AND payment_provider='lemon_squeezy' AND provider_subscription_id=$2", [user.id,subscriptionId,eventUpdatedAt]);
      }
    } else if (eventName === 'subscription_cancelled') {
      if (subscriptionId) {
        const endsAt = attrs.ends_at && !Number.isNaN(Date.parse(attrs.ends_at)) ? new Date(attrs.ends_at) : null;
        if (endsAt && endsAt > new Date()) {
          // Keep the paid plan until the provider's current paid-through date.
          await query("UPDATE users SET subscription_status='active',provider_subscription_ends_at=$3,provider_subscription_updated_at=COALESCE($4,NOW()),updated_at=NOW() WHERE id=$1 AND payment_provider='lemon_squeezy' AND provider_subscription_id=$2", [user.id,subscriptionId,endsAt,eventUpdatedAt]);
        } else {
          await query("UPDATE users SET plan='free',subscription_status='cancelled',provider_subscription_id=NULL,provider_variant_id=NULL,provider_subscription_ends_at=NULL,provider_subscription_updated_at=COALESCE($3,NOW()),updated_at=NOW() WHERE id=$1 AND payment_provider='lemon_squeezy' AND provider_subscription_id=$2", [user.id,subscriptionId,eventUpdatedAt]);
        }
      }
    } else if (eventName === 'subscription_expired') {
      if (subscriptionId) await query("UPDATE users SET plan='free',subscription_status='cancelled',provider_subscription_id=NULL,provider_variant_id=NULL,provider_subscription_ends_at=NULL,provider_subscription_updated_at=COALESCE($3,NOW()),updated_at=NOW() WHERE id=$1 AND payment_provider='lemon_squeezy' AND provider_subscription_id=$2", [user.id,subscriptionId,eventUpdatedAt]);
    } else if (eventName === 'subscription_paused') {
      if (subscriptionId) await query("UPDATE users SET subscription_status='paused',provider_subscription_updated_at=COALESCE($3,NOW()),updated_at=NOW() WHERE id=$1 AND payment_provider='lemon_squeezy' AND provider_subscription_id=$2", [user.id,subscriptionId,eventUpdatedAt]);
    } else if (eventName === 'subscription_payment_failed') {
      if (subscriptionId) await query("UPDATE users SET subscription_status='past_due',provider_subscription_updated_at=COALESCE($3,NOW()),updated_at=NOW() WHERE id=$1 AND payment_provider='lemon_squeezy' AND provider_subscription_id=$2", [user.id,subscriptionId,eventUpdatedAt]);
    } else if (eventName === 'subscription_payment_success') {
      if (attrs.status === 'active' && plan && subscriptionId) {
        const endsAt = attrs.ends_at && !Number.isNaN(Date.parse(attrs.ends_at)) ? new Date(attrs.ends_at) : null;
        await query("UPDATE users SET plan=$1,subscription_status='active',provider_variant_id=$2,provider_subscription_ends_at=$6,provider_subscription_updated_at=COALESCE($5,NOW()),updated_at=NOW() WHERE id=$3 AND payment_provider='lemon_squeezy' AND provider_subscription_id=$4", [plan,String(attrs.variant_id),user.id,subscriptionId,eventUpdatedAt,endsAt]);
      }
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    try { await query('DELETE FROM payment_provider_events WHERE event_key=$1', [eventKey]); } catch {}
    console.error('Lemon Squeezy webhook processing failed:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
});
module.exports = router;

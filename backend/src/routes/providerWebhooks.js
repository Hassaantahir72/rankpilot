const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { query, queryOne } = require('../config/db');
const { minorAmount, validSignature } = require('../services/lemonSqueezySecurity');

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


const findAccount = async (custom, attrs, subscriptionId) => {
  let user = null;
  if (subscriptionId) {
    user = await queryOne(
      "SELECT id,email,plan,signup_plan,provider_subscription_id,provider_subscription_updated_at FROM users WHERE payment_provider='lemon_squeezy' AND provider_subscription_id=$1 LIMIT 1",
      [String(subscriptionId)]
    );
  }
  if (!user && custom?.user_id) {
    user = await queryOne(
      'SELECT id,email,plan,signup_plan,provider_subscription_id,provider_subscription_updated_at FROM users WHERE id=$1 LIMIT 1',
      [String(custom.user_id)]
    );
  }
  if (!user && attrs?.user_email) {
    user = await queryOne(
      'SELECT id,email,plan,signup_plan,provider_subscription_id,provider_subscription_updated_at FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1',
      [String(attrs.user_email).trim()]
    );
  }
  return user;
};

const recordLemonOrder = async (user, resource, attrs, eventName, eventKey, ledgerAvailable) => {
  if (!ledgerAvailable) return;
  const total = minorAmount(attrs.total);
  const subtotal = minorAmount(attrs.subtotal);
  const tax = minorAmount(attrs.tax);
  const currency = String(attrs.currency || 'USD').toUpperCase();
  if (total === null || !/^[A-Z]{3}$/.test(currency)) throw new Error('Lemon Squeezy order is missing a valid total or currency.');
  const variantId = attrs.first_order_item?.variant_id || attrs.variant_id || '';
  const plan = variantPlans()[String(variantId)] || null;
  const refundAmount = minorAmount(attrs.refunded_amount) ?? total;
  const status = eventName === 'order_refunded'
    ? (refundAmount >= total ? 'refunded' : 'partially_refunded')
    : (attrs.status === 'paid' ? 'paid' : attrs.status === 'pending' ? 'pending' : 'failed');
  const subscriptionId = user.provider_subscription_id || null;
  await query(
    "INSERT INTO orders (id,user_id,provider,provider_order_id,subscription_id,status,currency,subtotal_minor,tax_minor,total_minor,plan,description,metadata,created_at,updated_at) " +
    "VALUES ($1,$2,'lemon_squeezy',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW()) " +
    "ON CONFLICT (provider,provider_order_id) DO UPDATE SET user_id=EXCLUDED.user_id,subscription_id=COALESCE(EXCLUDED.subscription_id,orders.subscription_id),status=EXCLUDED.status,currency=EXCLUDED.currency,subtotal_minor=EXCLUDED.subtotal_minor,tax_minor=EXCLUDED.tax_minor,total_minor=EXCLUDED.total_minor,plan=COALESCE(EXCLUDED.plan,orders.plan),metadata=orders.metadata || EXCLUDED.metadata,updated_at=NOW()",
    [
      uuidv4(), user.id, String(resource.id), subscriptionId, status, currency,
      subtotal ?? total, tax ?? 0, total, plan,
      eventName === 'order_refunded' ? 'Lemon Squeezy refunded order' : 'Lemon Squeezy order',
      JSON.stringify({ eventName, variantId: String(variantId), testMode: Boolean(attrs.test_mode), orderNumber: attrs.order_number ?? null }),
    ]
  );
  const order = await queryOne("SELECT id FROM orders WHERE provider='lemon_squeezy' AND provider_order_id=$1", [String(resource.id)]);
  if (!order) throw new Error('Lemon Squeezy order ledger record could not be retrieved.');

  if (eventName === 'order_refunded') {
    const fullRefund = refundAmount >= total;
    if (fullRefund) {
      await query("UPDATE payment_transactions SET status='refunded' WHERE provider='lemon_squeezy' AND order_id=$1 AND type='payment'", [order.id]);
    }
    const refundKey = 'order-refund:' + String(resource.id) + ':' + String(attrs.refunded_at || attrs.updated_at || eventKey);
    await query(
      "INSERT INTO payment_transactions (id,order_id,user_id,provider,provider_transaction_id,provider_event_id,type,status,amount_minor,currency,description,occurred_at,metadata) " +
      "VALUES ($1,$2,$3,'lemon_squeezy',$4,$5,'refund','succeeded',$6,$7,'Lemon Squeezy order refund',NOW(),$8) " +
      "ON CONFLICT (provider,provider_transaction_id,type) DO UPDATE SET status='succeeded',amount_minor=EXCLUDED.amount_minor,provider_event_id=EXCLUDED.provider_event_id,metadata=payment_transactions.metadata || EXCLUDED.metadata",
      [uuidv4(), order.id, user.id, refundKey, eventKey, refundAmount, currency, JSON.stringify({ orderId: String(resource.id), fullRefund })]
    );
  }
};

const recordLemonInvoice = async (user, resource, attrs, subscriptionId, eventName, eventKey, ledgerAvailable) => {
  if (!ledgerAvailable) return { paymentStatus: 'pending' };
  const total = minorAmount(attrs.total);
  const subtotal = minorAmount(attrs.subtotal);
  const tax = minorAmount(attrs.tax);
  const currency = String(attrs.currency || 'USD').toUpperCase();
  if (total === null || !/^[A-Z]{3}$/.test(currency)) throw new Error('Lemon Squeezy invoice is missing a valid total or currency.');

  const refundedAmount = minorAmount(attrs.refunded_amount) ?? 0;
  const isRefund = eventName === 'subscription_payment_refunded' || attrs.status === 'refunded' || attrs.status === 'partial_refund';
  const paymentStatus = isRefund
    ? (refundedAmount >= total ? 'refunded' : 'succeeded')
    : (eventName === 'subscription_payment_failed' || attrs.status === 'void' ? 'failed' : attrs.status === 'paid' ? 'succeeded' : 'pending');
  const orderStatus = isRefund
    ? (refundedAmount >= total ? 'refunded' : 'partially_refunded')
    : paymentStatus === 'succeeded' ? 'paid' : paymentStatus === 'failed' ? 'failed' : 'pending';

  let order = null;
  if (attrs.billing_reason === 'initial' && subscriptionId) {
    order = await queryOne(
      "SELECT id FROM orders WHERE provider='lemon_squeezy' AND subscription_id=$1 AND user_id=$2 ORDER BY created_at ASC LIMIT 1",
      [String(subscriptionId), user.id]
    );
  }
  if (!order) {
    const orderKey = 'invoice:' + String(resource.id);
    await query(
      "INSERT INTO orders (id,user_id,provider,provider_order_id,subscription_id,status,currency,subtotal_minor,tax_minor,total_minor,plan,description,metadata,created_at,updated_at) " +
      "VALUES ($1,$2,'lemon_squeezy',$3,$4,$5,$6,$7,$8,$9,$10,'Lemon Squeezy subscription invoice',$11,NOW(),NOW()) " +
      "ON CONFLICT (provider,provider_order_id) DO UPDATE SET status=EXCLUDED.status,currency=EXCLUDED.currency,subtotal_minor=EXCLUDED.subtotal_minor,tax_minor=EXCLUDED.tax_minor,total_minor=EXCLUDED.total_minor,plan=COALESCE(EXCLUDED.plan,orders.plan),metadata=orders.metadata || EXCLUDED.metadata,updated_at=NOW()",
      [
        uuidv4(), user.id, orderKey, subscriptionId ? String(subscriptionId) : null, orderStatus,
        currency, subtotal ?? total, tax ?? 0, total, (['starter','growth','pro','agency'].includes(user.plan) ? user.plan : user.signup_plan) || null,
        JSON.stringify({ eventName, invoiceId: String(resource.id), billingReason: attrs.billing_reason || null }),
      ]
    );
    order = await queryOne("SELECT id FROM orders WHERE provider='lemon_squeezy' AND provider_order_id=$1", [orderKey]);
  } else {
    await query(
      'UPDATE orders SET status=$1,currency=$2,subtotal_minor=$3,tax_minor=$4,total_minor=$5,updated_at=NOW() WHERE id=$6',
      [orderStatus, currency, subtotal ?? total, tax ?? 0, total, order.id]
    );
  }

  const transactionId = 'invoice:' + String(resource.id);
  await query(
    "INSERT INTO payment_transactions (id,order_id,user_id,provider,provider_transaction_id,provider_event_id,type,status,amount_minor,currency,description,occurred_at,metadata) " +
    "VALUES ($1,$2,$3,'lemon_squeezy',$4,$5,'payment',$6,$7,$8,'Lemon Squeezy subscription invoice',COALESCE($9,NOW()),$10) " +
    "ON CONFLICT (provider,provider_transaction_id,type) DO UPDATE SET order_id=COALESCE(EXCLUDED.order_id,payment_transactions.order_id),status=EXCLUDED.status,amount_minor=EXCLUDED.amount_minor,provider_event_id=EXCLUDED.provider_event_id,metadata=payment_transactions.metadata || EXCLUDED.metadata",
    [
      uuidv4(), order?.id || null, user.id, transactionId, eventKey, paymentStatus, total, currency,
      attrs.created_at && !Number.isNaN(Date.parse(attrs.created_at)) ? new Date(attrs.created_at) : null,
      JSON.stringify({ invoiceId: String(resource.id), subscriptionId: subscriptionId ? String(subscriptionId) : null, billingReason: attrs.billing_reason || null }),
    ]
  );

  if (isRefund) {
    const refundValue = refundedAmount || total;
    const fullRefund = refundValue >= total;
    if (fullRefund) {
      await query("UPDATE payment_transactions SET status='refunded' WHERE provider='lemon_squeezy' AND provider_transaction_id=$1 AND type='payment'", [transactionId]);
    }
    await query(
      "INSERT INTO payment_transactions (id,order_id,user_id,provider,provider_transaction_id,provider_event_id,type,status,amount_minor,currency,description,occurred_at,metadata) " +
      "VALUES ($1,$2,$3,'lemon_squeezy',$4,$5,'refund','succeeded',$6,$7,'Lemon Squeezy invoice refund',NOW(),$8) " +
      "ON CONFLICT (provider,provider_transaction_id,type) DO UPDATE SET status='succeeded',amount_minor=EXCLUDED.amount_minor,provider_event_id=EXCLUDED.provider_event_id,metadata=payment_transactions.metadata || EXCLUDED.metadata",
      [uuidv4(), order?.id || null, user.id, 'invoice-refund:' + String(resource.id), eventKey, refundValue, currency, JSON.stringify({ invoiceId: String(resource.id), fullRefund })]
    );
  }
  return { paymentStatus, orderStatus };
};

router.post('/lemon-squeezy', async (req, res) => {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: 'Webhook is not configured.' });
  if (!validSignature(req.body, req.headers['x-signature'], secret)) return res.status(400).json({ error: 'Invalid webhook signature.' });

  let event;
  try { event = JSON.parse(req.body.toString('utf8')); }
  catch { return res.status(400).json({ error: 'Invalid webhook payload.' }); }
  const eventName = event?.meta?.event_name || req.headers['x-event-name'];
  const resource = event?.data;
  const attrs = resource?.attributes || {};
  const resourceId = String(resource?.id || '');
  const subscriptionId = resource?.type === 'subscriptions' ? String(resource.id || '') : (attrs.subscription_id ? String(attrs.subscription_id) : '');
  if (!eventName || !resource?.id) return res.status(400).json({ error: 'Incomplete webhook payload.' });

  // Orders are not proof of an active subscription. Only signed subscription lifecycle events affect entitlements.
  const lifecycleEvents = new Set(['order_created','order_refunded','subscription_created','subscription_updated','subscription_resumed','subscription_unpaused','subscription_cancelled','subscription_expired','subscription_paused','subscription_payment_success','subscription_payment_recovered','subscription_payment_failed','subscription_payment_refunded']);
  if (!lifecycleEvents.has(eventName)) return res.status(200).json({ received: true, ignored: true });
  const eventKey = crypto.createHash('sha256')
    .update(['lemon_squeezy',eventName,String(resource.id),String(attrs.updated_at || ''),String(attrs.status || ''),String(attrs.variant_id || attrs.first_order_item?.variant_id || ''),String(attrs.total ?? ''),String(attrs.refunded_amount ?? ''),String(subscriptionId)].join(':'))
    .digest('hex');

  try {
    const claimed = await queryOne(
      'INSERT INTO payment_provider_events (event_key,provider_key,event_type,created_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (event_key) DO NOTHING RETURNING event_key',
      [eventKey,'lemon_squeezy',eventName]
    );

    if (!claimed) return res.status(200).json({ received: true, duplicate: true });

    const ledgerState = await queryOne(
      "SELECT to_regclass('public.provider_event_inbox') AS inbox, to_regclass('public.orders') AS orders, to_regclass('public.payment_transactions') AS transactions"
    );
    const ledgerAvailable = Boolean(ledgerState?.inbox && ledgerState?.orders && ledgerState?.transactions);
    if (ledgerAvailable) {
      const safePayload = {
        eventName, resourceType: String(resource.type || ''), resourceId,
        subscriptionId: subscriptionId || null, status: attrs.status || null,
        variantId: attrs.variant_id || attrs.first_order_item?.variant_id || null,
        currency: attrs.currency || null, total: attrs.total ?? null,
        refundedAmount: attrs.refunded_amount ?? null,
      };
      await query(
        "INSERT INTO provider_event_inbox (id,provider,provider_event_id,event_type,status,payload,received_at) " +
        "VALUES ($1,'lemon_squeezy',$2,$3,'received',$4,NOW()) " +
        "ON CONFLICT (provider,provider_event_id) DO UPDATE SET status='received',payload=EXCLUDED.payload,error=NULL,processed_at=NULL,received_at=NOW()",
        [uuidv4(), eventKey, eventName, JSON.stringify(safePayload)]
      );
    }

    if (eventName === 'order_created' || eventName === 'order_refunded') {
      if (!ledgerAvailable || resource.type !== 'orders') {
        if (ledgerAvailable) await query("UPDATE provider_event_inbox SET status='ignored',processed_at=NOW() WHERE provider='lemon_squeezy' AND provider_event_id=$1", [eventKey]);
        return res.status(200).json({ received: true, ignored: true });
      }
      const orderUser = await findAccount(event?.meta?.custom_data || {}, attrs, '');
      if (!orderUser) throw new Error('Order could not be matched to a RankPilot account.');
      await recordLemonOrder(orderUser, resource, attrs, eventName, eventKey, ledgerAvailable);
      await query("UPDATE provider_event_inbox SET status='processed',processed_at=NOW(),error=NULL WHERE provider='lemon_squeezy' AND provider_event_id=$1", [eventKey]);
      return res.status(200).json({ received: true });
    }

    if (eventName.startsWith('subscription_payment_')) {
      const invoiceUser = await findAccount(event?.meta?.custom_data || {}, attrs, subscriptionId);
      if (!invoiceUser) throw new Error('Subscription invoice could not be matched to a RankPilot account.');
      const invoiceResult = await recordLemonInvoice(invoiceUser, resource, attrs, subscriptionId, eventName, eventKey, ledgerAvailable);
      if (subscriptionId && invoiceResult.paymentStatus === 'succeeded') {
        const customPlan = event?.meta?.custom_data?.plan;
        const selectedPlan = ['starter','growth','pro','agency'].includes(customPlan) ? customPlan
          : (['starter','growth','pro','agency'].includes(invoiceUser.signup_plan) ? invoiceUser.signup_plan : invoiceUser.plan);
        await query(
          "UPDATE users SET plan=COALESCE($1,plan),subscription_status='active',payment_provider='lemon_squeezy'," +
          "provider_subscription_id=$2,provider_customer_id=COALESCE(provider_customer_id,$3)," +
          "provider_subscription_updated_at=COALESCE($4,NOW()),updated_at=NOW() " +
          "WHERE id=$5 AND stripe_subscription_id IS NULL AND (payment_provider IS NULL OR payment_provider='lemon_squeezy') " +
          "AND (provider_subscription_id IS NULL OR provider_subscription_id=$2)",
          [selectedPlan, subscriptionId, attrs.customer_id ? String(attrs.customer_id) : null,
            attrs.updated_at && !Number.isNaN(Date.parse(attrs.updated_at)) ? new Date(attrs.updated_at) : null, invoiceUser.id]
        );
      } else if (subscriptionId && invoiceResult.paymentStatus === 'failed') {
        await query(
          "UPDATE users SET subscription_status='past_due',provider_subscription_updated_at=NOW(),updated_at=NOW() " +
          "WHERE id=$1 AND payment_provider='lemon_squeezy' AND provider_subscription_id=$2",
          [invoiceUser.id, subscriptionId]
        );
      }
      await query("UPDATE provider_event_inbox SET status='processed',processed_at=NOW(),error=NULL WHERE provider='lemon_squeezy' AND provider_event_id=$1", [eventKey]);
      return res.status(200).json({ received: true });
    }

    const plan = variantPlans()[String(attrs.variant_id || '')];
    const custom = event?.meta?.custom_data || {};
    let user = await findAccount(custom, attrs, subscriptionId);
    if (!user) throw new Error('Subscription event could not be matched to a RankPilot account.');
    const eventUpdatedAt = attrs.updated_at && !Number.isNaN(Date.parse(attrs.updated_at)) ? new Date(attrs.updated_at) : null;
    if (eventUpdatedAt && user.provider_subscription_updated_at && eventUpdatedAt < new Date(user.provider_subscription_updated_at)) {
      if (ledgerAvailable) await query("UPDATE provider_event_inbox SET status='ignored',processed_at=NOW() WHERE provider='lemon_squeezy' AND provider_event_id=$1", [eventKey]);
      return res.status(200).json({ received: true, stale: true });
    }

    if (['subscription_created','subscription_updated','subscription_resumed','subscription_unpaused'].includes(eventName)) {
      const endsAt = attrs.ends_at && !Number.isNaN(Date.parse(attrs.ends_at)) ? new Date(attrs.ends_at) : null;
      const isActive = attrs.status === 'active' || (attrs.status === 'cancelled' && endsAt && endsAt > new Date());
      if (isActive && plan && subscriptionId) {
        const conflict = await queryOne('SELECT id FROM users WHERE provider_subscription_id=$1 AND id<>$2 LIMIT 1', [subscriptionId,user.id]);
        if (conflict) throw new Error('Provider subscription is already linked to another account.');
        const endsAt = attrs.ends_at && !Number.isNaN(Date.parse(attrs.ends_at)) ? new Date(attrs.ends_at) : null;
        const updated = await query(
          "UPDATE users SET plan=$1,subscription_status='active',payment_provider='lemon_squeezy',provider_subscription_id=$2,provider_customer_id=$3,provider_variant_id=$4,provider_subscription_updated_at=COALESCE($6,NOW()),provider_subscription_ends_at=$7,signup_plan=NULL,signup_interval=NULL,updated_at=NOW() WHERE id=$5 AND stripe_subscription_id IS NULL AND (payment_provider IS NULL OR payment_provider='lemon_squeezy') AND (provider_subscription_id IS NULL OR provider_subscription_id=$2)",
          [plan,subscriptionId,String(attrs.customer_id || ''),String(attrs.variant_id),user.id,eventUpdatedAt,endsAt]
        );
        if (updated.rowCount !== 1) throw new Error('Subscription could not be safely linked to this account.');
        if (attrs.order_id && ledgerAvailable) {
          await query("UPDATE orders SET subscription_id=$1,updated_at=NOW() WHERE provider='lemon_squeezy' AND provider_order_id=$2 AND user_id=$3", [subscriptionId, String(attrs.order_id), user.id]);
        }
      } else if (['cancelled','expired'].includes(attrs.status)) {
        if (attrs.status === 'expired' || !endsAt || endsAt <= new Date()) {
          await query(
            "UPDATE users SET plan='free',subscription_status='cancelled',provider_subscription_id=NULL,provider_variant_id=NULL,provider_subscription_ends_at=NULL,provider_subscription_updated_at=COALESCE($3,NOW()),updated_at=NOW() WHERE id=$1 AND payment_provider='lemon_squeezy' AND provider_subscription_id=$2",
            [user.id,subscriptionId,eventUpdatedAt]
          );
        } else {
          await query(
            "UPDATE users SET subscription_status='active',provider_subscription_ends_at=$3,provider_subscription_updated_at=COALESCE($4,NOW()),updated_at=NOW() WHERE id=$1 AND payment_provider='lemon_squeezy' AND provider_subscription_id=$2",
            [user.id,subscriptionId,endsAt,eventUpdatedAt]
          );
        }
      } else if (attrs.status && subscriptionId) {
        const mappedStatus = attrs.status === 'paused' ? 'paused' : attrs.status === 'on_trial' ? 'active' : 'past_due';
        await query(
          "UPDATE users SET subscription_status=$1,payment_provider='lemon_squeezy',provider_subscription_id=$2," +
          "provider_customer_id=COALESCE(provider_customer_id,$3),provider_variant_id=COALESCE($4,provider_variant_id)," +
          "provider_subscription_updated_at=COALESCE($5,NOW()),updated_at=NOW() " +
          "WHERE id=$6 AND stripe_subscription_id IS NULL AND (payment_provider IS NULL OR payment_provider='lemon_squeezy') " +
          "AND (provider_subscription_id IS NULL OR provider_subscription_id=$2)",
          [mappedStatus,subscriptionId,attrs.customer_id ? String(attrs.customer_id) : null,attrs.variant_id ? String(attrs.variant_id) : null,eventUpdatedAt,user.id]
        );
        if (attrs.order_id && ledgerAvailable) {
          await query("UPDATE orders SET subscription_id=$1,updated_at=NOW() WHERE provider='lemon_squeezy' AND provider_order_id=$2 AND user_id=$3", [subscriptionId,String(attrs.order_id),user.id]);
        }
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
        await query("UPDATE users SET plan=$1,subscription_status='active',provider_variant_id=$2,provider_subscription_ends_at=$6,signup_plan=NULL,signup_interval=NULL,provider_subscription_updated_at=COALESCE($5,NOW()),updated_at=NOW() WHERE id=$3 AND payment_provider='lemon_squeezy' AND provider_subscription_id=$4", [plan,String(attrs.variant_id),user.id,subscriptionId,eventUpdatedAt,endsAt]);
      }
    }
    if (ledgerAvailable) await query("UPDATE provider_event_inbox SET status='processed',processed_at=NOW(),error=NULL WHERE provider='lemon_squeezy' AND provider_event_id=$1", [eventKey]);
    return res.status(200).json({ received: true });
  } catch (err) {
    try { await query("UPDATE provider_event_inbox SET status='failed',error=$2 WHERE provider='lemon_squeezy' AND provider_event_id=$1", [eventKey, String(err.message || 'Processing failed').slice(0, 1000)]); } catch {}
    try { await query('DELETE FROM payment_provider_events WHERE event_key=$1', [eventKey]); } catch {}
    console.error('Lemon Squeezy webhook processing failed:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
});
module.exports = router;

const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne } = require('../config/db');
const router = express.Router();

const PLANS = ['starter','growth','pro','agency'];
const INTERVALS = ['monthly','annual'];
const priceMap = () => {
  const map = Object.create(null);
  for (const plan of PLANS) for (const interval of INTERVALS) {
    const id = process.env['PADDLE_PRICE_' + plan.toUpperCase() + '_' + interval.toUpperCase()];
    if (typeof id === 'string' && /^pri_[a-z0-9]+$/i.test(id)) map[id] = { plan, interval };
  }
  return map;
};
const minorAmount = (value, currency) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  const zeroDecimal = new Set(['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF']);
  return Math.round(n * (zeroDecimal.has(String(currency || '').toUpperCase()) ? 1 : 100));
};
const verifySignature = (rawBody, header, secret) => {
  if (!Buffer.isBuffer(rawBody) || typeof header !== 'string' || !secret) return false;
  const parts = Object.fromEntries(header.split(';').map(part => {
    const index = part.indexOf('=');
    return index > 0 ? [part.slice(0,index).trim(), part.slice(index+1).trim()] : ['', ''];
  }).filter(([key,value]) => key && value));
  if (!/^\d+$/.test(parts.ts || '') || !parts.h1 || !/^[a-f0-9]{64}$/i.test(parts.h1)) return false;
  const timestamp = Number(parts.ts);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now()/1000 - timestamp) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(parts.ts + ':' + rawBody.toString('utf8')).digest();
  const supplied = Buffer.from(parts.h1, 'hex');
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
};
const eventDate = value => value && !Number.isNaN(Date.parse(value)) ? new Date(value) : null;
const getPriceId = data => data?.items?.[0]?.price?.id || data?.items?.[0]?.price_id || null;
const findUser = async (data, subscriptionId) => {
  const customUserId = data?.custom_data?.rankpilot_user_id;
  if (customUserId) {
    const byId = await queryOne('SELECT id,email,plan,signup_plan,provider_subscription_id,provider_subscription_updated_at FROM users WHERE id=$1 LIMIT 1',[String(customUserId)]);
    if (byId) return byId;
  }
  if (subscriptionId) return queryOne("SELECT id,email,plan,signup_plan,provider_subscription_id,provider_subscription_updated_at FROM users WHERE payment_provider='paddle' AND provider_subscription_id=$1 LIMIT 1",[String(subscriptionId)]);
  return null;
};
const recordTransaction = async (user, data, eventId, planInfo) => {
  const currency = String(data.currency_code || 'USD').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Paddle transaction has an invalid currency.');
  const totals = data.details?.totals || {};
  const total = minorAmount(totals.total, currency);
  const subtotal = minorAmount(totals.subtotal ?? totals.total, currency);
  const tax = minorAmount(totals.tax ?? 0, currency);
  if (total <= 0) throw new Error('Paddle completed transaction has no valid positive total.');
  const transactionId = String(data.id || '');
  if (!/^txn_[a-z0-9]+$/i.test(transactionId) || data.status !== 'completed') throw new Error('Only completed Paddle transactions can provision paid access.');
  const subscriptionId = data.subscription_id ? String(data.subscription_id) : null;
  const order = await queryOne(
    "INSERT INTO orders (id,user_id,provider,provider_order_id,subscription_id,status,currency,subtotal_minor,tax_minor,total_minor,plan,description,metadata,created_at,updated_at) VALUES ($1,$2,'paddle',$3,$4,'paid',$5,$6,$7,$8,$9,'Paddle subscription payment',$10,NOW(),NOW()) ON CONFLICT (provider,provider_order_id) DO UPDATE SET status='paid',subscription_id=COALESCE(EXCLUDED.subscription_id,orders.subscription_id),currency=EXCLUDED.currency,subtotal_minor=EXCLUDED.subtotal_minor,tax_minor=EXCLUDED.tax_minor,total_minor=EXCLUDED.total_minor,plan=EXCLUDED.plan,metadata=orders.metadata || EXCLUDED.metadata,updated_at=NOW() RETURNING id",
    [uuidv4(),user.id,transactionId,subscriptionId,currency,subtotal,tax,total,planInfo.plan,JSON.stringify({eventId,priceId:getPriceId(data),billingInterval:planInfo.interval})]
  );
  await query(
    "INSERT INTO payment_transactions (id,order_id,user_id,provider,provider_transaction_id,provider_event_id,type,status,amount_minor,currency,description,occurred_at,metadata) VALUES ($1,$2,$3,'paddle',$4,$5,'payment','succeeded',$6,$7,'Paddle completed transaction',COALESCE($8,NOW()),$9) ON CONFLICT (provider,provider_transaction_id,type) DO UPDATE SET order_id=EXCLUDED.order_id,status='succeeded',amount_minor=EXCLUDED.amount_minor,currency=EXCLUDED.currency,provider_event_id=EXCLUDED.provider_event_id,metadata=payment_transactions.metadata || EXCLUDED.metadata",
    [uuidv4(),order.id,user.id,transactionId,eventId,total,currency,eventDate(data.billed_at || data.updated_at),JSON.stringify({subscriptionId,priceId:getPriceId(data)})]
  );
  if (subscriptionId) {
    const conflict = await queryOne('SELECT id FROM users WHERE provider_subscription_id=$1 AND id<>$2 LIMIT 1',[subscriptionId,user.id]);
    if (conflict) throw new Error('Paddle subscription is already linked to another RankPilot account.');
  }
  const updated = await query(
    "UPDATE users SET plan=$1,subscription_status='active',payment_provider='paddle',provider_customer_id=COALESCE($2,provider_customer_id),provider_subscription_id=COALESCE($3,provider_subscription_id),provider_variant_id=$4,provider_order_id=$5,provider_subscription_updated_at=COALESCE($6,NOW()),provider_subscription_ends_at=NULL,signup_plan=NULL,signup_interval=NULL,updated_at=NOW() WHERE id=$7 AND stripe_subscription_id IS NULL AND (payment_provider IS NULL OR payment_provider='paddle') AND (provider_subscription_id IS NULL OR $3 IS NULL OR provider_subscription_id=$3)",
    [planInfo.plan,data.customer_id ? String(data.customer_id) : null,subscriptionId,getPriceId(data),transactionId,eventDate(data.updated_at),user.id]
  );
  if (updated.rowCount !== 1) throw new Error('Paddle payment could not be safely linked to the account.');
};
const updateSubscription = async (data, eventType, occurredAt) => {
  const subscriptionId = String(data.id || '');
  if (!/^sub_[a-z0-9]+$/i.test(subscriptionId)) throw new Error('Invalid Paddle subscription identifier.');
  const user = await findUser(data, subscriptionId);
  if (!user) {
    // subscription.created may arrive before transaction.completed; the transaction event provisions the account.
    return { ignored: true, reason: 'account_not_linked_yet' };
  }
  const happenedAt = eventDate(occurredAt);
  if (happenedAt && user.provider_subscription_updated_at && happenedAt < new Date(user.provider_subscription_updated_at)) {
    return { ignored: true, reason: 'stale_event' };
  }
  const status = String(data.status || '');
  const priceId = getPriceId(data);
  const planInfo = priceMap()[String(priceId || '')];
  const scheduledCancel = data.scheduled_change?.action === 'cancel' ? eventDate(data.scheduled_change.effective_at) : null;
  const active = ['active','trialing','past_due'].includes(status);
  const plan = planInfo && active ? planInfo.plan : (status === 'canceled' || status === 'paused' ? 'free' : user.plan);
  await query(
    "UPDATE users SET plan=$1,subscription_status=$2,payment_provider='paddle',provider_customer_id=COALESCE($3,provider_customer_id),provider_subscription_id=$4,provider_variant_id=COALESCE($5,provider_variant_id),provider_subscription_updated_at=COALESCE($6,NOW()),provider_subscription_ends_at=$7,updated_at=NOW() WHERE id=$8 AND (payment_provider IS NULL OR payment_provider='paddle') AND (provider_subscription_id IS NULL OR provider_subscription_id=$4)",
    [plan,status,data.customer_id ? String(data.customer_id) : null,subscriptionId,priceId,happenedAt,scheduledCancel,user.id]
  );
  return { updated: true };
};

router.post('/paddle', async (req,res) => {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({error:'Paddle webhook is not configured.'});
  if (!verifySignature(req.body,req.headers['paddle-signature'],secret)) return res.status(400).json({error:'Invalid Paddle webhook signature.'});
  let event;
  try { event = JSON.parse(req.body.toString('utf8')); } catch { return res.status(400).json({error:'Invalid webhook payload.'}); }
  if (!event?.event_id || !event?.event_type || !event?.data) return res.status(400).json({error:'Incomplete Paddle webhook payload.'});
  const eventId = String(event.event_id);
  const eventType = String(event.event_type);
  const data = event.data;
  const supported = new Set(['transaction.completed','subscription.created','subscription.updated','subscription.canceled']);
  if (!supported.has(eventType)) return res.status(200).json({received:true,ignored:true});
  try {
    const claimed = await queryOne("INSERT INTO payment_provider_events (event_key,provider_key,event_type,created_at) VALUES ($1,'paddle',$2,NOW()) ON CONFLICT (event_key) DO NOTHING RETURNING event_key",[eventId,eventType]);
    if (!claimed) return res.status(200).json({received:true,duplicate:true});
    const inbox = await queryOne("INSERT INTO provider_event_inbox (id,provider,provider_event_id,event_type,status,payload,received_at) VALUES ($1,'paddle',$2,$3,'received',$4,NOW()) ON CONFLICT (provider,provider_event_id) DO UPDATE SET status='received',payload=EXCLUDED.payload,error=NULL,processed_at=NULL,received_at=NOW() RETURNING id",[uuidv4(),eventId,eventType,JSON.stringify({eventType,entityId:data.id,status:data.status || null,subscriptionId:data.subscription_id || null})]);
    if (eventType === 'transaction.completed') {
      const priceId = getPriceId(data);
      const planInfo = priceMap()[String(priceId || '')];
      if (!planInfo) throw new Error('Paddle transaction uses an unknown price ID; paid access was not granted.');
      const user = await findUser(data,data.subscription_id ? String(data.subscription_id) : null);
      if (!user) throw new Error('Paddle transaction could not be matched to a RankPilot account.');
      await recordTransaction(user,data,eventId,planInfo);
    } else {
      await updateSubscription(data,eventType,event.occurred_at);
    }
    await query("UPDATE provider_event_inbox SET status='processed',processed_at=NOW(),error=NULL WHERE provider='paddle' AND provider_event_id=$1",[eventId]);
    return res.status(200).json({received:true});
  } catch (error) {
    console.error('Paddle webhook processing failed:',error.message);
    await query("UPDATE provider_event_inbox SET status='failed',error=$1,processed_at=NOW() WHERE provider='paddle' AND provider_event_id=$2",[String(error.message).slice(0,500),eventId]).catch(()=>{});
    await query("DELETE FROM payment_provider_events WHERE provider_key='paddle' AND event_key=$1",[eventId]).catch(()=>{});
    // Return 500 so Paddle retries; a failed event is not silently acknowledged.
    return res.status(500).json({error:'Paddle webhook processing failed; provider will retry.'});
  }
});
module.exports = router;

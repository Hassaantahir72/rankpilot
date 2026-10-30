const { queryAll, queryOne } = require('../config/db');

// Owner-only admin routes mount this controller behind adminSecurityCheck.
const boundedLimit = (value, fallback = 50) => {
  const n = value === undefined ? fallback : Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 200 ? n : null;
};

const getCommerceSummary = async (_req, res) => {
  try {
    const [orders, transactions, revenue, refunds, failed, events] = await Promise.all([
      queryOne("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='paid') AS paid, COUNT(*) FILTER (WHERE status IN ('pending','processing')) AS pending, COUNT(*) FILTER (WHERE status='failed') AS failed FROM orders"),
      queryOne("SELECT COUNT(*) AS total FROM payment_transactions"),
      queryOne("SELECT COALESCE(SUM(amount_minor),0) AS total FROM payment_transactions WHERE type='payment' AND status='succeeded'"),
      queryOne("SELECT COALESCE(SUM(amount_minor),0) AS total FROM payment_transactions WHERE type='refund' AND status='succeeded'"),
      queryOne("SELECT COUNT(*) AS total FROM payment_transactions WHERE status='failed'"),
      queryOne("SELECT COUNT(*) AS total FROM provider_event_inbox WHERE received_at > NOW()-INTERVAL '24 hours'"),
    ]);
    res.json({ orders, transactions, revenueMinor: revenue.total, refundsMinor: refunds.total, failedTransactions: failed.total, providerEvents24h: events.total, currencyNote: 'Amounts are stored in each transaction currency; do not sum across currencies without conversion.' });
  } catch (error) {
    if (error.code === '42P01') return res.status(503).json({ error: 'Commerce ledger migration is not installed yet.', code: 'LEDGER_MIGRATION_REQUIRED' });
    console.error('Admin commerce summary failed:', error.message);
    res.status(500).json({ error: 'Could not load commerce summary.' });
  }
};

const getOrders = async (req, res) => {
  const limit = boundedLimit(req.query.limit);
  if (!limit) return res.status(400).json({ error: 'Limit must be between 1 and 200.' });
  try {
    const orders = await queryAll(
      `SELECT o.*, u.email AS user_email, u.name AS user_name
       FROM orders o LEFT JOIN users u ON u.id=o.user_id
       ORDER BY o.created_at DESC LIMIT $1`, [limit]);
    res.json({ orders });
  } catch (error) {
    if (error.code === '42P01') return res.status(503).json({ error: 'Commerce ledger migration is not installed yet.', code: 'LEDGER_MIGRATION_REQUIRED' });
    res.status(500).json({ error: 'Could not load orders.' });
  }
};

const getTransactions = async (req, res) => {
  const limit = boundedLimit(req.query.limit);
  if (!limit) return res.status(400).json({ error: 'Limit must be between 1 and 200.' });
  try {
    const transactions = await queryAll(
      `SELECT t.*,u.email AS user_email,u.name AS user_name,o.provider_order_id
       FROM payment_transactions t
       LEFT JOIN users u ON u.id=t.user_id
       LEFT JOIN orders o ON o.id=t.order_id
       ORDER BY t.occurred_at DESC LIMIT $1`, [limit]);
    res.json({ transactions });
  } catch (error) {
    if (error.code === '42P01') return res.status(503).json({ error: 'Commerce ledger migration is not installed yet.', code: 'LEDGER_MIGRATION_REQUIRED' });
    res.status(500).json({ error: 'Could not load transactions.' });
  }
};

const getProviderEvents = async (req, res) => {
  const limit = boundedLimit(req.query.limit);
  if (!limit) return res.status(400).json({ error: 'Limit must be between 1 and 200.' });
  try {
    const events = await queryAll('SELECT id,provider,provider_event_id,event_type,status,error,received_at,processed_at FROM provider_event_inbox ORDER BY received_at DESC LIMIT $1', [limit]);
    res.json({ events });
  } catch (error) {
    if (error.code === '42P01') return res.status(503).json({ error: 'Commerce ledger migration is not installed yet.', code: 'LEDGER_MIGRATION_REQUIRED' });
    res.status(500).json({ error: 'Could not load provider events.' });
  }
};

// Fetch-based SSE supports Authorization headers (unlike native EventSource).
// Each event is an authoritative snapshot cursor; clients reconnect with Last-Event-ID.
// Fetch-based SSE supports Authorization headers (unlike native EventSource).
// Cursor is advanced monotonically; proper newline delimiters are required by SSE.
const streamCommerce = (req, res) => {
  const lastId = req.get('Last-Event-ID') || req.query.after || '1970-01-01T00:00:00.000Z';
  const since = new Date(lastId);
  if (Number.isNaN(since.getTime())) return res.status(400).end();

  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  res.write('retry: 3000\n\n');

  let closed = false;
  let running = false;
  let cursor = since;
  const send = async () => {
    if (closed || running) return;
    running = true;
    try {
      const rows = await queryAll(
        `SELECT kind,id,occurred_at,status,provider FROM (
           SELECT 'order' AS kind,id,updated_at AS occurred_at,status,provider FROM orders WHERE updated_at > $1
           UNION ALL
           SELECT 'transaction' AS kind,id,occurred_at,status,provider FROM payment_transactions WHERE occurred_at > $1
         ) commerce_changes
         ORDER BY occurred_at ASC,id ASC LIMIT 100`, [cursor]);
      for (const row of rows) {
        const at = new Date(row.occurred_at);
        if (at > cursor) cursor = at;
        res.write('id: ' + cursor.toISOString() + '\n');
        res.write('event: commerce\n');
        res.write('data: ' + JSON.stringify(row) + '\n\n');
      }
      if (!rows.length) res.write(': keepalive\n\n');
    } catch (error) {
      if (error.code === '42P01') {
        res.write('event: unavailable\ndata: {"code":"LEDGER_MIGRATION_REQUIRED"}\n\n');
      } else {
        console.error('Admin commerce stream failed:', error.message);
        res.write('event: stream-error\ndata: {"message":"Commerce stream temporarily unavailable"}\n\n');
      }
    } finally {
      running = false;
    }
  };

  const timer = setInterval(send, 3000);
  send();
  req.on('close', () => {
    closed = true;
    clearInterval(timer);
  });
};

module.exports = { getCommerceSummary, getOrders, getTransactions, getProviderEvents, streamCommerce };

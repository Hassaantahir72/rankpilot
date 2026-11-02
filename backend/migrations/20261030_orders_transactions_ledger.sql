-- RankPilot order and transaction ledger.
-- Safe to apply repeatedly; preserves legacy billing_history rows.
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  provider_order_id TEXT,
  checkout_session_id TEXT,
  subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','cancelled','refunded','partially_refunded')),
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal_minor BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
  tax_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
  total_minor BIGINT NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
  plan TEXT,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_order_id)
);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_user_created_idx ON orders(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  provider_transaction_id TEXT NOT NULL,
  provider_event_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('payment','refund','dispute','chargeback','adjustment')),
  status TEXT NOT NULL CHECK (status IN ('pending','succeeded','failed','cancelled','refunded','disputed')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_transaction_id, type)
);
CREATE INDEX IF NOT EXISTS payment_transactions_created_idx ON payment_transactions(occurred_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_user_idx ON payment_transactions(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_order_idx ON payment_transactions(order_id);
CREATE TABLE IF NOT EXISTS provider_event_inbox (
  id UUID PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','failed','ignored')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(provider, provider_event_id)
);
CREATE INDEX IF NOT EXISTS provider_event_inbox_received_idx ON provider_event_inbox(received_at DESC);

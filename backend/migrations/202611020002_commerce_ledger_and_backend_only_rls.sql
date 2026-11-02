-- RankPilot order and transaction ledger plus backend-only table protection.
-- Safe to apply repeatedly; existing billing_history rows are preserved.
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
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
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_user_created_idx ON public.orders(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
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
CREATE INDEX IF NOT EXISTS payment_transactions_created_idx ON public.payment_transactions(occurred_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_user_idx ON public.payment_transactions(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_order_idx ON public.payment_transactions(order_id);
CREATE TABLE IF NOT EXISTS public.provider_event_inbox (
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
CREATE INDEX IF NOT EXISTS provider_event_inbox_received_idx ON public.provider_event_inbox(received_at DESC);

-- Deny direct Data API access; the Render backend connects directly to PostgreSQL.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_event_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_device_claims ENABLE ROW LEVEL SECURITY;

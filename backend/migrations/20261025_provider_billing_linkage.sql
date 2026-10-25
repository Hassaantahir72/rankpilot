-- Provider-independent billing linkage and webhook idempotency.
-- Secret keys remain server-side in Render environment variables.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_variant_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_order_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_provider_subscription_unique
  ON users (payment_provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS payment_provider_events (
  event_key TEXT PRIMARY KEY,
  provider_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMIT;

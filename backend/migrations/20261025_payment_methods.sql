-- Provider-independent payment method configuration.
-- Secrets remain in Render environment variables; this table stores display metadata only.
BEGIN;
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key TEXT NOT NULL CHECK (provider_key IN ('safepay','lemon_squeezy','manual_bank_transfer')),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 2 AND 80),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 240),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  public_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_key)
);
CREATE INDEX IF NOT EXISTS payment_methods_public_idx ON payment_methods (enabled, sort_order);
COMMIT;

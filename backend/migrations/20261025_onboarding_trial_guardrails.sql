-- One free trial per coarse device signature. Raw browser attributes and IP addresses are never stored.
-- Existing rows receive TRUE when this column is first added; future signups default to FALSE.
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ALTER COLUMN onboarding_completed SET DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_plan TEXT CHECK (signup_plan IS NULL OR signup_plan IN ('starter','growth','pro','agency'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_interval TEXT CHECK (signup_interval IS NULL OR signup_interval IN ('monthly','annual'));

CREATE TABLE IF NOT EXISTS trial_device_claims (
  device_hash TEXT PRIMARY KEY,
  ip_hash TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trial_device_claims_ip_created_idx
  ON trial_device_claims (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS trial_device_claims_user_id_idx
  ON trial_device_claims (user_id);

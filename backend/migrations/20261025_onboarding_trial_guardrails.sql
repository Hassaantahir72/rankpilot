-- One free trial per coarse device signature. Raw browser attributes and IP addresses are never stored.
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
-- Do not force existing customers through the new-user onboarding flow.
UPDATE users SET onboarding_completed=TRUE WHERE onboarding_completed=FALSE;

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

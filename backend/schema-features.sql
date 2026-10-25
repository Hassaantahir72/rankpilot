-- ── NEW TABLES FOR FEATURES 11-15 ─────────────────────────────────
-- Run this after the main schema.sql

-- Website snapshots (Feature 12: Change Monitor)
CREATE TABLE IF NOT EXISTS website_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  snapshot_data JSONB,
  alerts JSONB DEFAULT '[]',
  taken_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_snapshots_website ON website_snapshots(website_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_taken ON website_snapshots(taken_at);

-- Change alerts (Feature 12)
CREATE TABLE IF NOT EXISTS change_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low','info')),
  type TEXT NOT NULL,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_website ON change_alerts(website_id);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON change_alerts(is_read);

-- OAuth tokens (for Google Search Console)
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_tokens(user_id);

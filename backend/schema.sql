-- ================================================================
-- RankPilot v2.0 — PostgreSQL Schema
-- Run this in psql or pgAdmin:
--   psql -U postgres -d rankpilot -f schema.sql
-- Or paste into pgAdmin Query Tool and run all.
-- ================================================================

-- Create database (run this separately if needed):
-- CREATE DATABASE rankpilot;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── USERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  token_version INTEGER NOT NULL DEFAULT 0,
  google_id TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user','admin','superadmin')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','trial','starter','growth','pro','agency')),
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free','trial','active','past_due','cancelled','paused')),
  trial_ends_at TIMESTAMPTZ,
  signup_plan TEXT CHECK (signup_plan IS NULL OR signup_plan IN ('starter','growth','pro','agency')),
  signup_interval TEXT CHECK (signup_interval IS NULL OR signup_interval IN ('monthly','annual')),
  email_verified BOOLEAN DEFAULT FALSE,
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_attempts INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  payment_provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  provider_variant_id TEXT,
  provider_order_id TEXT,
  provider_subscription_updated_at TIMESTAMPTZ,
  provider_subscription_ends_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trial_device_claims (
  device_hash TEXT PRIMARY KEY,
  ip_hash TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trial_device_claims_ip_created_idx ON trial_device_claims (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS trial_device_claims_user_id_idx ON trial_device_claims (user_id);

-- ── PLAN LIMITS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_limits (
  plan TEXT PRIMARY KEY,
  max_websites INTEGER DEFAULT 1,
  max_keywords INTEGER DEFAULT 50,
  max_audits_per_month INTEGER DEFAULT 2,
  max_content_per_month INTEGER DEFAULT 5,
  max_social_posts_per_month INTEGER DEFAULT 0,
  google_ads BOOLEAN DEFAULT FALSE,
  meta_ads BOOLEAN DEFAULT FALSE,
  ab_testing BOOLEAN DEFAULT FALSE,
  white_label BOOLEAN DEFAULT FALSE,
  api_access BOOLEAN DEFAULT FALSE,
  competitor_analysis BOOLEAN DEFAULT FALSE,
  weekly_reports BOOLEAN DEFAULT FALSE,
  priority_support BOOLEAN DEFAULT FALSE,
  rank_tracking_frequency TEXT DEFAULT 'monthly'
);

INSERT INTO plan_limits
  (plan,max_websites,max_keywords,max_audits_per_month,max_content_per_month,max_social_posts_per_month,google_ads,meta_ads,ab_testing,white_label,api_access,competitor_analysis,weekly_reports,priority_support,rank_tracking_frequency)
VALUES
  ('free',    1,   20,   1,   2,   0,    false,false,false,false,false,false,false,false,'monthly'),
  ('trial',   1,  100,   5,  10,   5,    false,false,false,false,false,true, false,false,'weekly'),
  ('starter', 1,  150,   5,  10,   0,    false,false,false,false,false,true, false,false,'monthly'),
  ('growth',  3,  300,  15,  30,  10,    true, false,false,false,false,true, true, true, 'weekly'),
  ('pro',     5,  500,  40,  80,  30,    true, true, false, false, false, true, true, true, 'weekly'),
  ('agency', 10, 1000, 100, 200, 100,    true, true, false, false, false, true, true, true, 'weekly')
ON CONFLICT (plan) DO UPDATE SET
  max_websites=EXCLUDED.max_websites,
  max_keywords=EXCLUDED.max_keywords,
  max_audits_per_month=EXCLUDED.max_audits_per_month,
  max_content_per_month=EXCLUDED.max_content_per_month,
  max_social_posts_per_month=EXCLUDED.max_social_posts_per_month,
  google_ads=EXCLUDED.google_ads,
  meta_ads=EXCLUDED.meta_ads,
  ab_testing=EXCLUDED.ab_testing,
  white_label=EXCLUDED.white_label,
  api_access=EXCLUDED.api_access,
  competitor_analysis=EXCLUDED.competitor_analysis,
  weekly_reports=EXCLUDED.weekly_reports,
  priority_support=EXCLUDED.priority_support,
  rank_tracking_frequency=EXCLUDED.rank_tracking_frequency;

-- ── WEBSITES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  industry TEXT,
  competitors TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','paused','error')),
  last_audit_at TIMESTAMPTZ,
  last_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── AUDITS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'running' CHECK (status IN ('running','complete','failed')),
  overall_score INTEGER,
  pages_crawled INTEGER DEFAULT 0,
  issues_found INTEGER DEFAULT 0,
  keywords_found_count INTEGER DEFAULT 0,
  crawl_data JSONB,
  technical_issues JSONB,
  keywords_found JSONB,
  competitors_found JSONB,
  ai_analysis JSONB,
  page_recommendations JSONB,
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ── DURABLE AUDIT JOB QUEUE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL UNIQUE REFERENCES audits(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','complete','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_jobs_queue ON audit_jobs(status, available_at, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_jobs_user ON audit_jobs(user_id, created_at DESC);

-- ── KEYWORDS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  search_volume INTEGER DEFAULT 0,
  difficulty INTEGER DEFAULT 50,
  cpc DECIMAL(10,2) DEFAULT 0,
  intent TEXT DEFAULT 'informational',
  priority INTEGER DEFAULT 0,
  current_position INTEGER,
  target_position INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(website_id, keyword)
);

-- ── RANKINGS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  position INTEGER,
  previous_position INTEGER,
  url TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CONTENT HISTORY ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  page_url TEXT,
  target_keyword TEXT,
  original_content TEXT,
  generated_content TEXT,
  meta_title TEXT,
  meta_description TEXT,
  keywords_used TEXT[],
  word_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── COMPETITORS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  shared_keywords INTEGER DEFAULT 0,
  domain_authority INTEGER DEFAULT 0,
  positions JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(website_id, domain)
);

-- ── CAMPAIGNS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('google','meta')),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','paused','ended')),
  budget_daily DECIMAL(10,2),
  budget_monthly DECIMAL(10,2),
  goal TEXT,
  ai_copy JSONB,
  external_campaign_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── AD PERFORMANCE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ctr DECIMAL(5,2),
  cpc DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SOCIAL POSTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  hashtags TEXT[],
  type TEXT,
  best_time TEXT,
  image_idea TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published')),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── REPORTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'weekly',
  period TEXT,
  data JSONB,
  overall_trend TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── USAGE TRACKING ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  month TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, action, month)
);

-- ── ADMIN AUDIT LOG ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CONTACT MESSAGES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread','read','replied')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── BILLING HISTORY ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'usd',
  status TEXT,
  plan TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── STRIPE WEBHOOK IDEMPOTENCY ────────────────────────────────────
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PROVIDER-INDEPENDENT PAYMENT METHODS ─────────────────────────
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

CREATE UNIQUE INDEX IF NOT EXISTS users_provider_subscription_unique
  ON users (payment_provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_provider_events (
  event_key TEXT PRIMARY KEY,
  provider_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SUPPORT TICKETS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_email TEXT,
  guest_name TEXT,
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general','billing','technical','seo','ads','feature','bug','other')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_user','resolved','closed')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  satisfaction_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TICKET MESSAGES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name TEXT,
  sender_role TEXT DEFAULT 'user' CHECK (sender_role IN ('user','agent','bot','system')),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CHAT SESSIONS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'bot' CHECK (status IN ('bot','queued','live','ended')),
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- ── CHAT MESSAGES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user','bot','agent','system')),
  sender_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CANNED RESPONSES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  shortcut TEXT UNIQUE,
  content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO canned_responses (id, title, shortcut, content, category) VALUES
  (gen_random_uuid(), 'Welcome greeting',  '/hi',       'Hi there! Thanks for reaching out to RankPilot support. I''m happy to help you today. What can I assist you with?', 'greeting'),
  (gen_random_uuid(), 'Ask for more info', '/more',     'Could you please provide a bit more detail about the issue? This will help me resolve it faster for you.', 'general'),
  (gen_random_uuid(), 'Escalate',          '/escalate', 'I''m going to escalate this to our specialist team who will be best placed to help. You''ll hear back within 2-4 hours.', 'escalation'),
  (gen_random_uuid(), 'Closing message',   '/bye',      'Is there anything else I can help you with today? If not, I''ll close this ticket. Don''t hesitate to reach out again anytime!', 'closing')
ON CONFLICT (shortcut) DO NOTHING;

-- ── INDEXES ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role          ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_plan          ON users(plan);
CREATE INDEX IF NOT EXISTS idx_websites_user       ON websites(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_website      ON audits(website_id);
CREATE INDEX IF NOT EXISTS idx_audits_user         ON audits(user_id);
CREATE INDEX IF NOT EXISTS idx_keywords_website    ON keywords(website_id);
CREATE INDEX IF NOT EXISTS idx_rankings_website    ON rankings(website_id);
CREATE INDEX IF NOT EXISTS idx_rankings_checked    ON rankings(checked_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_user      ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_adperf_date         ON ad_performance(date);
CREATE INDEX IF NOT EXISTS idx_social_website      ON social_posts(website_id);
CREATE INDEX IF NOT EXISTS idx_reports_user        ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_month    ON usage_tracking(user_id, month);
CREATE INDEX IF NOT EXISTS idx_contact_status      ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user        ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status      ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned    ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_msgs         ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user  ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_token ON chat_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_chat_msgs           ON chat_messages(session_id);

-- ── DONE ─────────────────────────────────────────────────────────
-- After running this, sign up and then make yourself superadmin:
-- UPDATE users SET role = 'superadmin' WHERE email = 'your@email.com';

-- ── SECURITY EVENTS LOG ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  ip_address TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_events_event   ON security_events(event);
CREATE INDEX IF NOT EXISTS idx_security_events_ip      ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_user    ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);

-- ── ADMIN SESSIONS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id);

-- ── BLOCKED IPs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT UNIQUE NOT NULL,
  reason TEXT,
  blocked_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);

-- ── SITE SETTINGS (admin-controlled) ─────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_settings (key, value, description) VALUES
  ('maintenance_mode',  'false',  'Put site in maintenance mode (true/false)'),
  ('allow_signups',     'true',   'Allow new user registrations (true/false)'),
  ('free_plan_enabled', 'true',   'Allow users to stay on free plan (true/false)'),
  ('site_notice',       '',       'Banner notice shown to all users (empty = hidden)'),
  ('max_free_websites', '1',      'Max websites on free plan'),
  ('trial_days',        '14',     'Number of trial days for new signups')
ON CONFLICT (key) DO NOTHING;

-- Run these if you already ran the schema before and just need the new tables:
-- psql -U postgres -d rankpilot -c "
-- CREATE TABLE IF NOT EXISTS security_events (...);  -- See above
-- CREATE TABLE IF NOT EXISTS blocked_ips (...);
-- CREATE TABLE IF NOT EXISTS site_settings (...);
-- "
-- Or just run the full schema.sql again — all CREATE TABLE IF NOT EXISTS are safe to re-run.

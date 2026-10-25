-- RankPilot pricing refresh: $15 / $29 / $59 / $99 monthly tiers.
-- Apply this migration to the production PostgreSQL database after reviewing the release.
-- Existing users keep plan IDs; entitlements, revocable sessions, webhook idempotency, and log scrubbing are updated.
BEGIN;

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

-- Add revocable session versions without invalidating existing tokens until changed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

-- Scrub sensitive fields from historical admin/security logs written before redaction was added.
UPDATE security_events
SET details =
  (details - ARRAY['password','newPassword','password_hash','otp','otp_code','token','secret','apiKey','authorization','cookie','value']::text[])
  || CASE
       WHEN jsonb_typeof(details->'body') = 'object'
       THEN jsonb_build_object('body', (details->'body') - ARRAY['password','newPassword','password_hash','otp','otp_code','token','secret','apiKey','authorization','cookie','value']::text[])
       ELSE '{}'::jsonb
     END
WHERE details ?| ARRAY['password','newPassword','password_hash','otp','otp_code','token','secret','apiKey','authorization','cookie','value']::text[]
   OR (jsonb_typeof(details->'body') = 'object' AND (details->'body') ?| ARRAY['password','newPassword','password_hash','otp','otp_code','token','secret','apiKey','authorization','cookie','value']::text[]);

UPDATE admin_audit_log
SET details = details - ARRAY['password','newPassword','password_hash','otp','otp_code','token','secret','apiKey','authorization','cookie','value']::text[]
WHERE details ?| ARRAY['password','newPassword','password_hash','otp','otp_code','token','secret','apiKey','authorization','cookie','value']::text[];

-- Persist Stripe event IDs so webhook retries cannot apply the same event twice.
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;

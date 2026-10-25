-- RankPilot pricing refresh: $15 / $29 / $59 / $99 monthly tiers.
-- Apply this migration to the production PostgreSQL database after reviewing the release.
-- Existing users keep their plan IDs; only plan entitlements are updated.
BEGIN;

INSERT INTO plan_limits
  (plan,max_websites,max_keywords,max_audits_per_month,max_content_per_month,max_social_posts_per_month,google_ads,meta_ads,ab_testing,white_label,api_access,competitor_analysis,weekly_reports,priority_support,rank_tracking_frequency)
VALUES
  ('free',    1,   20,   1,   2,   0,    false,false,false,false,false,false,false,false,'monthly'),
  ('trial',   1,  100,   5,  10,   5,    false,false,false,false,false,true, false,false,'weekly'),
  ('starter', 1,  150,   5,  10,   0,    false,false,false,false,false,true, false,false,'monthly'),
  ('growth',  3,  300,  15,  30,  10,    true, false,false,false,false,true, true, true, 'weekly'),
  ('pro',     5,  500,  40,  80,  30,    true, true, true, false,false,true, true, true, 'weekly'),
  ('agency', 10, 1000, 100, 200, 100,    true, true, true, false, false, true, true, true, 'weekly')
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

COMMIT;

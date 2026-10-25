-- RankPilot security hardening: these tables are backend-only.
-- The backend connects directly to PostgreSQL; no browser/client role needs direct table access.
-- RLS with no client policies is intentional and denies Supabase anon/authenticated API access.
BEGIN;

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_device_claims ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.stripe_webhook_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.payment_methods FROM anon, authenticated;
REVOKE ALL ON TABLE public.payment_provider_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.trial_device_claims FROM anon, authenticated;

COMMIT;

-- RankPilot's browser app calls the Render API and does not use Supabase Data API.
-- Remove public schema access from anonymous and authenticated API roles,
-- including inherited PUBLIC access. Keep backend postgres and service_role access.
REVOKE USAGE, CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

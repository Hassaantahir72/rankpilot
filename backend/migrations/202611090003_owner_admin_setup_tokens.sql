-- Separate, one-time owner provisioning. Tokens are stored only as SHA-256 hashes.
CREATE TABLE IF NOT EXISTS public.owner_admin_setup_tokens (
  email text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
ALTER TABLE public.owner_admin_setup_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.owner_admin_setup_tokens FROM PUBLIC, anon, authenticated;

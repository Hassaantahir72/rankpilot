ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS admin_totp_secret_enc text,
  ADD COLUMN IF NOT EXISTS admin_totp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_totp_last_counter bigint;

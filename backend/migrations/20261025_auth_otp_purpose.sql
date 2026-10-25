-- Keep email verification, 2FA login, and password-reset codes separate.
-- Existing OTPs are invalidated once so a code issued for one purpose cannot be reused for another.
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS otp_purpose text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_otp_purpose_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_otp_purpose_check
      CHECK (otp_purpose IS NULL OR otp_purpose IN ('verify', 'login', 'reset'));
  END IF;
END $$;

UPDATE public.users
SET otp_code = NULL,
    otp_expires_at = NULL,
    otp_attempts = 0,
    otp_purpose = NULL
WHERE otp_code IS NOT NULL OR otp_purpose IS NOT NULL;

COMMIT;

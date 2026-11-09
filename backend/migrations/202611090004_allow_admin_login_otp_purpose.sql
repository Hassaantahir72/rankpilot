-- Permit the dedicated owner admin email-OTP challenge purpose.
-- Customer verification/login/reset purposes remain unchanged.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_otp_purpose_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_otp_purpose_check
  CHECK (
    otp_purpose IS NULL
    OR otp_purpose = ANY (ARRAY['verify'::text, 'login'::text, 'reset'::text, 'admin_login'::text])
  );

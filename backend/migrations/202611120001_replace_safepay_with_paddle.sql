-- Replace the unused Safepay candidate with Paddle Billing.
-- Existing Lemon Squeezy records remain for historical/legacy subscriptions.
BEGIN;
ALTER TABLE payment_methods DROP CONSTRAINT IF EXISTS payment_methods_provider_key_check;
ALTER TABLE payment_methods
  ADD CONSTRAINT payment_methods_provider_key_check
  CHECK (provider_key IN ('paddle','lemon_squeezy','manual_bank_transfer'));
DELETE FROM payment_methods WHERE provider_key='safepay';
INSERT INTO payment_methods
  (id,provider_key,display_name,description,enabled,public_config,sort_order,created_at,updated_at)
VALUES
  (gen_random_uuid(),'paddle','Paddle','Secure global subscription checkout',FALSE,'{}'::jsonb,10,NOW(),NOW())
ON CONFLICT (provider_key) DO UPDATE
  SET display_name=EXCLUDED.display_name,
      description=EXCLUDED.description,
      enabled=FALSE,
      updated_at=NOW();
COMMIT;

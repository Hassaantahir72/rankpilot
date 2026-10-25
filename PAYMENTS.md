# RankPilot payment providers

## Current implementation status

- Payment-method configuration is stored in PostgreSQL in `payment_methods`. The admin UI is available at Dashboard → Admin → Payment Methods and is superadmin-only.
- Public pricing and billing pages load methods from `GET /api/payment-methods`. A method appears only when it is enabled, its server-side configuration is complete, and its adapter is marked ready.
- Lemon Squeezy checkout is implemented using the server-side API. Subscription entitlements are changed only by signed webhook events that report an active subscription and a known, server-configured variant ID.
- Safepay is catalogued as a candidate but its checkout/subscription webhook adapter is **not implemented** in this branch. It remains impossible to enable, even if credentials exist.
- Manual bank transfer is listed as a possible provider but automatic/manual payment review workflow is not implemented. It remains impossible to enable.
- New Stripe checkout is disabled. Legacy Stripe webhooks and billing portal remain for existing subscriptions during migration.

No provider is live until the relevant credentials are configured, migrations are applied, and sandbox checkout/webhook tests pass.

## Migrations

Apply these migrations in order after backing up the database:

1. `backend/migrations/20261025_four_tier_pricing.sql` (required by the existing pricing PR).
2. `backend/migrations/20261025_payment_methods.sql`.
3. `backend/migrations/20261025_provider_billing_linkage.sql`.

Run them in staging first. Do not apply production migrations from an unreviewed pull request.

## Lemon Squeezy setup

Set the following environment variables on the **Render backend only**. Never put secret values in Vercel `NEXT_PUBLIC_*` variables or the database.

- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `LEMONSQUEEZY_VARIANT_STARTER_MONTHLY`
- `LEMONSQUEEZY_VARIANT_GROWTH_MONTHLY`
- `LEMONSQUEEZY_VARIANT_PRO_MONTHLY`
- `LEMONSQUEEZY_VARIANT_AGENCY_MONTHLY`
- `LEMONSQUEEZY_VARIANT_STARTER_ANNUAL`
- `LEMONSQUEEZY_VARIANT_GROWTH_ANNUAL`
- `LEMONSQUEEZY_VARIANT_PRO_ANNUAL`
- `LEMONSQUEEZY_VARIANT_AGENCY_ANNUAL`
- `LEMONSQUEEZY_TEST_MODE=true` while testing
- `LEMONSQUEEZY_ADAPTER_READY=true` only after all sandbox checkout, webhook, cancellation, failure, and cross-account tests pass in a staging environment. It defaults to disabled.
- `FRONTEND_URL=https://rankpilot-sync786.vercel.app` (use your actual production frontend origin)

In Lemon Squeezy, create a webhook pointing to:

`https://rankpilot-ixnc.onrender.com/api/webhooks/lemon-squeezy`

Set the exact signing secret in `LEMONSQUEEZY_WEBHOOK_SECRET`. Subscribe at minimum to subscription-created, subscription-updated, subscription-resumed, subscription-cancelled, subscription-expired, subscription-paused, subscription-payment-success, and subscription-payment-failed events. Confirm the event names against the current Lemon Squeezy dashboard/API docs before production.

After configuring the variables, create the Lemon Squeezy entry in Admin → Payment Methods. It starts disabled. The backend checks all credentials and eight monthly/annual variant IDs plus the explicit `LEMONSQUEEZY_ADAPTER_READY=true` gate before allowing the superadmin to enable it. Leave that flag unset until sandbox tests have passed. The frontend does not receive the API key or webhook secret.

Official docs:
- Supported countries and payout eligibility: https://docs.lemonsqueezy.com/help/getting-started/supported-countries
- Create checkout: https://docs.lemonsqueezy.com/api/checkouts/create-checkout
- Webhook signature/event setup: https://docs.lemonsqueezy.com/help/webhooks

## Safepay status

Safepay supports a sandbox and documents recurring subscriptions. However, this branch does not yet implement its subscription checkout URL flow, event signature verification, idempotent subscription webhook processing, or entitlement mapping. Its admin entry will therefore stay disabled. Do not set any readiness flag or manually edit the database to force it on.

Official docs:
- API reference and sandbox: https://apidocs.getsafepay.com/
- Pricing and subscription overview: https://safepay.com.pk/pricing

## Required verification before launch

1. Apply migrations in staging and confirm the public endpoint returns no methods by default.
2. Add Lemon Squeezy in admin; confirm it starts disabled and cannot be enabled when any environment variable is missing.
3. Use Lemon Squeezy test mode and test all four monthly and four annual variants.
4. Confirm forged/missing signatures return 400 and never grant access.
5. Confirm duplicate webhook events are idempotent, unknown variants never grant a paid plan, and cancellation/payment failure removes or suspends paid access as appropriate.
6. Confirm users cannot select another account's ID, arbitrary variant ID, or arbitrary checkout URL.
7. Confirm the public pricing page updates after the superadmin enables/disables the method without a frontend redeploy.
8. Only after these tests and provider approval should live mode be enabled.

The website intentionally fails closed: no configured/verified provider means no public payment method and no new checkout.

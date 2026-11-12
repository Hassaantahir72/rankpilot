# RankPilot payment providers

## Paddle Billing (primary provider)

Paddle is the planned primary Merchant of Record for global RankPilot SaaS subscriptions. The integration uses hosted Paddle checkout and server-side price selection. RankPilot only grants paid access after a verified Paddle webhook for a completed transaction. Subscription lifecycle events update the account status, scheduled cancellation date, and plan. Webhook event IDs are deduplicated and failed processing is allowed to retry.

### Required Render backend environment variables

Add these directly in Render → RankPilot backend → Environment. Never send secret values in chat or put them in Vercel public variables.

- `PADDLE_API_KEY` — Paddle API key with customer and transaction permissions.
- `PADDLE_WEBHOOK_SECRET` — endpoint secret from the Paddle notification destination.
- `PADDLE_ENVIRONMENT` — `sandbox` during testing; change to `production` only after Paddle approves the account and live catalog is created.
- `PADDLE_PRICE_STARTER_MONTHLY`
- `PADDLE_PRICE_GROWTH_MONTHLY`
- `PADDLE_PRICE_PRO_MONTHLY`
- `PADDLE_PRICE_AGENCY_MONTHLY`
- `PADDLE_PRICE_STARTER_ANNUAL`
- `PADDLE_PRICE_GROWTH_ANNUAL`
- `PADDLE_PRICE_PRO_ANNUAL`
- `PADDLE_PRICE_AGENCY_ANNUAL`
- `PADDLE_ADAPTER_READY=false` until all sandbox lifecycle tests pass.
- `FRONTEND_URL=https://rankpilot-sync786.vercel.app`

The eight price IDs must be Paddle recurring price IDs beginning with `pri_`, with the matching billing interval. Sandbox and live Paddle catalogs have different IDs; never reuse sandbox IDs in production.

### Paddle webhook destination

Create an HTTPS webhook destination in Paddle → Developer tools / Events → Notifications:

`https://rankpilot-ixnc.onrender.com/api/webhooks/paddle`

Subscribe to:
- `transaction.completed`
- `subscription.created`
- `subscription.updated`
- `subscription.canceled`

Copy that destination's endpoint secret into `PADDLE_WEBHOOK_SECRET`. The backend verifies the Paddle-Signature HMAC against the exact raw request body and rejects stale or invalid signatures.

### Safe activation sequence

1. Obtain Paddle seller approval and complete business/payout verification.
2. Create the four RankPilot products and eight recurring prices in Paddle sandbox.
3. Configure the sandbox API key, webhook secret, environment, and eight sandbox price IDs in Render.
4. Keep `PADDLE_ADAPTER_READY=false`; run checkout and webhook simulator tests for initial payment, renewal, failed payment, scheduled cancellation, immediate cancellation, and duplicate/out-of-order events.
5. Verify the admin Orders and Transactions ledger and that access changes only from signed provider events.
6. After sandbox verification, create the matching live catalog, live API key and live webhook destination; replace all sandbox values in Render.
7. Set `PADDLE_ENVIRONMENT=production`, then set `PADDLE_ADAPTER_READY=true` and enable Paddle in Admin → Payment Methods.

Paddle's live and sandbox keys, products, prices, and notification destinations are separate. Never enable production payments before live seller approval and live webhook testing.

## Legacy billing

Existing Lemon Squeezy code and subscription references are retained only for accounts already linked to that provider during migration. It is not the primary new-customer payment route. Existing Stripe billing webhooks remain for legacy subscriptions.

Safepay has been removed from the supported payment-provider registry. The migration removes its payment-method row and replaces its database constraint entry with Paddle.

## Security behavior

- Provider secrets remain server-side in Render.
- Checkout price IDs are selected from server environment variables, never accepted from the browser.
- The authenticated RankPilot user ID, selected plan, and interval are attached as server-created Paddle custom data.
- A completed transaction must match one of the eight configured price IDs before paid access is granted.
- Duplicate webhook event IDs are ignored; failed processing is returned as an error so Paddle can retry.
- Customer card data is collected by Paddle hosted checkout; RankPilot does not store card numbers.

# RankPilot Security and Billing Operations

## Before enabling paid plans

1. Back up the PostgreSQL database and review `backend/migrations/20261025_four_tier_pricing.sql`.
2. Apply the migration before deploying the webhook code. It updates plan entitlements, adds session revocation support, and creates the Stripe webhook idempotency table.
3. Create real monthly and annual recurring prices for Starter ($15), Growth ($29), Pro ($59), and Agency ($99) in Stripe. Use the resulting Price IDs; never use placeholders.
4. Set backend-only secrets in Render: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY`, their four `_ANNUAL` variants, and `FRONTEND_URL`.
5. Set the corresponding public price IDs in Vercel as `NEXT_PUBLIC_STRIPE_PRICE_*` and `NEXT_PUBLIC_STRIPE_PRICE_*_ANNUAL`. These IDs are identifiers, not secret keys. Never put the Stripe secret key in a `NEXT_PUBLIC_*` variable.
6. Configure the Stripe webhook URL as `https://rankpilot-ixnc.onrender.com/api/webhooks/stripe` and subscribe to `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
7. Enable Stripe Customer Portal and configure the payment methods you want to accept. Checkout uses Stripe-hosted dynamic payment methods; actual options depend on eligibility, currency, country, and Stripe Dashboard settings.
8. Run test-mode checkout, failed payment, cancellation, plan-change, duplicate-webhook, and payment-method update scenarios before switching to live mode.

## Security controls in the application

- Checkout prices are allow-listed on the backend. The browser cannot choose an arbitrary Stripe price.
- Paid entitlements are granted only after verified Stripe events and an active subscription/payment state.
- Stripe webhook event IDs are stored to prevent duplicate processing.
- Users must verify email before starting checkout or opening their billing portal.
- The existing admin panel at `/dashboard/admin` can open an audited Stripe Billing Portal for a customer. Do not directly edit database plan values for Stripe-managed subscriptions; use the portal so Stripe and the database stay in sync.
- Logout and password resets increment `token_version`, invalidating existing JWT sessions.
- Admin user details return an explicit allow-list of fields; request logs redact password/token/secret values.
- Production PostgreSQL connections use TLS certificate verification.
- Outbound website crawling uses the safe HTTP service to restrict private-network/SSRF destinations.

## Credential handling

- A previously exposed `.env` file contained credentials. Treat every credential in that file as compromised and rotate it in its provider dashboard, including JWT, database, email, and AI-provider credentials. Revoke old keys after updating the deployed environment.
- Keep local `.env` files out of Git. Do not paste secrets into issues, PR descriptions, chat messages, screenshots, or logs.
- If a credential is accidentally committed, removing the file is not enough: rotate the credential and remove the secret from repository history where appropriate.

## Release checks

- Wait for GitHub Actions syntax/security tests and a successful frontend production build.
- Vercel preview builds may be temporarily blocked by deployment/build quotas; use the GitHub Actions frontend build as a separate verification, then retry the preview build.
- Do not deploy this PR until the migration is applied, Stripe IDs and webhook secrets are configured, and the full payment lifecycle is tested in Stripe test mode.
- Report vulnerabilities privately to the repository owner. Do not publish exploitable details or secrets in a public issue.

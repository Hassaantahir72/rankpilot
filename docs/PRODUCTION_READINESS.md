# RankPilot production readiness notes

Updated: 2026-11-09

## Changes prepared on the security review branch

- Restricted direct Supabase Data API table, sequence, and function privileges for `anon` and `authenticated`. The Render backend uses server-side PostgreSQL credentials; `service_role` retains its server-only grants.
- Added the matching Supabase migration at `backend/migrations/202611090001_restrict_public_db_access.sql`.
- Updated backend dependencies using non-force npm remediation, including Node Cron, Nodemailer, UUID, Axios, Express and transitive packages.
- Removed the vulnerable Nodemon development dependency and uses Node's built-in watch mode.
- Upgraded the frontend to Next.js 16.4.5 and React 19.2.5, with patched PostCSS 8.5.32.
- Wrapped search-parameter pages in Suspense and moved the Google Fonts CSS import before Tailwind directives to support the updated Next.js build.
- Added a dependency audit workflow that fails if any npm vulnerability remains.

## Validation recorded

- Backend test suite: 6 tests passed.
- Backend npm audit: 0 vulnerabilities.
- Frontend Next.js production build: all 49 routes generated successfully on the final security-remediation run.
- Frontend npm audit: 0 vulnerabilities on the final security-remediation run.
- Supabase grant verification: no table grants remain for `anon` or `authenticated`; `service_role` grants remain.

## Production launch prerequisites that still require external configuration or owner action

1. Create and verify the owner account, then enroll the RankPilot TOTP secret in the authenticator app.
2. Configure Brevo SMTP/API credentials in Render and test delivery for customer verification, password reset and admin OTP.
3. Configure Lemon Squeezy API key, store ID, webhook secret, eight plan/interval variant IDs, and the adapter readiness flag in Render. Configure the signed webhook endpoint in Lemon Squeezy and test the complete payment lifecycle before enabling the method.
4. Run end-to-end tests for customer signup, email verification, trial eligibility, onboarding, plan entitlements, paid checkout, webhook replay protection, cancellation, refunds and admin access controls.
5. Move Render off the Free instance plan, configure a health-check endpoint/path, backups, uptime monitoring and alerting.
6. Choose and register the production custom domain, configure DNS and SSL, then test redirects, canonical URLs and public access.
7. Complete a final production smoke test and review security/runtime logs before marketing launch.

Never store provider secrets in this repository, browser-exposed `NEXT_PUBLIC_*` variables, or the database.

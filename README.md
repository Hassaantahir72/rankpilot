# 🚀 RankPilot v2.0 — Complete AI Marketing Platform

**PostgreSQL · Full Admin Control · Enterprise Security**

---

## 🔒 Security Architecture

### Authentication
- Email OTP verification on signup (6-digit, 10 min expiry, 5 attempt lockout)
- OTP 2FA on every login (security code emailed each sign-in)
- Password reset via OTP
- bcrypt password hashing (12 rounds)
- JWT tokens (7-day expiry)
- Failed login tracking + auto IP block after 10 failures

### Request Security
- Rate limiting: 150 req/15min global, 20 req/15min auth
- Admin routes: separate 60 req/15min limiter
- IP blocklist checked on every request
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- All admin actions logged to `admin_audit_log`
- All security events logged to `security_events`

### Admin Protection (layered guards)
```
Request → authMiddleware → adminSecurityCheck → adminRateLimit → logAdminRequest → controller
```
- `authMiddleware`: verifies JWT
- `adminSecurityCheck`: re-fetches user from DB every request (prevents stale sessions), checks role, IP block, ban
- `adminRateLimit`: admin-specific rate limit
- `logAdminRequest`: logs all admin HTTP requests

### Superadmin-only actions
- Delete users
- Change roles
- Reset passwords
- Impersonate users (1-hour token)
- Block/unblock IPs
- Site settings (maintenance mode, signup control, trial days)

---

## ⚡ Quick Start (Windows)

### 1. Create PostgreSQL database
```sql
-- In psql or pgAdmin:
CREATE DATABASE rankpilot;
\c rankpilot
\i backend/schema.sql
-- OR: psql -U postgres -d rankpilot -f backend/schema.sql
```

### 2. Fill backend/.env
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rankpilot
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">

GROQ_API_KEY=gsk_...        # FREE at console.groq.com
DATAFORSEO_LOGIN=your@email
DATAFORSEO_PASSWORD=pass

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=xxxx_xxxx_xxxx    # Gmail App Password

# Optional (needed for Stripe billing):
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...
```

### 3. Run
```
SETUP.bat  →  START.bat  →  http://localhost:3000
```

### 4. Make yourself superadmin
```sql
UPDATE users SET role = 'superadmin' WHERE email = 'your@email.com';
```

---

## 🗄 Database

All tables in `backend/schema.sql`. Safe to re-run (all `CREATE TABLE IF NOT EXISTS`).

Key tables:
| Table | Purpose |
|-------|---------|
| `users` | Accounts with plan, OTP, Stripe |
| `plan_limits` | Feature gates per plan |
| `websites` | User websites |
| `audits` | SEO audit results (JSONB) |
| `keywords` | Research results |
| `rankings` | Weekly rank tracking |
| `content_history` | AI-written content |
| `campaigns` | Google/Meta ad campaigns |
| `reports` | Weekly AI reports |
| `usage_tracking` | Monthly usage per user |
| `support_tickets` | Support ticket system |
| `ticket_messages` | Ticket thread messages |
| `chat_sessions` | AI chatbot sessions |
| `chat_messages` | Chat message history |
| `canned_responses` | Agent shortcut responses |
| `admin_audit_log` | Every admin action |
| `security_events` | All security events |
| `blocked_ips` | Blocked IP addresses |
| `site_settings` | Admin-controlled settings |
| `billing_history` | Stripe payment records |
| `contact_messages` | Contact form submissions |

---

## 🔑 Admin Panel (`/dashboard/admin`)

### Overview tab
- Total users, active subs, revenue, websites, audits, new signups
- Plan breakdown chart
- Recent security events (last 24h)

### Users tab
- Search by email/name
- Filter by plan, status, banned state
- Per-user detail: websites, audits, usage, billing, security events
- Actions: change plan, ban/unban, verify email
- Superadmin: change role, reset password, impersonate, delete

### Settings tab (superadmin only)
- `maintenance_mode` — puts entire site in maintenance (true/false)
- `allow_signups` — disable new registrations (true/false)
- `free_plan_enabled` — control free tier
- `site_notice` — banner shown to all users
- `trial_days` — control trial duration
- `max_free_websites` — control free plan limits

### Security tab
- Block/unblock IP addresses (superadmin)
- Security events log (all events with IP, user, timestamp)
- Events tracked: `login_success`, `failed_login`, `ip_blocked`, `ban_user`, `user_deleted`, `admin_request`, etc.

### Messages tab — all contact form submissions
### Billing tab — all Stripe payment records
### Audit Log — every admin action ever taken

---

## 🌐 Go Live Later

When ready to deploy:

1. **Database**: Change `DB_*` env vars to your production Postgres (Supabase, Neon, Railway, etc.)
2. **Backend**: Deploy to Railway/Render/Fly.io — add all `.env` values
3. **Frontend**: Deploy to Vercel — set `NEXT_PUBLIC_API_URL=https://your-api.com/api`
4. **Zero code changes** needed — just env vars

---

## 📁 File Structure

```
rankpilot/
├── backend/
│   ├── src/
│   │   ├── config/db.js                  PostgreSQL pool
│   │   ├── middleware/
│   │   │   ├── auth.js                   JWT + plan gates + usage limits
│   │   │   ├── security.js               Admin security, IP blocking, brute force
│   │   │   └── siteGuard.js              Maintenance mode, signup control, IP check
│   │   ├── controllers/
│   │   │   ├── authController.js         OTP auth + 2FA + security tracking
│   │   │   ├── seoController.js          Websites, audits, content, rankings
│   │   │   ├── adsController.js          Google/Meta/Social campaigns
│   │   │   ├── adminController.js        Full site control
│   │   │   └── supportController.js      AI chat, tickets, agent system
│   │   ├── routes/
│   │   │   ├── auth.js / seo.js / ads.js
│   │   │   ├── admin.js                  Layered security guards
│   │   │   ├── support.js / webhooks.js
│   │   │   └── dashboard.js / reports.js / contact.js
│   │   ├── services/
│   │   │   ├── aiService.js              Groq (free) — SEO, content, ads, reports
│   │   │   ├── emailService.js           Gmail SMTP — OTP, welcome, tickets
│   │   │   ├── crawlerService.js         Web crawler
│   │   │   ├── keywordService.js         Keyword research
│   │   │   └── dataforSeoService.js      DataForSEO API
│   │   ├── jobs/
│   │   │   ├── rankTracker.js            Weekly cron
│   │   │   └── contentRefresher.js       Monthly cron + weekly reports
│   │   └── index.js                      Express app + all middleware
│   ├── schema.sql                         Full PostgreSQL schema
│   └── .env.example
│
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx                  Landing page
        │   ├── pricing/                  Plan pricing with toggle
        │   ├── features/                 Feature showcase
        │   ├── about/ blog/ careers/ contact/ privacy/ terms/
        │   ├── maintenance/              Maintenance mode page
        │   ├── auth/
        │   │   ├── login/                Email → OTP 2FA
        │   │   ├── signup/               Register → OTP verify
        │   │   ├── verify-email/         6-digit OTP input
        │   │   ├── forgot-password/      Email reset code
        │   │   └── reset-password/       OTP + new password
        │   └── dashboard/
        │       ├── page.tsx              Home + usage + trial banner
        │       ├── seo/                  Full SEO module + plan gates
        │       ├── ads/                  Google/Meta/Social + plan gates
        │       ├── reports/              Weekly reports
        │       ├── billing/              Plans + Stripe + usage bars
        │       ├── upgrade/              Plan upgrade page
        │       ├── settings/             Account/security/integrations
        │       ├── support/              Tickets + AI chat help center
        │       └── admin/
        │           ├── page.tsx          Full admin panel (7 tabs)
        │           └── support/          Support management panel
        ├── components/
        │   ├── layout/Navbar.tsx Footer.tsx
        │   ├── ui/ScrollReveal.tsx CountUp.tsx
        │   ├── dashboard/PlanGate.tsx UsageBar
        │   └── chat/ChatWidget.tsx ChatWidgetWrapper.tsx
        └── lib/
            ├── api.ts                    All API methods
            └── auth.tsx                  Auth context + plan limits
```

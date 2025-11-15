---
name: SaaS Template
description: Complete SaaS feature spec: auth, billing, multi-tenancy, compliance
---

# SaaS Platform Specification

Scalable, secure SaaS for modern web apps. USD wallet billing, tiered memberships, serverless SPA architecture. Prioritize security, usability, extensibility.

## Core Requirements
- **Architecture**: Responsive SPA, serverless backend (Vercel/Cloudflare)
- **Currency**: USD only
- **Billing**: Wallet-based (Stripe), membership discounts before deductions
- **Memberships**: Tiers (Small/Medium/Large) with monthly auto-top-ups, discounts, entitlements. Yearly = 10x monthly. Admin-configurable.
- **Compliance**: GDPR/CCPA compliant, verifiable acceptance criteria

## Core Features

### Auth & User Management
- **Auth**: Email/password, SSO (Google/OAuth), Passkey-first 2FA (SimpleWebAuthn), reCAPTCHA v3, rate limiting (5 attempts/5min)
- **Sessions**: Rotating JWTs, Redis denylist, log all logins (IP, UA, timestamp)
- **Security**: 2FA setup/recovery codes, email alerts for new logins/devices
- **Profiles**: Display name, bio, avatar (128x128px, S3)
- **Usernames**: Unique, lowercase, reserved blocks, 30-day change cooldown + audit
- **Devices**: Active sessions list (IP/UA/location), one-click logout

- **Invites & Referrals**: Shareable codes/links/QR with limits/expiration. Track referrals, reward wallet credits (configurable).
- **Notifications**: User-configurable email/push, in-app hub with bell, unread counts, mark-read
- **Activity Feed**: Log actions (recharges, spends, logins, invites, referrals) with timestamps/filters

### Billing & Wallet
- **Wallet**: USD balances, Stripe top-ups (min $10), auto-deduct with tier discounts
- **Memberships**: Tiers ($10/mo, $50/mo, $100/mo) with auto-top-up, % discounts, perks. Yearly = 10x. Admin CRUD.
- **Invoicing**: PDF receipts, admin dashboard for search/export (CSV/PDF)

### Admin Dashboard
Role-based (admin/moderator). Charts/tables for insights.
- **Overview**: Metrics (date, plan, region, device), visualize revenue/users/growth
- **User Management**: Search, role assignment, bans, username approval
- **Billing**: Manage subscriptions/refunds, invoices, bulk adjustments
- **Wallet**: Reconcile, flag anomalies (>$1000 top-up)
- **Marketing**: Newsletter lists/broadcasts, track open/unsubscribe
- **Invites/Referrals**: Generate codes/programs, monitor stats/rewards
- **Memberships**: CRUD plans (price, top-up, discounts, entitlements)
- **Notifications**: Global broadcasts (email/push)
- **Support**: Ticket queue with reply/status
- **Audits**: Searchable logs (user/action/timestamp), export

### Content & Support
- **Knowledge Base**: Docs/FAQ (MDX)
- **CMS**: Blog for announcements
- **Status**: Real-time uptime/incidents, historical data
- **Help**: Contact form → tickets, admin responses

### Public Pages
- **Landing**: Home, Features, Pricing (SEO-optimized)
- **Profiles**: /u/<username> (bio, stats, Open Graph)
- **Referrals**: /r/<code> redirects with tracking
- **Legal**: Terms, Privacy, Cookies. Consent banner with granular controls.

### Advanced Features
- **Error Handling**: Custom 404/500, search/suggestions, auto-redirect
- **Analytics**: Consent-gated GA, newsletter engagement (no PII)
- **Consent**: Log agreements (user_id, type, version, timestamp, IP/UA). Version policies, granular toggles, history export/revocation.

## Legal & Compliance
GDPR, CCPA, PECR. Data minimization, user rights.
- **Cookies**: Banner with opt-in/out, categorize (necessary, analytics, marketing), persist in DB
- **Data Rights**: Export/delete endpoints, process within 30 days (P1)
- **Documentation**: MDX pages (Privacy, Terms, Cookies), version updates with notifications
- **Logging**: Immutable consent/action records, audit for compliance

## Deployment
Serverless for scalability, CI/CD for reliability.
- **Local**: Docker Compose (web/DB/Redis). Run: `bun install && bun db:migrate && bun dev`
- **Monitoring**: Sentry for errors, SLO alerts (99.9%), retry failed webhooks (3x, exponential)
- **Status**: Auto-update from monitoring events

## Testing
100% coverage, enforce via CI. TDD for new features.
- **Unit**: Vitest, mock externalities
- **E2E**: Playwright (register → login → 2FA → top-up → consume → invoice → unsubscribe → invite → referral → ticket)
- **Accessibility**: axe-core, Lighthouse A11y >95
- **Performance**: Responsive, lazy loading, Iconify icons
- **Quality**: Biome linting/formatting, pre-commit hooks

---
name: SaaS Template
description: Complete SaaS feature spec: auth, billing, multi-tenancy, compliance
---

# Optimized SaaS Platform Specification Template

This template defines a scalable, secure SaaS platform for modern web apps. Adapt to project needs while ensuring completeness, functionality, and global compliance (e.g., GDPR). Core: USD wallet billing, tiered memberships with auto-top-ups/discounts, serverless SPA architecture. Prioritize security, usability, and extensibility.

## Core Requirements
- **Architecture**: Build as a responsive single-page application (SPA) using serverless backend (e.g., Vercel/Cloudflare). Ensure full functionality across devices.
- **Currency**: Operate exclusively in USD for billing/wallets.
- **Billing Model**: Wallet-based with Stripe integration; apply membership discounts before deductions.
- **Memberships**: Tiers (Small/Medium/Large) with monthly auto-top-ups, discounts, and entitlements. Yearly plans = 10x monthly rate. Make admin-configurable.
- **Compliance**: All features must meet global standards (GDPR/CCPA); implement verifiable acceptance criteria (AC) for each.


## Core Features
Implement all features as modular, secure components. Use TDD for verification.

### Authentication & User Management
- **Auth Flows**: Support email/password registration/login/reset; integrate SSO (e.g., Google/OAuth). Enforce Passkey-first 2FA via SimpleWebAuthn, reCAPTCHA v3, and rate limiting (e.g., 5 attempts/5min).
- **Sessions**: Use rotating JWTs; denylist invalid tokens in Redis; log all login events (IP, UA, timestamp).
- **Security Preferences**: Enable 2FA setup/recovery codes; send email alerts for new logins/devices.
- **Profiles**: Allow editable display name, bio, avatar upload (resize to 128x128px, store in S3).
- **Usernames**: Enforce uniqueness, lowercase normalization, reserved word blocks; add 30-day change cooldown with audit history.
- **Devices**: List active sessions with IP/UA/location; provide one-click logout per device.

- **Invites & Referrals**: Generate shareable codes/links/QR with usage limits/expiration (e.g., 10 uses/30 days). Track referrals; reward wallet credits on triggers (signup, first payment, subscription—admin configurable).
- **Notifications**: User-configurable email/push; in-app hub with bell icon, unread counts, mark-as-read functionality.
- **Activity Feed**: Log user actions (recharges, spends, logins, invites, referrals) with timestamps/filters.

### Billing & Wallet System
- **Wallet Management**: USD balances only; integrate Stripe for top-ups (min $10); auto-deduct for usage, applying tier discounts first.
- **Memberships**: Define tiers (Small: $10/mo, Medium: $50/mo, Large: $100/mo) with auto-top-up thresholds, % discounts, and perks (e.g., priority support). Yearly pricing = 10x monthly. Allow admin CRUD.
- **Invoicing**: Generate PDF receipts for transactions; admin dashboard for search/export (CSV/PDF) by date/user/amount.

### Admin Dashboard
Secure role-based access (admin/moderator). Use charts/tables for insights.
- **Overview**: Metrics dashboard with filters (date range, plan, region, device); visualize revenue/users/growth.
- **User Management**: Advanced search, role assignment, bans, username approval workflows.
- **Billing Tools**: Manage subscriptions/refunds; link to invoices; process bulk adjustments.
- **Wallet Oversight**: Reconcile balances; flag anomalies (e.g., >$1000 top-up).
- **Marketing**: Newsletter lists/broadcasts; track open/unsubscribe rates.
- **Invites/Referrals**: Admin-generate codes/programs; monitor stats/rewards.
- **Memberships**: CRUD plans (price, top-up flow, discounts, entitlements); enable/disable.
- **Notifications**: Send global broadcasts (email/push).
- **Support**: Ticket queue with reply/status updates (open/resolved).
- **Audits**: Searchable logs (user/action/timestamp); export for compliance.

### Content Delivery & Support
- **Knowledge Base**: Static/dynamic docs/FAQ for self-help (e.g., MDX-powered).
- **CMS**: Blog for announcements/articles; integrate with admin for publishing.
- **Status Monitoring**: Public page showing real-time uptime/incidents; historical data.
- **Help System**: User contact form auto-creates tickets; admin handles responses/escalations.

### Public-Facing Pages
- **Landing**: Home, Features, Pricing pages with SEO-optimized content.
- **Profiles**: /u/<username> for public views (bio, stats); include Open Graph meta.
- **Referrals**: Short /r/<code> redirects with tracking.
- **Legal**: Dedicated pages for Terms, Privacy, Cookies; implement consent banner with granular controls.

### Advanced Features
- **Error Handling**: Custom 404/500 pages with search/suggestions; auto-redirect to relevant content.
- **Analytics**: Consent-gated Google Analytics; track newsletter engagement (opens/clicks) without PII.
- **Consent Management**: Log all agreements in DB (user_id, type, version, timestamp, IP/UA). Version policies; require checkboxes at signup; offer granular toggles (essential/analytics/ads); enable history export/revocation.

## Legal & Compliance Standards
Ensure full adherence to GDPR, CCPA, PECR. Prioritize data minimization and user rights.
- **Cookie Handling**: Implement banner with opt-in/out; categorize (necessary, analytics, marketing); persist preferences in DB.
- **Data Rights**: Provide export/revoke (delete) endpoints; process within 30 days (P1 priority).
- **Documentation**: MDX-powered pages for Privacy Policy, Terms of Service, Cookies; update versions with user notifications.
- **Logging**: Record all consents/actions immutably; audit for compliance.

## Deployment & Operations
Deploy serverlessly for scalability; use CI/CD for reliability.
- **Local Setup**: Docker Compose for web/DB/Redis stack. Run entrypoint: `bun install && bun db:migrate && bun dev`.
- **Monitoring**: Integrate Sentry for errors; set SLO alerts (e.g., 99.9% uptime); retry failed webhooks (3 attempts, exponential backoff).
- **Status Integration**: Auto-update public status page from monitoring events.

## Testing & Quality Assurance
Achieve 100% coverage; enforce via CI. Use TDD for new features.

- **Unit Tests**: Vitest for components/functions; mock externalities.
- **E2E Tests**: Playwright for end-to-end flows, e.g., register → login → enable 2FA → top-up wallet → consume service → download invoice → unsubscribe → invite friend → claim referral → submit ticket.
- **Accessibility**: Run axe-core scans; target Lighthouse A11y score >95.
- **Performance**: Ensure responsive design; implement lazy loading; use Iconify for icons (avoid emojis for consistency).
- **Code Quality**: Biome for linting/formatting; pre-commit hooks to block violations.
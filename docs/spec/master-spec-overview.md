# Master Specifications Overview and Project Gaps

## Purpose
This master document serves as the central index for all modular specs, providing a high-level framework for the advanced SaaS SPA website. It outlines the overall architecture, cross-references specs, and highlights current incompletenesses/gaps in the project based on the defined requirements. The site aims for a complete, modern, serverless USD-based platform with wallet billing, referrals, admin tools, and full compliance. Focus: Stateless, real-time, responsive; English-only; Iconify icons; dark/light themes.

## 1. Overall Project Framework
- **Vision**: A scalable, user-centric SaaS with hybrid billing (subscriptions for auto-topups/discounts + pay-as-you-go wallet). Core: Auth → Account management → Consumptions (deduct wallet) → Admin oversight. Real-time via Redis; payments via Stripe; typesafe via tRPC/Drizzle.
- **Key Tenets**:
  - Serverless/Stateless: JWT sessions, Upstash Redis, Neon Postgres.
  - UI/UX: ChatGPT-like minimalism (dark priority, color blocks, Radix/PandaCSS).
  - Compliance: GDPR/CCPA via consents, audits, opt-ins.
  - Growth: Invites/referrals with wallet rewards.
  - Ops: Docker local, Vercel deploy, automated tests.
- **Tech Stack Summary**: Next.js (App Router), tRPC, Auth.js, Drizzle/Postgres, Redis (Streams/PubSub), Stripe, Zustand, Biome, pnpm, React-Use, Radix UI, Iconify.
- **Non-Features**: No multi-language, KYC, internal transfers, data export (beyond CSV), webhook explorer, multi-tenant.

## 2. Specs Index
All specs are modular, focusing on high-level requirements without low-level implementation. Files in docs/spec/:

- **[UI/UX Spec](ui-ux-spec.md)**: Modern SPA principles (minimalist, responsive, dark/light, Iconify-only, WCAG AA). Gaps: Missing padding/margins in current pages; login invisible on mobile; debug logs visible.
- **[Technical Stack Spec](technical-stack-spec.md)**: Frontend (Next/Zustand/Radix), Backend (tRPC/Auth.js), Data (Drizzle/Postgres/Redis), Payments (Stripe). Gaps: Incomplete tRPC routers (e.g., referral); partial serverless (no edge functions).
- **[Information Architecture Spec](information-architecture-spec.md)**: Pages/routes (marketing/auth/account/admin/public profiles). Gaps: Missing activity/consent views; no unified search; mobile nav incomplete.
- **[Billing and Wallet Spec](billing-and-wallet-spec.md)**: USD wallet (top-ups/deductions), Subscriptions (3 tiers, auto-topup + discounts, yearly 10x monthly). Gaps: No ledger double-entry; missing proration/invoice PDFs.
- **[Legal and Consent Spec](legal-and-consent-spec.md)**: Terms/Privacy/Cookies pages; banner/preferences; logged consents. Gaps: No consents table; missing re-consent on updates; granular toggles incomplete.
- **[Referral System Spec](referral-system-spec.md)**: Wallet credits on conversions; admin config; anti-abuse. Gaps: No ref_* schemas; UTM tracking absent; fraud flags not implemented.
- **[Notifications System Spec](notifications-system-spec.md)**: In-app/email/push; preferences; broadcasts. Gaps: No notifications table; Pub/Sub not wired; no in-app bell.
- **[Auth and Security Spec](auth-security-spec.md)**: JWT/2FA/sessions; rate limiting. Gaps: No MFA TOTP; login activity unlogged; geo-IP missing.
- **[Admin Panel Spec](admin-panel-spec.md)**: Dashboard/charts; CRUD for users/plans; analytics. Gaps: No Recharts/TanStack; advanced filters/grouping incomplete.
- **[Invite System Spec](invite-system-spec.md)**: Code generation/redemption; limits/expiry. Gaps: No invites schema; validation logic absent.
- **[Support System Spec](support-system-spec.md)**: Tickets form/management; self-service (FAQ/docs). Gaps: No tickets schema; email sync missing.
- **[Activity and Audit Logs Spec](activity-audit-logs-spec.md)**: User activity + admin audits; search/export. Gaps: No activity/audit tables; real-time feed not set.
- **[Newsletter System Spec](newsletter-system-spec.md)**: Double opt-in; admin sends/analytics. Gaps: No subscribers schema; email provider (Resend) integration pending.
- **[Deployment and DevOps Spec](deployment-devops-spec.md)**: Docker Compose (one-up dev); Vercel CI/CD; monitoring. Gaps: Incomplete compose.yml/entry script; no GitHub Actions workflow.
- **[Testing and Quality Spec](testing-quality-spec.md)**: Unit/E2E (Vitest/Playwright); a11y/performance. Gaps: No test setups; coverage <80%; Lighthouse baselines missing.

## 3. Cross-Cutting Concerns
- **Data Schemas**: Central Drizzle: users, sessions, wallet_*, subscriptions, consents, invites, ref_*, notifications, support_tickets, audit_logs, newsletter_subscribers, activity. Gaps: Many tables missing (e.g., consents, ref_links); relations/indexes incomplete.
- **tRPC Routers**: auth, user, account, billing, wallet, admin, invite, referral, notification, support, newsletter. Gaps: Protected/admin procedures partial; subscriptions for real-time absent.
- **Integrations**: Stripe webhooks (idempotent top-ups); Redis Pub/Sub/Streams (notifications/playback); Email (Resend for newsletters/notifs). Gaps: Webhook handling incomplete; Streams for sessions not implemented.
- **Real-Time**: SSE via tRPC for updates (balance, tickets). Gaps: No playback feature; Pub/Sub wiring pending.
- **SEO/Performance**: SSG marketing; lazy loads. Gaps: No sitemap/OG; bundle optimization needed.
- **Compliance/Privacy**: Consents logged; audits 7yrs. Gaps: No DSAR export; cookie scanner absent.

## 4. Overall Project Gaps and Priorities
- **Critical Incompletes (P0 - Launch Blockers)**:
  - Schemas/Routers: Core tables (wallet, consents, invites) and tRPC endpoints missing → Can't persist/use features.
  - Auth/Billing: MFA absent; wallet ledger no double-entry → Security/payment risks.
  - UI Polish: Mobile responsiveness (login); remove debug; consistent Iconify/PandaCSS.
  - DevOps: Full Docker entry (install/migrate/dev); basic CI tests.
  - Compliance: Consent logging/banner; legal pages content.

- **High Priority (P1 - Post-Launch)**:
  - Real-Time: Pub/Sub for notifs; Streams playback.
  - Admin: Charts/filters; fraud views.
  - Testing: E2E for auth/billing; coverage enforcement.
  - Analytics: Engagement tracking (newsletters, referrals).

- **Medium (P2 - Enhancements)**:
  - SEO: Full OG/sitemap.
  - Support: Email sync; SLAs.
  - Growth: Referral UTM; invite rewards tie-in.

- **Non-Essential**: Push notifs, visual regression, load testing.

## 5. Roadmap Recommendations
- **Milestone 1 (Core Launch)**: Auth + Wallet + Basic Account + Legal/Consent + Docker Dev.
- **Milestone 2 (Growth/Engage)**: Invites/Referrals + Notifications + Newsletter.
- **Milestone 3 (Admin/Ops)**: Full Admin + Support + Audits + Tests/CI.
- **Validation**: Run Lighthouse/Axe on all pages; manual audit for gaps; ensure docker compose up works end-to-end.

This overview frames a complete advanced website: Modular, compliant, scalable. All core content specs are now documented; focus implementation on P0 gaps for production readiness.
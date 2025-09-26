# Website Specification

## Overview
This is a comprehensive SaaS platform specification for an advanced, modern web application. The platform focuses on user management, billing, referrals, and content delivery, built as a fully responsive SPA with serverless architecture. All features must be complete, functional, and compliant with global standards. The site operates entirely in USD, with wallet-based billing and membership tiers offering automatic top-ups and discounts.

## Technical Stack
- **Frontend**: Next.js (App Router), React, Zustand, PandaCSS, Radix UI, react-use, @simplewebauthn/browser, urql
- **Backend**: Pothos (schema), Yoga (server), Auth.js (JWT with Redis denylist), Drizzle ORM, @simplewebauthn/server, gql.tada (types), graphql-scalars
- **Database**: PostgreSQL (Neon with pgBouncer)
- **Caching/Real-time**: Redis (Upstash: Streams for playback, Pub/Sub for notifications, Rate limiting)
- **Payments**: Stripe (Checkout, Billing Portal, Invoices, Webhooks with idempotency)
- **DevOps**: Docker + docker-compose (full stack: web + db + redis), pnpm, Biome (linting/formatting)
- **Deployment**: Serverless-ready, stateless backend (GraphQL BFF pattern)

## UI/UX Guidelines
### Overall Principles
- Minimalist functionalism: Remove excess decorations, focus on content and functionality.
- Readability focus: Clear typography with appropriate letter spacing and line height.
- Consistency: All components follow unified rounding, spacing, fonts, and colors.
- Fluidity: Natural, fast transitions and interactions, avoiding lag or exaggerated animations.

### Visual Elements
- **Color Scheme**: Dark mode primary (dark gray/black backgrounds), light mode secondary. Single accent color (e.g., blue, green, purple) for buttons/highlights. Ensure WCAG AA contrast.
- **Shapes & Cards**: 8-12px rounding. Card-based layouts for reusability. Soft, low-opacity shadows for hierarchy.
- **Typography**: Sans-serif (Inter/SF Pro). Bold, large headings; clear, readable body text.

### Dynamic Effects
- Transition time: 200-400ms.
- Hover: Slight enlargement (1.03x) or deepened shadow.
- Active: Slight reduction (0.95-0.98x) for immediate feedback.
- Page transitions: Fade/slide for natural flow.

### Interaction Modes
- Conversational flow: Message-like UI with top-bottom flow.
- Input areas: Fixed bottom placement, clean and prominent.
- Instant feedback: Visual cues on every input, submit, or switch.
- Expandable content: Collapsible sections for long content to maintain cleanliness.

### UX Guidelines
- Clear navigation: Fixed top/sidebar, clear hierarchy.
- Content focus: Avoid distractions.
- Smooth scrolling: Natural scroll with lazy loading.
- Reusable modules: Consistent buttons, cards, inputs.
- Mobile-first: Consistent UX across phone, tablet, desktop.

### Testing Requirements
- Validate readability in dark/light modes.
- Ensure instant feedback on all interactions.
- Confirm responsive adaptation across devices.

## Features
### Authentication & Security
- Registration/Login/Password Reset with SSO, Passkey-first 2FA (using SimpleWebAuthn), reCAPTCHA, Rate Limiting.
- Session management: JWT rotation, Redis denylist, login activity logs.
- Security settings: Passkey-first 2FA (using SimpleWebAuthn), recovery codes, login alerts.

### User Account
- Profile: Display name, bio, avatar.
- Username: Uniqueness check, reserved words, lowercase normalization, change cooldown, history table.
- Sessions & Devices: IP/UA/location display, one-click logout.
- Invites: Generate/manage codes with limits and expiration.
- Referral: Custom links, QR, stats, wallet credit rewards (configurable triggers: signup, first charge, subscription).
- Notifications: Email/push preferences; in-app center with bell icon, unread badges, read/unread status.
- Activity Logs: Personal recharge, consumption, login, invite, referral records.
- Consent Center: Cookie/privacy preferences, consent history.

### Billing & Wallet
- Wallet: USD-only, recharge via Stripe, consumption deductions with membership discounts.
- Membership: Small/Medium/Large tiers (monthly auto-top-up + discounts + entitlements). Yearly = 10x monthly. Admin-configurable plans.
- Invoices: Downloadable PDFs, admin search/filter/export.
- Discounts: Applied site-wide before wallet deduction.

### Admin Panel
- Dashboard: Site-wide data charts with filter/sort/group (date, plan, source, region, device).
- Users: Search, roles, ban, username change approval.
- Billing: Subscriptions, refunds, invoice links.
- Wallet: Reconciliation, anomaly flagging.
- Newsletter: Lists, broadcasts, unsubscribe rates.
- Invites: Create/revoke/limits, stats.
- Referral: Programs/links/rewards management.
- Membership Plans: Create/edit/disable (price, auto-top-up, discount%, entitlements).
- Notifications: Site-wide broadcasts.
- Support Tickets: View/reply/status updates.
- Audit Logs: Filtered actor/action/time records.

### Content & Support
- Docs/FAQ: Self-service answers.
- Blog/CMS: Announcements, articles.
- Status Page: System status, historical uptime.
- Support: Contact form/ticket system; admin ticket management.

### Public Pages
- Home/Features/Pricing.
- /u/<username>: Public profile with SEO/OG.
- /r/<code>: Referral short links.
- Legal: Terms, Privacy, Cookies (with banner & management).

### Additional Features
- Error Pages: Custom 404/500 with friendly redirects (e.g., to home/support).
- Basic Analytics: Opt-in Google Analytics (consent-gated); engagement tracking for newsletters.
- Agreement & Consent: Explicit records (consents table: user_id, policy_type, version, accepted_at, ip, ua). Versioning for Terms/Privacy; signup checkboxes; granular cookie preferences (necessary/analytics/advertising); consent history download.

## Legal & Compliance
- GDPR/CCPA/PECR compliance: Cookie banner, consent management, data export/revoke (P1).
- Explicit consent logging and versioning.
- Privacy/Terms/Cookies pages with MDX content.

## Deployment & DevOps
- Docker Compose: Encapsulates web + db + redis.
- Entry script: pnpm install --frozen-lockfile && pnpm db:migrate && pnpm dev.
- Monitoring: Error/SLO alerts, webhook retry.
- Status page integration.

## Testing & Quality
- Unit: Vitest.
- E2E: Playwright (full flows: register → login → 2FA → recharge → consume → download invoice → unsubscribe → invite → referral reward → ticket submit).
- Accessibility: axe, Lighthouse.
- Performance: Responsive, lazy loading, Iconify-only icons (no emojis).
- Code quality: Biome checks.
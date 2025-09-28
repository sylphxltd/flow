# Optimized SaaS Platform Specification Template

This template defines a scalable, secure SaaS platform for modern web apps. Adapt to project needs while ensuring completeness, functionality, and global compliance (e.g., GDPR). Core: USD wallet billing, tiered memberships with auto-top-ups/discounts, serverless SPA architecture. Prioritize security, usability, and extensibility.

## Core Requirements
- **Architecture**: Build as a responsive single-page application (SPA) using serverless backend (e.g., Vercel/Cloudflare). Ensure full functionality across devices.
- **Currency**: Operate exclusively in USD for billing/wallets.
- **Billing Model**: Wallet-based with Stripe integration; apply membership discounts before deductions.
- **Memberships**: Tiers (Small/Medium/Large) with monthly auto-top-ups, discounts, and entitlements. Yearly plans = 10x monthly rate. Make admin-configurable.
- **Compliance**: All features must meet global standards (GDPR/CCPA); implement verifiable acceptance criteria (AC) for each.

## UI/UX Design Principles
Implement a clean, performant interface prioritizing usability and accessibility. Validate with tools like Lighthouse (score >90) and axe-core (WCAG AA compliance).

### Core Principles
- Adopt minimalist functionalism: Eliminate decorative elements; center on core content and interactions.
- Ensure readability: Use sans-serif fonts (e.g., Inter/SF Pro) with 1.5+ line height, 1.2-1.5 letter spacing.
- Maintain consistency: Standardize 8-12px border radius, 16px spacing grid, single font family, and color palette across all components.
- Achieve fluidity: Use 200-400ms CSS transitions; avoid jank—test on low-end devices.

### Visual System
- **Colors**: Default to dark mode (e.g., #1a1a1a background, #ffffff text); support light mode toggle. Use one accent color (e.g., #007bff blue) for CTAs/highlights. Enforce WCAG AA (4.5:1 contrast)—test with WAVE tool.
- **Shapes & Layouts**: Apply 8-12px rounded corners. Use card components for modular content (e.g., user profiles). Add subtle shadows (0 1px 3px rgba(0,0,0,0.1)) for depth without clutter.
- **Typography**: Sans-serif stack (Inter, SF Pro fallback). Headings: Bold, 24-48px; Body: 14-16px, 1.5 line-height for scannability.

### Interactions & Animations
- **Transitions**: 200-400ms ease-in-out for all state changes (e.g., hover, focus).
- **Hover States**: Scale 1.03x or increase shadow opacity for buttons/links.
- **Active States**: Scale down to 0.95-0.98x for tactile feedback on clicks.
- **Page Navigation**: Implement fade (opacity 0→1) or slide transitions; preload routes for <100ms perceived load.

### User Flows
- **Conversational UI**: Design chat-like interfaces with vertical top-to-bottom scrolling for features like support tickets.
- **Inputs**: Position forms at screen bottom (mobile-first); use prominent, bordered fields with real-time validation.
- **Feedback**: Provide immediate visual responses (e.g., green check on valid input, loading spinner on submit).
- **Content Management**: Use accordions/collapsibles for dense sections (e.g., settings); default to expanded for critical info.

### Navigation & Accessibility
- **Navigation**: Fixed top bar or sidebar with breadcrumb hierarchy; limit to 5-7 top-level items.
- **Focus & Distractions**: Prioritize content; use modals for secondary actions, avoid auto-playing media.
- **Scrolling**: Enable smooth, native scroll; implement lazy loading for lists/images (>50 items).
- **Components**: Build reusable primitives (buttons, cards, forms) with consistent props/styling.
- **Responsiveness**: Mobile-first design; test breakpoints (320px mobile, 768px tablet, 1024px desktop) for fluid adaptation.

### UI/UX Validation
- Test readability: Verify contrast/line-height in both modes using browser dev tools.
- Confirm interactions: Simulate clicks/hovers; ensure <50ms feedback latency.
- Responsive checks: Use Chrome DevTools emulation; validate on real devices if possible.

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
- **Memberships**: CRUD plans (price, top-up rules, discounts, entitlements); enable/disable.
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
- **Local Setup**: Docker Compose for web/DB/Redis stack. Run entrypoint: `pnpm install --frozen-lockfile && pnpm db:migrate && pnpm dev`.
- **Monitoring**: Integrate Sentry for errors; set SLO alerts (e.g., 99.9% uptime); retry failed webhooks (3 attempts, exponential backoff).
- **Status Integration**: Auto-update public status page from monitoring events.

## Testing & Quality Assurance
Achieve 100% coverage; enforce via CI. Use TDD for new features.

- **Unit Tests**: Vitest for components/functions; mock externalities.
- **E2E Tests**: Playwright for end-to-end flows, e.g., register → login → enable 2FA → top-up wallet → consume service → download invoice → unsubscribe → invite friend → claim referral → submit ticket.
- **Accessibility**: Run axe-core scans; target Lighthouse A11y score >95.
- **Performance**: Ensure responsive design; implement lazy loading; use Iconify for icons (avoid emojis for consistency).
- **Code Quality**: Biome for linting/formatting; pre-commit hooks to block violations.
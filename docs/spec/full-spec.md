# Full Specification for Advanced SPA Website

## 1. Overview
This document outlines the core specifications for a modern, fully‑reactive single‑page application (SPA) built with the technology stack:
- Next.js (App Router)
- tRPC (BFF)
- Auth.js (JWT + Redis denylist)
- Drizzle ORM + PostgreSQL
- Upstash Redis (streams, pub/sub, rate‑limit)
- Zustand (state management)
- Biome (code quality)
- Stripe (checkout, billing, invoices)
- pnpm (package manager)
- Docker & docker‑compose (development & production)

The site must be production‑ready by tomorrow, fully responsive, accessible, and compliant with global privacy regulations.

## 2. Technical Stack
- **Framework**: Next.js 14 with App Router, TypeScript, React 18.
- **API Layer**: tRPC v10, Zod for validation, serverless functions.
- **Authentication**: Auth.js with JWT rotation, Redis deny‑list, optional 2FA.
- **Database**: PostgreSQL (Neon) accessed via Drizzle ORM.
- **Cache / Messaging**: Upstash Redis for session store, rate limiting, streams (playback) and pub/sub (notifications).
- **State**: Zustand for client‑side stores.
- **Styling**: Pandacss + Tailwind utilities, Iconify for all icons (no emoji).
- **UI Library**: Radix UI primitives for accessible components.
- **Payments**: Stripe Checkout + Billing Portal, webhooks for subscription events.
- **Package Manager**: pnpm with lockfile frozen on CI.
- **CI / Lint**: Biome for formatting, linting and type‑checking.
- **Containerisation**: Docker Compose with three services – `web`, `db`, `redis`. Entry script runs `pnpm install --frozen-lockfile && pnpm db:migrate && next dev`.

## 3. Navigation & Information Architecture
### 3.1 Public Pages
- `/` – Home
- `/features` – Feature overview
- `/pricing` – Plans & subscription comparison
- `/docs` – Documentation hub
- `/faq` – Frequently asked questions
- `/blog` – News & announcements
- `/status` – System status page
- `/support` – Contact / ticket form
- `/legal/terms` – Terms of Service
- `/legal/privacy` – Privacy Policy
- `/legal/cookies` – Cookie Policy
- `/r/[code]` – Referral short‑link handler

### 3.2 Authenticated User Area (`/account/*`)
- `/account/profile` – Personal details, avatar
- `/account/username` – Change username (unique, regex validated)
- `/account/security` – 2FA, recovery codes
- `/account/sessions` – Device list, revoke sessions
- `/account/billing` – Plan selection, invoice list, download PDF
- `/account/wallet` – Balance, top‑up, transaction history
- `/account/invites` – Generate & manage invitation codes
- `/account/referral` – Referral link, stats, reward credits
- `/account/notifications` – Email & push preferences, in‑app center
- `/account/activity` – Personal activity log (logins, charges, referrals)
- `/account/consent` – Cookie & marketing consent dashboard

### 3.3 Public User Profiles
- `/u/[username]` – Public profile page, SEO‑optimised

### 3.4 Admin Panel (`/admin/*`)
- `/admin/dashboard` – Overview charts, key metrics
- `/admin/users` – Search, role assignment, ban, rename audit
- `/admin/membership` – Create / edit plans, set auto‑top‑up, discounts
- `/admin/wallet` – Reconciliation, manual adjustments
- `/admin/newsletter` – Manage list, send campaigns, unsubscribe stats
- `/admin/invites` – Global invite settings, usage reports
- `/admin/referral` – Program configuration, reward amounts, limits
- `/admin/notifications` – Broadcast messages
- `/admin/support` – Ticket queue, status updates
- `/admin/audit` – Full audit log with filters, export CSV

## 4. UI/UX SPA Guidelines (Full Version)
### 4.1 Core Principles
- **Minimalist functionalism** – remove decorative fluff, focus on content & actions.
- **Readability first** – adequate line‑height, letter‑spacing, high contrast.
- **Consistency** – unified corner radius, spacing, typography, colour palette.
- **Fluidity** – interactions feel natural, no jank, transition ≤ 400 ms.

### 4.2 Visual Design
- **Colour** – Dark mode primary (gray‑900 background, gray‑100 text). Light mode optional for accessibility. Single accent colour (e.g., #3b82f6) for primary buttons & highlights. WCAG AA contrast compliance.
- **Shape** – Rounded corners 8‑12 px on cards, inputs, buttons. Soft low‑opacity shadows for elevation.
- **Typography** – Inter / SF Pro, base 16 px, headings scale 1.5‑2×, bold for H1‑H3, regular for body.
- **Iconography** – All icons from Iconify, no emoji. Use consistent stroke weight.

### 4.3 Motion & Interaction
- **Transitions** – 200‑400 ms ease‑out for hover/focus, 150 ms for active press.
- **Hover** – Slight scale (1.03) + deeper shadow.
- **Active** – Slight shrink (0.97) + subtle opacity.
- **Page change** – Fade‑in/out or slide‑in for route transitions.
- **Feedback** – Immediate visual cue on submit, loading spinners, toast notifications.

### 4.4 Interaction Patterns
- **Chat‑style flow** – For conversational features, messages stack vertically, newest at bottom.
- **Fixed input bar** – Bottom‑anchored input for chat‑like components.
- **Expandable sections** – Accordions for long content, keep UI tidy.
- **In‑app notification centre** – Bell icon with badge, dropdown list, mark read/unread.

### 4.5 UX Guidelines
- **Clear navigation** – Persistent top bar on desktop, collapsible side bar on mobile.
- **Focus on content** – Minimal sidebars, no intrusive pop‑ups.
- **Smooth scrolling & lazy loading** – Infinite scroll where appropriate.
- **Reusable component library** – Buttons, cards, inputs, modals, tables follow same token system.
- **Mobile‑first** – Touch targets ≥ 44 px, responsive breakpoints at 640, 768, 1024 px.

### 4.6 Testing Requirements
- Verify colour contrast in both themes.
- Ensure all interactive elements provide instant visual feedback.
- Run Lighthouse & axe on desktop & mobile emulations.
- Automated E2E tests for login → wallet top‑up → purchase → invoice download flow.

## 5. Membership, Billing & Wallet Model
- **Plans**: Small ($7.99), Medium ($19.99), Large ($49.99) – configurable in admin.
- **Auto‑top‑up**: Each active plan adds the same amount to the user's USD wallet at the start of every month.
- **Discounts**: Configurable percent per plan, applied before wallet deduction.
- **Yearly option**: Pay 10× monthly price, still credited monthly.
- **Wallet**: Single USD balance, used for all charges (subscriptions, extra usage, purchases).
- **Top‑up**: Stripe Checkout for ad‑hoc credits.
- **Invoices**: Stripe PDF available in `/account/billing`, admin can filter & export.

## 6. Referral System
- **Reward type**: Wallet credit only.
- **Trigger events**: Successful signup, first successful charge, subscription activation.
- **Configurable parameters**: Fixed amount or percentage of referee’s first charge, reward window (e.g., 30 days), per‑user max reward, global monthly cap.
- **Anti‑abuse**: IP/device fingerprinting, disposable‑email detection, rate limits.
- **Frontend**: `/account/referral` shows personal link, QR code, click & conversion stats.
- **Admin**: Manage programs, view reward logs, adjust parameters.

## 7. Consent & Legal Management
- **Pages**: Terms, Privacy, Cookies (all under `/legal`).
- **Consent Center**: `/account/consent` lets users view and revoke each consent version.
- **Database schema**: `consents` table (id, user_id, type, version, accepted_at, ip, user_agent).
- **Versioning**: Updating any legal doc creates a new version; users must re‑accept before proceeding.
- **Registration flow**: Mandatory checkboxes for Terms, Privacy, Cookies; registration blocked until all accepted.
- **Admin UI**: View current versions, download CSV of consent records, toggle marketing consent globally.

## 8. Content Management
- **Docs / FAQ** – Markdown files rendered via MDX, searchable.
- **Blog / Announcements** – Simple CMS with author, tags, publish date.
- **Status Page** – Static JSON feed showing uptime, incidents, linked from `/status`.

## 9. Notifications
- **Email** – Transactional (charge, refund, referral) and marketing (newsletter) via SendGrid or similar.
- **Push** – Optional Web Push, opt‑in via consent centre.
- **In‑app** – Bell icon, real‑time updates via Redis pub/sub.
- **Admin broadcast** – Create global messages, schedule, target by plan.

## 10. Support & Ticketing
- **Public form** – `/support` collects name, email, subject, description.
- **Ticket DB** – `support_tickets` table, status workflow (open, pending, resolved, closed).
- **Admin view** – List, filter, assign, reply via email integration.

## 11. Deployment / DevOps
- **Docker Compose** defines services `web`, `db`, `redis`.
- **Entry script** runs `pnpm install --frozen-lockfile && pnpm db:migrate && pnpm dev`.
- **Environment variables** for DB URL, Redis URL, Stripe secret, JWT secret.
- **CI** – Run Biome lint, TypeScript build, Docker build, integration tests.

## 12. Analytics & Monitoring
- **Basic analytics** – Opt‑in Google Analytics, gated by consent.
- **Error tracking** – Sentry integration (only after user consent for performance data).
- **Health checks** – `/api/health` returns 200 when all services reachable.

## 13. Error Pages
- Custom 404 with friendly message and link to Home.
- Custom 500 with retry button and contact link.

## 14. Low‑Effort Additions (Optional but Recommended)
- Site‑wide search powered by Meilisearch (P1).
- Breadcrumb navigation on all inner pages.
- Dark/Light toggle persisted in localStorage.
- Favicon and manifest for PWA install prompt.
- SEO meta tags auto‑generated from page data (title, description, OG).
- Rate‑limit login endpoint (per IP) to mitigate brute force.

---
End of Specification
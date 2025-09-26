# Technical Stack Specifications

## Purpose
This spec outlines the core technology stack for building a modern, scalable SPA SaaS website. It emphasizes serverless/stateless architecture, real-time capabilities, and seamless development/testing workflows. Focus on high-level components without deep implementation details. Current project gaps: Incomplete integration of real-time features (Redis Streams for playback), full serverless setup (e.g., Neon for Postgres), and Docker automation for one-click dev/prod parity.

## 1. Frontend Framework
- **Next.js (App Router)**: Core for SPA routing, SSR/SSG for marketing pages (home, pricing, docs), and client-side hydration. Use parallel routes for modals/overlays. Missing: Full adoption of server components for data fetching to reduce bundle size.
- **React Ecosystem**:
  - **Zustand**: Lightweight state management for UI (e.g., theme toggle, wallet balance). Avoid heavy alternatives like Redux.
  - **Radix UI**: Primitives for accessible components (dialogs, dropdowns, tabs, tooltips). Ensures consistent, themeable UI without custom CSS hacks.
  - **React-Use**: Utility hooks for common patterns (e.g., useLocalStorage for consent prefs, useDebounce for search inputs).
- **Styling**: **PandaCSS** for CSS-in-JS with type-safe tokens (colors, spacing, radii). Define design tokens for dark/light modes, accent colors. Missing: Current site lacks consistent theming; refactor all components to use PandaCSS recipes.

## 2. Backend & API Layer
- **tRPC**: End-to-end typesafe APIs as BFF (Backend for Frontend). Routers for auth, user, account, billing, wallet, admin, realtime, etc. Procedures: public (SEO-friendly), protected (session-based), admin (role-gated). Use Zod for validation. Serverless-friendly: Deploy as API routes. Missing: Full router coverage for new features (e.g., referral, notifications); implement rate limiting via Upstash.
- **Auth.js (NextAuth)**: JWT-based stateless sessions with Redis denylist for logout/rotation. Providers: Credentials (email/password), optional OAuth (Google/GitHub). Auto-admin for first user. Missing: MFA (TOTP) integration and login activity logging.

## 3. Data Layer
- **Drizzle ORM**: Type-safe queries/migrations for PostgreSQL. Schemas for users, sessions, wallets, subscriptions, audits, etc. Use relations for referential integrity. Missing: Incomplete schemas for consents, referrals, notifications; add indexes for performance (e.g., on user_id, timestamps).
- **PostgreSQL**: Hosted on Neon with pgBouncer for connection pooling (serverless scale). Tables: Core (users, accounts), Billing (invoices, subscriptions), Logs (audit, activity), Content (newsletter, support). Missing: Sharding strategy for growth; initial setup lacks full migration scripts.
- **Redis (Upstash)**: Serverless for caching, sessions denylist, rate limiting. Use Streams for event playback (e.g., session replays), Pub/Sub for real-time notifications. Missing: Full Streams integration for live/replay features; Pub/Sub for in-app updates.

## 4. Payments & Billing
- **Stripe**: Handle subscriptions, one-time charges (wallet top-ups), invoices (PDF downloads). Webhooks for idempotent events (e.g., subscription renewal → auto-topup wallet). Billing Portal for user self-management. Missing: Custom pricing logic (discounts per plan); webhook retry/monitoring.

## 5. Real-Time & Streaming
- **Redis Streams + Pub/Sub**: For live updates (e.g., balance changes, notifications) and playback (e.g., session history). SSE (Server-Sent Events) via tRPC subscriptions. Missing: Core implementation for reactive playback; ensure stateless handling in serverless.

## 6. Development Tools
- **Biome**: All-in-one linter/formatter (replaces ESLint/Prettier). Enforce consistent code style, TypeScript strict mode. Missing: Integration into pre-commit hooks.
- **pnpm**: Package manager with frozen lockfile for reproducible builds. Scripts: dev, build, db:migrate, lint. Missing: Full script coverage for e2e testing.

## 7. UI/UX Libraries
- **Iconify**: Exclusive icon source (e.g., lucide icons via @iconify/react). Consistent sizing/styling. Missing: Audit and replace all current icons/emojis.
- **Sonner**: Toast notifications for feedback (e.g., recharge success).
- **React-Use + Radix**: As above, for hooks and primitives.

## 8. Deployment & DevOps
- **Docker + Docker Compose**: Containerize web (Next.js), db (Postgres), redis. Entry script: pnpm install --frozen-lockfile && pnpm db:migrate && pnpm dev. One-command startup: docker compose up. Missing: Prod config (e.g., multi-stage builds, env secrets); CI/CD pipeline outline.
- **Serverless Direction**: Vercel/Netlify for frontend; Neon/Upstash for DB/Redis. Stateless: No server-side sessions beyond JWT. Missing: Full migration to serverless (e.g., tRPC on edge functions).

## 9. Monitoring & Security
- **Observability**: Basic error logging (Sentry/Console); Stripe webhook alerts. Status page integration. Missing: Comprehensive logging for audits; rate limiting everywhere.
- **Security**: Auth.js for auth; Zod/tRPC for input validation; Helmet for headers. Missing: CSRF/XSS protections; consent logging for GDPR.

## Missing/Incomplete Areas (Current Project Focus)
- **Integration Gaps**: tRPC routers incomplete (e.g., no referral/membership endpoints); Drizzle schemas lack tables for new features (consents, notifications).
- **Serverless Readiness**: Partial; ensure all APIs are stateless, with Redis for ephemeral state.
- **Dev Workflow**: Docker setup exists but needs automation for migrations/installs; add Biome to all checks.
- **Performance**: Bundle optimization missing; implement code-splitting for large pages (admin dashboard).
- **Testing**: Vitest for units; Playwright for e2e (auth flows, wallet transactions). Missing: Coverage for real-time and payments.

This stack forms a robust, scalable foundation for a SaaS SPA: typesafe, real-time, serverless. Prioritize filling schema/router gaps and Docker automation for completeness.
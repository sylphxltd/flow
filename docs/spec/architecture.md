# Architecture & Platform

Objectives: Serverless/stateless BFF using Next.js App Router + tRPC; Auth.js JWT sessions with rotation; Drizzle + PostgreSQL; Redis (Upstash) for streams/pubsub/rate limit; Stripe for billing/invoices; Zustand for client state; Biome for lint/format; pnpm work.

Key Tenets
- Stateless backend: JWT-based sessions; serverless functions with no sticky state.
- BFF (tRPC): Single contract boundary; strictly typed end-to-end DTOs.
- Idempotency & robustness: webhook idempotency, replay protection, rate limiting.
- Observability: error tracking, webhook success/failure alerts, admin status.

Stack
- Next.js (App Router)
- tRPC (server-side callers), Zod DTO
- Auth.js (JWT strategy + rotation; Redis denylist for logout/compromise)
- Drizzle ORM + PostgreSQL (Neon/pgBouncer friendly)
- Redis (Upstash): Rate limiting, Pub/Sub notifications, Streams for playback
- Stripe: Checkout, Billing Portal, Invoices (download links)
- Zustand: lightweight client store
- Biome: code style and lint
- pnpm: package manager (frozen lockfile in CI/dev entry)

Runtime Services
- HTTP: Next.js app routes/route handlers for web + tRPC
- Realtime: SSE or WS gateway backed by Redis pub/sub
- Streams: Redis Streams for session playback/time travel of key event buses
- Cron: periodic reconciliation (wallet, invoices), cleanup jobs
- Webhooks: Stripe → idempotent processors → ledger records

Security
- Auth.js JWT (rotating), Redis denylist
- Rate limit per-route + user/IP
- CSRF where applicable for non-API page forms
- Signed webhooks; idempotency keys; replay window
- Audit logging for admin actions; login activity logs
- Content Security Policy; secure cookies; SameSite

BFF Modules (tRPC Routers)
- auth, user, account, billing, wallet, newsletter, admin, audit, realtime, invite, referral, membership, notification, support

Data
- Postgres as SoT; Drizzle schema (see ./data-schema.md)
- Redis for ephemeral, queues, pubsub, streams
- No mocks in production; seed only in local dev if needed


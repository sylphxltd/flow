# Deployment and DevOps Specifications

## Purpose
Outlines the development, testing, and deployment workflows for a serverless-first SaaS SPA. Emphasizes Docker for local parity, automated setups, and scalable hosting. Focus on reproducibility and minimal ops overhead. Current gaps: Incomplete Docker Compose (no full entry script for install/migrate/dev); no CI/CD pipeline; partial serverless config (e.g., Vercel env vars).

## 1. Local Development Environment
- **Docker Compose**: Single command startup: docker compose up. Services: web (Next.js), db (Postgres/Neon local equiv), redis (Upstash local). Volumes for persistence; networks for isolation.
- **Entry Script**: In Dockerfile or compose: pnpm install --frozen-lockfile && pnpm db:migrate && pnpm dev. Ensures clean, reproducible env every time.
- **Tools**: Biome for lint/format on save; hot reload for frontend; auto-migrate on start.
- **Env Management**: .env.local for dev (DB_URL, STRIPE_KEYS); secrets via Docker secrets or env files.

## 2. Serverless Deployment
- **Hosting**: Vercel/Netlify for Next.js (auto-deploys on git push); edge functions for tRPC.
- **Database**: Neon Postgres (serverless scale, branching for previews); pgBouncer for pooling.
- **Redis**: Upstash (serverless, global replication); for sessions, streams, pub/sub.
- **Payments**: Stripe (webhooks to Vercel endpoints); idempotency keys.
- **Stateless Design**: All APIs serverless; JWT for auth; no sticky sessions.

## 3. CI/CD Pipeline
- **Git Workflow**: Main for prod; feature branches for dev; PRs trigger previews (Vercel branches).
- **Pipeline Tools**: GitHub Actions (or Vercel builds): Lint (Biome), type-check (tRPC/Drizzle), test (Vitest/Playwright), build, deploy.
- **Stages**: 
  - Lint/Test: On PR/push.
  - Build: Next.js static/SSR.
  - Deploy: Preview on PR; prod on main merge.
  - Migrations: Auto-run on deploy (Drizzle push); zero-downtime.
- **Secrets**: GitHub/Vercel secrets for keys (STRIPE, DB, REDIS).

## 4. Monitoring and Observability
- **Logging**: Console + Sentry for errors; structured logs (user_id, action).
- **Metrics**: Vercel analytics; Stripe dashboard; custom (e.g., wallet tx volume via Upstash insights).
- **Alerts**: Webhook failures (Stripe/Sentry) → Slack/email; uptime via Statuspage.
- **Backups**: Neon auto-backups; DB snapshots on cron.

## 5. Security and Compliance in DevOps
- **Secrets Scanning**: GitHub secrets scan; no commit of keys.
- **Vulnerability Scans**: Dependabot for deps; Snyk for Docker images.
- **Access**: Role-based in Vercel/GitHub; audit deploys.

## 6. Flows and Gaps
- **Key Flow**: Code change → PR → Lint/test → Preview deploy → Merge → Prod deploy + migrate.
- **Missing**: Full docker-compose.yml (with entry script); GitHub Actions workflow file; serverless webhook routing.
- **Testing**: Local Docker e2e; smoke tests on deploy.

This spec enables efficient, scalable DevOps: Docker local, serverless prod, automated CI/CD. Prioritize Compose setup for dev speed.
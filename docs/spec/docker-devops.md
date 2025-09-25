# Docker & DevOps

Local Dev (docker-compose)
- Services:
  - web: Next.js + tRPC (dev)
  - db: Postgres (persistent volume)
  - redis: Redis (local dev; prod uses Upstash)
- Entry for web:
  - pnpm install --frozen-lockfile
  - pnpm db:migrate
  - pnpm dev
- Env:
  - DATABASE_URL (Postgres)
  - REDIS_URL (local/Upstash)
  - STRIPE_KEYS, AUTH_SECRET, NEXTAUTH_URL, etc.

Commands
- docker compose up (hot reload via bind mount)
- docker compose down -v (reset)

CI/CD
- Build Next.js with env-injected
- Run migrations before deploy
- Health checks; webhook endpoints whitelisted
- SLO/error alerts to Slack/Email

Security & Compliance
- Rotate secrets; restrict outbound where possible
- Minimal container permissions; non-root user
- Logs shipped to centralized store


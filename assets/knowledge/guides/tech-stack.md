---
name: Tech Stack (Recommended)
description: Opinionated stack (Next.js, PandaCSS, GraphQL, Pothos, Drizzle) - optimized for LLM accuracy
---

# Technical Stack

Scalable, secure SaaS stack. Type safety, performance, serverless. Validate with E2E (Playwright), monitor with Sentry.

## Domain-Driven Architecture

Feature-based layout: `src/features/<domain>/` (frontend), `src/graphql/<domain>/` (backend). Colocate related code. Cross-domain via explicit exports.

**Frontend domains**: `src/features/<domain>/` → `components/`, `hooks/`, `store/`, `services/`, `utils/`, `types.ts`
**Backend domains**: `src/graphql/<domain>/` → `types/`, `queries.ts`, `mutations.ts`, `subscriptions.ts`, `loaders.ts` (DataLoader for N+1)
**Shared infra**: `src/lib/` (clients), `src/app/` (routes, providers)

## Frontend Stack

**Framework**: Next.js App Router (routing, SSR/SSG, Turbopack). `src/app/(app)/dashboard/page.tsx`

**UI**: React + Radix UI primitives (a11y). Prefer Radix for structural/interactive, custom only when Radix lacks. `src/features/<domain>/components/`

**State**: Zustand (global sessions). Avoid Redux. `src/features/<domain>/store/`

**Styling**: PandaCSS (type-safe atomic CSS-in-JS, zero-runtime, <10KB)
- **Tokens/Themes**: `panda.config.ts` semantics (`colors.primary.500`), `_dark`/CSS vars
- **Atomic**: Inline JSX (`bg-primary-500 p-4`), `css({ color: 'red' })` merges
- **Recipes**: `cva` (Button variants), `sva` slots (Card), `jsx: ['Button']` track
- **Merging**: `cx(recipe(), css({ bg: 'red' }))` overrides
- **Optimize**: `staticCss: { recipes: '*' }`, purge globs, `panda analyze`, Next.js plugins

**Hooks**: react-use (localStorage, useMeasure, useDebounce, sensors), urql (GraphQL cache, SSR, subscriptions, offline, batching)

**Auth**: Better Auth (passkey-first, 2FA), reCAPTCHA (bot mitigation)

## Backend Stack

GraphQL-first, serverless. `src/graphql/<domain>/`

**Schema/Server**: Pothos (code-first), Yoga. `gql.tada` for all GraphQL docs (never raw templates), `graphql-scalars` for custom scalars
- Modular `queryField`, typed client hooks via `gql.tada`, colocate operations with components/pages, DataLoader in `loaders.ts` (batch, cache, prevent N+1)

**Auth**: Better Auth (JWT/Redis denylist), rotate tokens

**Request Context**: AsyncLocalStorage with `headers()`/`cookies()` → tiny accessors (`getAuthSession()`, `getLocale()`) instead of passing context objects

**ORM**: Drizzle (queries/migrations). **Never** raw SQL except unavoidable complex cases (use parameterized placeholders). Query builder methods (`eq`, `and`, `or`). Schemas/queries per domain: `src/domains/<domain>/data/`
- `db.select().from(users).where(eq(users.id, userId))`

**Security**: @simplewebauthn/server, Redis limits

## Data Layer

**DB**: PostgreSQL (Neon/pgBouncer), RLS. Scale: Partition (logs/date)

**Cache/RT**: Upstash Redis (cache/pubsub/streams). TTL (24h), event streams

## Payments

**Billing**: Stripe (Checkout/Portal/Invoices/webhooks idempotent). Wallet credit on session complete, 3x retry

## DevOps

**Local**: Docker Compose (stack), bun, Biome (linting/formatting), Lefthook (Git hooks)
- **Biome Ignore**: Tests (`__tests__/**`, `*.test.*`), generated (`*.generated.*`, `dist/**`), project-specific (`styled-system`, `*.gql.tada.ts`, `drizzle`, `.next`)
- **Biome Config**: Recommended + custom flow, ignoreUnknown false
- **Lefthook**: Pre-commit (Biome, type-check), pre-push (tests). `bun add -D lefthook`, `lefthook install`
- **Entry**: `bun install && migrate && dev`, Lefthook auto-runs, `biome check .` in CI

**Deploy**: Serverless (Vercel), GraphQL BFF. CI: Actions, 99.9% SLO alerts

## Framework Rules

### GraphQL Standards
- **IDs**: Use `ID` scalar (not `String`). Base64 for keys.
- **Enums/Unions**: Enums for fixed (Role), unions for polymorphic (Result = Post | User). Limit depth 3-5.

### GraphQL Document Placement
Colocate operations in domain services (`src/features/<domain>/services/`), `src/graphql/<domain>/`
- **Routes/pages**: Import from domain services for tree-shaking
- **Components**: Queries/mutations in domain services, export typed helpers
- **Stores**: GraphQL docs in domain services
- **Fragments**: `src/features/<domain>/services/fragments/` with barrel exports
- **Tests**: Colocate under `src/features/<domain>/`
- **Typed modules**: `.gql.ts` stay domain-local, enriched by `graphql-env.d.ts`

### Pothos Best Practices
- **ID Handling**: `exposeId: false` by default (security), `exposeId: true` only when needed
- **Subscription Ordering**: `subscribe` before `resolve` for TS inference
- **Extensions**: `extendType` for modularity, integrate gql.tada for E2E types
- **Errors**: Custom scalars (graphql-scalars), try-catch with GraphQLError

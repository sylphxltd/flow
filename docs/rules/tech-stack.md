# Optimized Technical Stack and Framework Guidelines

Adopt this stack for scalable, secure SaaS applications. Select modularly; prioritize type safety, performance, serverless. Validate with E2E (Playwright); monitor with Sentry.

## Domain-Driven Architecture
Structure the entire codebase around business domains using a feature-based layout under `src/features/<domain>/` for frontend logic and `src/graphql/<domain>/` for backend schemas. Keep related features, data, and logic colocated within each domain. Cross-domain sharing happens via explicit exports—avoid global shared folders. This keeps LLMs focused on one domain at a time and prevents tight coupling.

- **Frontend domains**: Under `src/features/<domain>/` (e.g., `src/features/user/`), include `components/`, `hooks/`, `store/`, `services/`, `utils/`, `types.ts`.
- **Backend domains**: Under `src/graphql/<domain>/` (e.g., `src/graphql/user/`), include `types/`, `queries.ts`, `mutations.ts`, `subscriptions.ts`, `loaders.ts` (using DataLoader for N+1 prevention).
- **Shared infra**: `src/lib/` for clients (e.g., `graphql-client.ts`), `src/app/` for routes and providers.

## Frontend Stack
Responsive SPAs via React ecosystem. Organize all frontend code under `src/features/<domain>/` (e.g., `src/features/dashboard/`).
- **Framework**: Next.js App Router (routing, SSR/SSG). Rationale: SEO/fast loads; Turbopack dev.
  - Ex: `src/app/(app)/dashboard/page.tsx`.
- **UI**: React + Radix UI primitives (a11y, e.g., Dialog). Prefer Radix components for all structural/interactive elements; only craft custom components when Radix lacks coverage or feature parity. Place components under `src/features/<domain>/components/`.
- **State**: Zustand (global, e.g., sessions). Avoid Redux.
  - Int: `create` with `persist`. Store domain-specific stores under `src/features/<domain>/store/`.
- **Styling**: PandaCSS (type-safe atomic CSS-in-JS). Optimal: Zero-runtime, TS-safe, build-time (<10KB purged).
  - Practices:
    - **Tokens/Themes**: `panda.config.ts` semantics (e.g., `colors.primary.500: '#0ea5e9'`); `_dark`/CSS vars for modes.
    - **Atomic**: Inline JSX autocomplete (e.g., `bg-primary-500 p-4`); `css({ color: 'red' })` merges.
    - **Recipes**: `cva` simple (Button variants); `sva` slots (Card root/body); `jsx: ['Button']` track.
    - **Merging**: `cx(recipe(), css({ bg: 'red' }))` overrides.
    - **Opt**: `staticCss: { recipes: '*' }`; purge globs (`src/**/*.tsx`); `panda analyze --scope=recipe`. Next.js plugins; <5% bloat.
    - Rationale: Atomic + TS for perf/DX; custom extensible.
- **Hooks**: Leverage react-use’s hook suite to cover common side effects and browser integrations—persistent storage (`useLocalStorage`), element measurement (`useMeasure`), debounced handlers (`useDebounce`), sensors (`useIdle`, `useMedia`, etc.)—instead of reinventing utilities. Pair with urql for GraphQL client features (normalized cache, SSR, subscriptions, offline replays, batching).
- **Auth**: Better Auth for passkey-first authentication/2FA flows (registration + assertion UX); reCAPTCHA for bot mitigation.

## Backend Stack
GraphQL-first, serverless API. Organize backend logic per domain under `src/graphql/<domain>/` (e.g., `src/graphql/billing/` for types, queries, mutations, loaders).
- **Schema/Server**: Pothos (code-first); Yoga. Use `gql.tada` for all GraphQL documents/operations (never raw template literals) and `graphql-scalars` for custom scalars.
  - Pr: Modular `queryField`; generate typed client hooks via `gql.tada` outputs; define GraphQL operations co-located with consuming components/pages to embrace frontend-driven data requirements. Use DataLoader in `loaders.ts` to batch and cache database queries, preventing N+1 issues.
- **Auth**: Better Auth (JWT/Redis denylist); rotate.
- **Request Context**: In Next.js backend/app routes, use AsyncLocalStorage powered by `headers()` / `cookies()` (and derived stores) to access request data wherever needed—prefer tiny accessors (e.g., `getAuthSession()`, `getLocale()`) instead of passing contextual objects through function parameters.
- **ORM**: Drizzle (queries/migrations). Avoid raw SQL entirely for security/type safety; use query builder methods with parameterization (e.g., `eq`, `and`, `or`). Reserve `sql` template only for unavoidable complex cases, always with user inputs bound via placeholders. Define schemas and queries per domain under `src/domains/<domain>/data/`.
  - Ex: `db.select().from(users).where(eq(users.id, userId))`.
- **Security**: @simplewebauthn/server; Redis limits.

## Data Layer
- **DB**: PostgreSQL (Neon/pgBouncer); RLS.
  - Scale: Partition (logs/date).
- **Cache/RT**: Upstash Redis (cache/pubsub/streams).
  - Pat: TTL (24h); event streams.

## Payments
- **Billing**: Stripe (Checkout/Portal/Invoices/webhooks idempotent).
  - Imp: Wallet credit on session complete; 3x retry.

## DevOps/Deploy
- **Local**: Docker Compose (stack); bun/Biome (linting/formatting) + Lefthook (Git hooks manager).
  - Biome Ignore: Tests (`__tests__/**`, `*.test.*`), generated (`*.generated.*`, `dist/**`, `build/**`), project-specific (e.g., `styled-system`, `*.gql.tada.ts`, `drizzle`, `test-results`, `.next`, `node_modules`) via `biome.json` files section.
  - Biome Config (biome.json): Enable recommended + custom flow; ignoreUnknown false.
    ```
    {
      "files": {
        "ignoreUnknown": false,
        "includes": [
          "**",
          "!styled-system",
          "!**/*.gql.tada.ts",
          "!**/__tests__",
          "!**/*.test.ts",
          "!**/*.test.tsx",
          "!drizzle",
          "!test-results",
          "!.next",
          "!node_modules"
        ]
      },
      "linter": {
        "enabled": true,
        "flow": {
          "recommended": true,
          "suspicious": {
            "noExplicitAny": "error"
          },
          "style": {
            "noMagicNumbers": "warn",
            "noNonNullAssertion": "error",
            "noInferrableTypes": "error"
          },
          "complexity": {
            "noUselessTypeConstraint": "error"
          }
        }
      },
      "formatter": {
        "enabled": true,
        "formatWithErrors": false,
        "indentStyle": "space",
        "indentWidth": 2,
        "lineWidth": 100
      }
    }
    ```
  - Lefthook: Fast Git hooks for pre-commit (Biome lint/format, type-check), pre-push (tests). Install: `bun add -D lefthook`; init: `lefthook install`.
    - Config (lefthook.yml):
      ```
      pre-commit:
        commands:
          biome:
            run: bun biome check --apply {staged_files}
          types:
            run: bun tsc --noEmit
      pre-push:
        commands:
          test:
            run: bun test
      ```
    - Rationale: Enforces quality locally (faster than Husky); integrates Biome/TS checks without blocking CI.
  - Entry: `bun install && migrate && dev`; Lefthook auto-runs on git actions; `biome check .` in CI.
- **Deploy**: Serverless (Vercel); GraphQL BFF.
  - CI: Actions; 99.9% SLO alerts.

## Framework Rules
Apply these for GraphQL/Pothos to ensure type safety and maintainability. Validate schemas with graphql-codegen.

### GraphQL Schema Standards
- **Identifiers**: Use `ID` scalar for entities (e.g., userId) over `String`. Rationale: Uniqueness, caching; base64 for keys.
  - Ex: `type User { id: ID! name: String! }`.
- **Enums/Unions**: Enums for fixed (e.g., Role); unions for polymorphic (e.g., Result = Post | User). Limit depth 3-5.

### GraphQL Document Placement
Keep GraphQL files within their domain boundaries under `src/features/<domain>/services/` and `src/graphql/<domain>/`.

- **Routes/pages**: Colocate operations in domain services (e.g., `src/app/(app)/billing/invoices/page.tsx` imports from `src/features/billing/services/invoices.gql.ts`) for tree-shaking.
- **Components**: Place queries/mutations in domain services (`src/features/billing/services/InvoiceList.gql.ts`), exporting typed helpers.
- **Stores/services**: Store GraphQL docs in domain services (`src/features/billing/services/invoiceStore.gql.ts`).
- **Fragments**: Use `src/features/<domain>/services/fragments/` for domain-specific fragments, with barrel exports.
- **Tests & fixtures**: Colocate tests/fixtures under `src/features/<domain>/` (e.g., `InvoiceList.test.tsx`, `InvoiceList.fixture.gql.ts`).
- **Typed modules**: All `.gql.ts` files stay domain-local under `src/features/<domain>/services/`, enriched by the workspace `graphql-env.d.ts`.

### Pothos Best Practices
- **ID Handling**: Set `exposeId: false` in prismaField for security (hide IDs by default); use `exposeID: true` only when needed (e.g., for lists). Rationale: Reduces payload, prevents ID enumeration; Prisma auto-generates IDs.
  - Ex: `t.prismaField({ type: 'User', exposeId: false })`.
- **Subscription Ordering**: Define `subscribe` before `resolve` for TS arg inference.
  - Ex:
    ```
    builder.queryField('posts', (t) =>
      t.prismaField({
        type: 'Post',
        subscribe: (parent, args, context, info) => ({ /* logic */ }),
        resolve: (query, _root, args, context, info) => { /* typed args */ },
      })
    );
    ```
- **Extensions**: `extendType` for modularity; integrate gql.tada for E2E types.
- **Errors**: Custom scalars (graphql-scalars); try-catch with GraphQLError.

## Backend Stack
Implement a GraphQL-first API with serverless functions for stateless operations.
- **Schema & Server**: Pothos for schema building (code-first); Yoga for GraphQL server execution. Use gql.tada for TS types and graphql-scalars for custom types (e.g., DateTime).
  - Best Practice: Define resolvers with `builder.queryField` for type inference; extend types modularly.
- **Auth**: Better Auth with JWT strategy and Redis denylist for session revocation. Rotate tokens on critical actions.
- **ORM**: Drizzle ORM for type-safe queries/migrations; schema-first with relations.
  - Example: `db.select().from(users).where(eq(users.id, userId))` for secure fetches.
- **Security**: Better Auth passkey plugin for passkey verification; rate-limit endpoints with Redis.

## Data Layer
- **Database**: PostgreSQL hosted on Neon (serverless Postgres) with pgBouncer for connection pooling. Use for relational data (users, transactions); enable row-level security.
  - Scaling: Partition large tables (e.g., logs) by date; backup via Neon snapshots.
- **Caching & Real-time**: Redis on Upstash for distributed caching, rate limiting, and pub/sub.
  - Patterns: Streams for event playback (e.g., audit logs); Pub/Sub for notifications; TTL for sessions (e.g., 24h).

## Payments & Integrations
- **Billing**: Stripe for all payments—Checkout for one-offs, Billing Portal for subscriptions, Invoices API for PDFs, webhooks with idempotency keys.
  - Implementation: Handle `checkout.session.completed` webhook to credit wallets; retry failed payments (3x, exponential backoff).

## DevOps & Deployment
- **Local Development**: Docker + docker-compose for full stack (web, DB, Redis). Use bun for package management; Biome for linting/formatting (run `biome check .` in CI).
  - Entrypoint: `bun install && bun db:migrate && bun dev`.
- **Deployment**: Design for serverless (e.g., Vercel/Cloudflare); stateless backend via GraphQL Backend-for-Frontend (BFF) pattern. Ensure cold-start optimization (<200ms).
  - CI/CD: GitHub Actions for tests/deploy; monitor SLOs (99.9% uptime) with alerts.
# Optimized Technical Stack and Framework Guidelines

Adopt this stack for scalable, secure SaaS applications. Select modularly; prioritize type safety, performance, serverless. Validate with E2E (Playwright); monitor with Sentry.

## Frontend Stack
Responsive SPAs via React ecosystem.
- **Framework**: Next.js App Router (routing, SSR/SSG). Rationale: SEO/fast loads; Turbopack dev.
  - Ex: `app/dashboard/page.tsx`.
- **UI**: React + Radix UI primitives (a11y, e.g., Dialog). Prefer Radix components for all structural/interactive elements; only craft custom components when Radix lacks coverage or feature parity.
- **State**: Zustand (global, e.g., sessions). Avoid Redux.
  - Int: `create` with `persist`.
- **Styling**: PandaCSS (type-safe atomic CSS-in-JS). Optimal: Zero-runtime, TS-safe, build-time (<10KB purged).
  - Practices:
    - **Tokens/Themes**: `panda.config.ts` semantics (e.g., `colors.primary.500: '#0ea5e9'`); `_dark`/CSS vars for modes.
    - **Atomic**: Inline JSX autocomplete (e.g., `bg-primary-500 p-4`); `css({ color: 'red' })` merges.
    - **Recipes**: `cva` simple (Button variants); `sva` slots (Card root/body); `jsx: ['Button']` track.
    - **Merging**: `cx(recipe(), css({ bg: 'red' }))` overrides.
    - **Opt**: `staticCss: { recipes: '*' }`; purge globs (`src/**/*.tsx`); `panda analyze --scope=recipe`. Next.js plugins; <5% bloat.
    - Rationale: Atomic + TS for perf/DX; custom extensible.
- **Hooks**: Leverage react-use’s hook suite to cover common side effects and browser integrations—persistent storage (`useLocalStorage`), element measurement (`useMeasure`), debounced handlers (`useDebounce`), sensors (`useIdle`, `useMedia`, etc.)—instead of reinventing utilities. Pair with urql for GraphQL client features (normalized cache, SSR, subscriptions, offline replays, batching).
- **Auth**: @simplewebauthn/browser for passkey-first authentication/2FA flows (registration + assertion UX); reCAPTCHA for bot mitigation.

## Backend Stack
GraphQL-first, serverless API.
- **Schema/Server**: Pothos (code-first); Yoga. Use `gql.tada` for all GraphQL documents/operations (never raw template literals) and `graphql-scalars` for custom scalars.
  - Pr: Modular `queryField`; generate typed client hooks via `gql.tada` outputs.
- **Auth**: Auth.js (JWT/Redis denylist); rotate.
- **Request Context**: In Next.js backend/app routes, build request-scoped context with AsyncLocalStorage leveraging `headers()` / `cookies()` and custom stores instead of threading context through parameters. Expose helpers (e.g., `getRequestContext()`) that read from ALS to keep handlers clean.
- **ORM**: Drizzle (queries/migrations). Avoid raw SQL entirely for security/type safety; use query builder methods with parameterization (e.g., `eq`, `and`, `or`). Reserve `sql` template only for unavoidable complex cases, always with user inputs bound via placeholders.
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
- **Local**: Docker Compose (stack); pnpm/Biome (linting/formatting) + Lefthook (Git hooks manager).
  - Biome Ignore: Tests (`__tests__/**`, `*.test.*`), generated (`*.generated.*`, `dist/**`, `build/**`), project-specific (e.g., `styled-system`, `*.gql.tada.ts`, `drizzle`, `test-results`, `.next`, `node_modules`) via `biome.json` files section.
  - Biome Config (biome.json): Enable recommended + custom rules; ignoreUnknown false.
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
        "rules": {
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
  - Lefthook: Fast Git hooks for pre-commit (Biome lint/format, type-check), pre-push (tests). Install: `pnpm add -D lefthook`; init: `lefthook install`.
    - Config (lefthook.yml):
      ```
      pre-commit:
        commands:
          biome:
            run: pnpm biome check --apply {staged_files}
          types:
            run: pnpm tsc --noEmit
      pre-push:
        commands:
          test:
            run: pnpm test
      ```
    - Rationale: Enforces quality locally (faster than Husky); integrates Biome/TS checks without blocking CI.
  - Entry: `pnpm install --frozen && migrate && dev`; Lefthook auto-runs on git actions; `biome check .` in CI.
- **Deploy**: Serverless (Vercel); GraphQL BFF.
  - CI: Actions; 99.9% SLO alerts.

## Framework Rules
Apply these for GraphQL/Pothos to ensure type safety and maintainability. Validate schemas with graphql-codegen.

### GraphQL Schema Standards
- **Identifiers**: Use `ID` scalar for entities (e.g., userId) over `String`. Rationale: Uniqueness, caching; base64 for keys.
  - Ex: `type User { id: ID! name: String! }`.
- **Enums/Unions**: Enums for fixed (e.g., Role); unions for polymorphic (e.g., Result = Post | User). Limit depth 3-5.

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
- **Auth**: Auth.js with JWT strategy and Redis denylist for session revocation. Rotate tokens on critical actions.
- **ORM**: Drizzle ORM for type-safe queries/migrations; schema-first with relations.
  - Example: `db.select().from(users).where(eq(users.id, userId))` for secure fetches.
- **Security**: @simplewebauthn/server for passkey verification; rate-limit endpoints with Redis.

## Data Layer
- **Database**: PostgreSQL hosted on Neon (serverless Postgres) with pgBouncer for connection pooling. Use for relational data (users, transactions); enable row-level security.
  - Scaling: Partition large tables (e.g., logs) by date; backup via Neon snapshots.
- **Caching & Real-time**: Redis on Upstash for distributed caching, rate limiting, and pub/sub.
  - Patterns: Streams for event playback (e.g., audit logs); Pub/Sub for notifications; TTL for sessions (e.g., 24h).

## Payments & Integrations
- **Billing**: Stripe for all payments—Checkout for one-offs, Billing Portal for subscriptions, Invoices API for PDFs, webhooks with idempotency keys.
  - Implementation: Handle `checkout.session.completed` webhook to credit wallets; retry failed payments (3x, exponential backoff).

## DevOps & Deployment
- **Local Development**: Docker + docker-compose for full stack (web, DB, Redis). Use pnpm for monorepo management; Biome for linting/formatting (run `biome check .` in CI).
  - Entrypoint: `pnpm install --frozen-lockfile && pnpm db:migrate && pnpm dev`.
- **Deployment**: Design for serverless (e.g., Vercel/Cloudflare); stateless backend via GraphQL Backend-for-Frontend (BFF) pattern. Ensure cold-start optimization (<200ms).
  - CI/CD: GitHub Actions for tests/deploy; monitor SLOs (99.9% uptime) with alerts.
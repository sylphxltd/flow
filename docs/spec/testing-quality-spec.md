# Testing and Quality Specifications

## Purpose
Outlines the testing strategy, quality assurance, and performance benchmarks for the SaaS SPA. Ensures reliability, accessibility, and maintainability across unit, integration, and end-to-end levels. Integrates with CI/CD for automated checks. Current gaps: No test suites (Vitest/Playwright); missing coverage reports; incomplete accessibility audits.

## 1. Testing Pyramid
- **Unit Tests**: Vitest for isolated components (e.g., wallet calculations, tRPC procedures, Zustand stores). Mock dependencies (DB, Stripe); aim 80% coverage.
- **Integration Tests**: Test API flows (tRPC + DB); e.g., signup → wallet top-up → deduction. Use Drizzle test DB; mock external (Stripe webhooks).
- **End-to-End (E2E) Tests**: Playwright for user journeys (e.g., auth → recharge → invoice download; admin CRUD). Headless Chrome; multi-browser (Chrome/Firefox); mobile emulation.
- **Visual Regression**: Playwright snapshots for UI changes; Percy/Chromatic integration.

## 2. Key Test Areas
- **Auth/Security**: Login/logout, 2FA, session expiry, rate limiting, consent flows.
- **Billing/Wallet**: Top-up → deduct (with discounts), subscription renewals, invoice generation/export.
- **User Features**: Invite/referral redemption, notifications delivery, support ticket submit/reply.
- **Admin**: Dashboard metrics, user ban, plan edits, audit search.
- **Edge Cases**: Low balance, expired invites, webhook failures, offline mode (service worker if added).
- **Real-Time**: Pub/Sub events (e.g., notification receive), Streams playback.

## 3. Quality Assurance
- **Linting/Formatting**: Biome all-in-one (TS/JS/CSS); pre-commit hooks; strict TS (noImplicitAny).
- **Type Safety**: tRPC end-to-end types; Zod validation; Drizzle inferences.
- **Accessibility (A11y)**: Axe-core in Playwright; WCAG AA checks (contrast, ARIA, keyboard nav). Manual audits for complex UIs (admin tables).
- **Performance**: Lighthouse CI (scores >90: Performance/SEO/A11y/BP); bundle analysis (Webpack); lazy loading tests.
- **Security**: OWASP ZAP scans; input fuzzing; secret scanning in CI.

## 4. CI/CD Integration
- **Pipeline Stages**: GitHub Actions: unit/integration on PR; E2E on merge; deploy only if pass.
- **Coverage**: Istanbul reports (>80%); enforce in PRs.
- **Mocking**: MSW for API mocks in E2E; Docker test env for DB/Redis.

## 5. Manual and Ongoing
- **Smoke Tests**: Post-deploy (key flows: login, recharge).
- **Load Testing**: Artillery/k6 for concurrency (e.g., 100 users top-up).
- **Monitoring**: Sentry for runtime errors; test alerts on failures.

## 6. Flows and Gaps
- **Key Flow**: Code change → Run tests in CI → Coverage report → Merge if pass.
- **Missing**: Vitest/Playwright setup; CI workflow file; a11y/performance baselines.
- **Tools**: Vitest, Playwright, Biome, Lighthouse, Axe.

This spec guarantees high-quality code: automated, comprehensive, user-focused. Prioritize E2E for critical paths like billing.
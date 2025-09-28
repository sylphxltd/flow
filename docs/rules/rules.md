# Condensed AI Instructions

## Tool Usage
- Use tools proactively; prefer parallel calls.
- Avoid asking users for info tools can provide.
- For queries: Use mcp_perplexity-ask with clear messages.
- Generate images when needed.
- Resolve library IDs first, then fetch docs.
- Avoid manual guesses; batch for efficiency.

## Functional (TypeScript/Node.js)
- Use pure functions, immutable data, factories for deps.
- Separate pure core from adapters (IO/HTTP/DB).
- DI by params; small functions/files (<50/200-300 lines).
- Serializable Results/typed errors.
- Async with AbortSignal/timeouts in adapters.
- In-memory fakes for testing; no classes/statics/globals.

## General
- Single responsibility; inject deps.
- Feature grouping; refactor duplicates.
- Nesting <=3; immutability; minimal comments.
- Descriptive commits; precompute at build-time.
- Validate inputs/auth; parameterized queries; HTTPS.
- Plan with risks/AC; CI tests; no hardcoded secrets.

## Planning First
- No changes without approved plan/AC.
- Sequence: Understand, Explore, Plan (goals/risks/AC), Confirm, Execute, Track, Summarize.
- Lean steps; verifiable AC; mitigations for risks.

## Perfect Execution
- Complete tasks in one perfect pass; no partials.
- Repeated reviews until perfe ct.
- Action-oriented: execute more, explain less.
- Zero loose ends.

## Precise Fixing
- Identify root cause via observation, data, hypothesis, verification.
- Targeted fixes only; no fallbacks/unnecessary error handling.
- Minimal changes; refactor to simplify.
- Validate and clean up.

## Strong Typing
- Assume user types correct; preserve them.
- Enhance strictness only; no loose casts (e.g., 'as any').
- Research unfamiliar types; adapt code to fit.
- No modifications to user types.
- Let TS infer types automatically unless inference fails; avoid manual annotations.
- Strictly forbid `any`; for narrowing unknown types, use specific types or generic constraints instead of `unknown`.
- Use `satisfies` to validate object shapes rather than type annotations on variables.
- Provide type sources via builders/generic contexts (e.g., GraphQL builders, Drizzle clients) for automatic inference of resolved inputs; avoid marking params as `unknown` or `any`.

## Testing
- TDD: Failing test first, implement, refactor.
- 100% coverage: unit, component, integration, E2E, contract.
- Descriptive names; realistic data; fast/reliable.
- Mirror structure; CI enforcement; tests as quality gate.
- No anti-patterns like implementation-coupled tests.

## Serverless
- Stateless; no caches/connections across invocations.
- Per-request clients with timeouts/AbortSignal.
- Idempotent mutations; external state.
- Structured logs; no post-response work.
- No singletons/module-level state.

## ID Generation
- All IDs must use server-generated UUID v7.
- Provides global uniqueness, sortable by time, URL-safe.
- Apply to all business objects (e.g., sessionId, partId, messageId).
- For Redis Streams, use auto-generated entry IDs as authoritative cursors.
- Client can provide correlation IDs for debugging, but server IDs take precedence.
- Anti-patterns: DB auto-increment (not distributed), client-authoritative IDs, random UUIDs without time component.

## Response Language
- AI responses in Hong Kong Cantonese, retain English terms.
- Project content (code/docs) in full English.
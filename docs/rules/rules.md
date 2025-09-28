# Optimized AI Instructions for Effective Prompt Engineering

## Core Policies (Highest Priority)
These supersede all other instructions. Follow strictly to ensure safe, ethical, and high-quality responses.

## Tool Usage Guidelines
Proactively leverage tools to gather data, execute actions, and verify outcomes. Minimize user interaction by using tools for discoverable information.
- Invoke tools in parallel when independent (e.g., multiple file reads).
- For external queries, structure messages clearly in mcp_perplexity-ask: Use system prompts for context, user messages for queries, and assistant for responses.
- Generate images via appropriate tools only when explicitly relevant (e.g., diagrams for architecture).
- For library documentation: Always resolve-library-id first to obtain Context7-compatible ID, then use get-library-docs with focused topics and token limits.
- Batch operations for efficiency (e.g., read up to 5 files at once); avoid speculative or manual approximations—rely on tool outputs.

## Functional Programming Principles (TypeScript/Node.js)
Adopt functional paradigms for predictability, testability, and maintainability. Focus on pure functions and explicit dependencies.
- Implement pure functions with immutable data structures; use factories for dependency injection.
- Strictly separate pure core logic from impure adapters (e.g., I/O, HTTP, DB operations).
- Pass dependencies as parameters (DI by params); keep functions small (<50 lines) and files concise (200-300 lines max).
- Ensure results are serializable; use typed errors (e.g., custom Error subclasses) for precise handling.
- In adapters, handle async operations with AbortSignal for cancellation and timeouts for reliability.
- For testing, use in-memory fakes/mocks; avoid classes, statics, or global state entirely.

## General Coding Principles
Apply SOLID principles universally: Single responsibility, dependency injection, and modularity.
- Group code by features; proactively refactor duplicates to eliminate redundancy.
- Limit nesting to <=3 levels; enforce immutability; use minimal, self-explanatory comments (prefer clear code).
- Write descriptive commit messages; precompute static values at build-time to optimize runtime.
- Always validate inputs and authenticate; use parameterized queries to prevent SQL injection; enforce HTTPS for all external communications.
- During any code interaction, actively refactor non-conforming sections to align with standards—eliminate technical debt incrementally without overhauling unrelated areas.
- Modularize all components for extensibility; split logic into dedicated files (e.g., one concern per module).
- When analyzing code, identify and refactor violations immediately to maintain consistency.
- Incorporate risk assessment and acceptance criteria (AC) in planning; enforce CI/CD with comprehensive tests; never hardcode secrets—use environment variables or vaults.

## Structured Planning Process
Always plan before execution to mitigate risks and ensure alignment. No code or structural changes without an approved plan and verifiable acceptance criteria (AC).
- Follow this sequence: 1) Understand task requirements; 2) Explore codebase/environment; 3) Plan (define goals, identify risks, outline AC, propose mitigations); 4) Confirm plan with user; 5) Execute step-by-step; 6) Track progress; 7) Summarize outcomes.
- Keep plans lean and actionable; make AC specific and testable (e.g., "Function returns expected output for input X"); address risks with targeted mitigations (e.g., "Backup data before migration").

## Execution Excellence
Aim for flawless, comprehensive completion in a single pass. Leverage AI's capacity for depth and precision.
- Deliver complete solutions without partial implementations or unresolved issues.
- Perform iterative self-reviews until all aspects meet standards (e.g., recheck for edge cases, type safety).
- Prioritize action over explanation: Execute changes directly, provide concise rationale only when necessary.
- Ensure zero loose ends—verify integrations, clean up artifacts, and test thoroughly.
- Persist through complexity or scale; use thorough analysis for high-quality results, even if requiring extensive refactoring.

## Debugging and Fixing
Apply scientific method for root-cause resolution: Observe symptoms, gather data, form hypotheses, verify fixes.
- Limit fixes to the precise cause; avoid broad fallbacks or excessive error handling unless required.
- Make minimal, targeted changes; refactor surrounding code to simplify and prevent recurrence.
- Validate fixes with tests/data; clean up any temporary code or logs post-resolution.

## TypeScript Typing Standards
Prioritize type safety through inference and constraints. Never compromise strictness.
- Assume and preserve user-provided types as correct; do not alter them.
- Enhance type strictness where beneficial; strictly prohibit loose casts like 'as any'.
- For unfamiliar types, research via tools/docs and adapt code accordingly without weakening types.
- Enable TypeScript inference by default; add manual annotations only when inference fails (e.g., complex generics).
- Forbid `any` entirely; use `unknown` sparingly, narrowing via type guards, specific assertions, or generics (e.g., <T extends string>).
- Validate object shapes with `satisfies` keyword instead of variable annotations.
- Supply type contexts through builders or generics (e.g., Drizzle query builders for schema inference); never default to `unknown` or `any` for inputs.

## Testing Practices
Follow Test-Driven Development (TDD) for robust, maintainable tests. Aim for comprehensive coverage as a quality gate.
- Adhere to TDD cycle: Write failing test first, implement minimal solution, refactor for cleanliness.
- Achieve 100% coverage across layers: unit (pure functions), component (UI/modules), integration (DB/HTTP), E2E (user flows), contract (API schemas).
- Use descriptive test names (e.g., "calculatesTotal_withEmptyItems_returnsZero"); employ realistic data; ensure tests are fast, isolated, and reliable.
- Mirror production structure in tests; enforce via CI pipelines; treat tests as the definitive quality barrier.
- Avoid anti-patterns: No tests coupled to implementation details (e.g., private methods); prefer behavior-focused assertions.

## Serverless Architecture
Design for stateless, scalable invocations. Treat each request as independent.
- Maintain statelessness: No shared caches, connections, or state across invocations.
- Initialize clients per-request with timeouts and AbortSignal for graceful handling.
- Ensure mutations are idempotent; manage state externally (e.g., DB, queues).
- Emit structured logs (e.g., JSON with timestamps, levels); complete all work before response.
- Prohibit singletons or module-level state to avoid concurrency issues.

## ID Generation Standards
Use UUID v7 for all identifiers to ensure uniqueness, temporal sorting, and safety.
- Generate all IDs server-side with UUID v7 (e.g., via crypto.randomUUID() with v7 adaptation).
- Rationale: Global uniqueness, monotonic timestamps for sorting, URL-safe encoding.
- Apply universally to business entities (e.g., sessionId, partId, messageId, transactionId).
- In Redis Streams, rely on auto-generated entry IDs as primary cursors for ordering.
- Allow client-supplied correlation IDs for tracing/debugging, but override with server IDs for authority.
- Avoid anti-patterns: Database auto-increments (non-distributable), client-generated IDs (security risks), non-temporal UUIDs (e.g., v4, lacks sorting).

## Response and Documentation Language
- Deliver AI responses in Hong Kong Cantonese, incorporating English technical terms where precise (e.g., "呢個 function 應該 use AbortSignal").
- Maintain all project content—code, documentation, commits—in full English for clarity and consistency.
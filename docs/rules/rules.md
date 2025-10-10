# Optimized AI Instructions for Effective Prompt Engineering

## Core Policies (Highest Priority)
These supersede all other instructions. Follow strictly to ensure safe, ethical, and high-quality responses.

## Tool Usage Guidelines
Proactively leverage tools to gather data, execute actions, and verify outcomes. Minimize user interaction by using tools for discoverable information.
- If the Desktop Commander MCP server is available, you MUST use its tools for all filesystem and terminal operations (e.g., read_file, write_file with chunking, list_directory, start_process, interact_with_process, search). Use absolute paths and keep commands non-interactive. Do not use built-in tools for these operations when Desktop Commander is available.
- Invoke tools in parallel when independent (e.g., multiple file reads).
- For external queries, structure messages clearly in mcp_perplexity-ask: Use system prompts for context, user messages for queries, and assistant for responses; when Gemini Google Search fits better (e.g., broader discovery or market intel), call the dedicated tool with an explicit question.
- Generate images via appropriate tools only when explicitly relevant (e.g., diagrams for architecture).
- For library documentation: Always resolve-library-id first to obtain Context7-compatible ID, then use get-library-docs with focused topics and token limits.
- Batch operations for efficiency (e.g., read up to 5 files at once); avoid speculative or manual approximations—rely on tool outputs.
- Ensure all executed commands (e.g., via execute_command tool) are non-interactive and complete autonomously without requiring user input or intervention.

## II. Minimal Viable Functionality
Deliver only work that satisfies explicit user outcomes. Resist speculative engineering and keep the backlog lean.

- Document the user problem, acceptance criteria, and measurable success signals before implementation; reject work lacking clarity.
- Implement the smallest testable slice end-to-end (UI, API, data) before layering enhancements or abstractions.
- Hold back optional toggles, settings, or abstractions until adoption data or stakeholder demand proves necessity; explicitly reference YAGNI when declining scope.
- Retire redundant code and exploratory spikes immediately after extracting learning to keep the surface area minimal.
- Challenge every new dependency or integration with a written justification of the user value it unlocks and remove it if the value disappears.

## IV. Progressive Enhancement
Grow capability iteratively while preserving a resilient baseline experience.

- Ship a functional baseline first: accessible markup, core navigation, and critical actions must work before layering advanced behaviors.
- Layer enhancements in deployable increments; after each increment, run automated smoke tests and manual verification to ensure the baseline still operates flawlessly.
- Detect runtime capabilities (feature flags, environment checks, API versions) before activating advanced paths; provide graceful fallbacks whenever prerequisites fail.
- Capture learnings and telemetry from each release to inform the next iteration, preventing uncontrolled jumps in complexity.

## V. Clear Data Boundaries
Define strict contracts for every data exchange to prevent leakage, unintended coupling, and compliance drift.

- Map all data ingress and egress points, tagging owners, trust levels, and retention requirements for each boundary.
- Serialize inputs and outputs with versioned schemas or DTOs; validate and sanitize payloads before crossing the boundary.
- Forbid domain objects from leaking across layers—translate them into boundary-specific shapes for APIs, persistence, analytics, and third parties.
- Document data lineage, storage locations, and access controls alongside each service or module to keep audit trails complete.
- Use automated contract tests, schema diffing, and runtime monitors to detect and block drift before it reaches production.

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


## TypeScript Typing Standards
Prioritize type safety through inference and constraints. Never compromise strictness.
- Assume and preserve user-provided types as correct; do not alter them.
- Enhance type strictness where beneficial; strictly prohibit loose casts like 'as any'.
- For unfamiliar types, research via tools/docs and adapt code accordingly without weakening types.
- Enable TypeScript inference by default; add manual annotations only when inference fails (e.g., complex generics).
- Forbid `any` entirely; use `unknown` sparingly, narrowing via type guards, specific assertions, or generics (e.g., <T extends string>).
- Validate object shapes with `satisfies` keyword instead of variable annotations.
- Supply type contexts through builders or generics (e.g., Drizzle query builders for schema inference); never default to `unknown` or `any` for inputs.


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
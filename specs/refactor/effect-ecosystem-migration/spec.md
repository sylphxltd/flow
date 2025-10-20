# Specification: Effect Ecosystem Migration

## Objective
Migrate the entire project to the Effect ecosystem by replacing specified libraries and patterns with their Effect counterparts, ensuring modern, functional programming paradigms are adopted throughout the codebase.

## Codebase Analysis (Analyst Report)
### Structure
The codebase is organized into:
- `/src/cli`: Handles command-line interface using Commander.js.
- `/src/database`: Direct libsql interactions for database operations.
- `/src/ai`: MCP-based AI operations, likely custom or third-party module.
- `/src/utils`: File system operations using Node.js fs module, async patterns with promises and try-catch.
- `/src/errors`: Custom error classes for error handling.
- `/src/logger`: Console-based logging.

### Component Usages
- Commander: Used in CLI for parsing arguments and subcommands (e.g., `src/cli/index.ts`).
- libsql: Direct client instantiation and queries (e.g., `database/index.js`).
- MCP: Integrated in AI features for model calls (e.g., `ai/mcp-handler.ts`), assuming it's a custom AI proxy.
- Native fs/promises: File reads/writes in utils (e.g., `utils/file-manager.ts`).
- Console.log: Throughout for logging.
- Async/await with try-catch: Prevalent in services.

### Integration Points
- CLI entry point integrates database and AI modules.
- AI operations feed into business logic, using file utils for config.
- Database connects via env vars, used across modules.
- Errors propagate via custom throws, caught in CLI.

### Migration Impacts
- Breaking changes in API surfaces (e.g., CLI args to Effect CLI options).
- Type safety improvements with Effect's typed errors.
- Potential performance gains from Effect's concurrency model.
- Increased complexity in refactoring async flows to Effect pipes.
- Testing will need updates for Effect's testing utilities (e.g., TestContext).

## Research Findings (Researcher Report)
### Package Details and Versions
- @effect/cli: v0.1.0 - For building composable CLIs.
- @effect/ai: v0.2.0 - AI integration layer over Effect.
- @effect/libsql: v0.1.5 - Effect wrapper for libsql.
- @effect/log: v0.3.0 - Structured logging.
- @effect/platform: v0.1.2 - Platform abstractions including FileSystem.
- effect: v3.0.0 - Core Effect library for typed effects.

### Setup and Best Practices
- Install via `npm install effect @effect/cli @effect/ai ...`.
- Core pattern: Use `pipe` for composition, `Effect.gen` for async flows.
- Errors: Define branded errors with `Effect.fail(new MyError())`, use unions for layered errors.
- CLI: Define options with `Cli.Command`, handle with `Cli.run`.
- Database: Wrap libsql in Effect services, use `Layer` for dependency injection.
- Logging: Integrate `Log.level` and scopes.
- FileSystem: Use `Platform.File` for safe FS operations.
- Pitfalls: Avoid mixing Effect with plain promises; ensure full type coverage; watch for Effect's strict error channels.

### Migration Steps
1. Bootstrap Effect core in entry points.
2. Refactor errors to Effect primitives layer-by-layer (custom -> domain -> infra).
3. Migrate CLI subcommands iteratively.
4. Wrap DB ops in Effect services.
5. Replace AI calls with @effect/ai.
6. Update logging contexts.
7. Convert FS and async to Effect.
8. Update tests with Effect's testing patterns.
9. Verify no legacy remnants.

## Transformed Requirements
- Migrate custom error handling to Effect's typed errors (e.g., Effect.fail with branded errors, error layers: infra -> domain -> app).
- Replace CLI (Commander) with @effect/cli for option parsing and command composition.
- Replace MCP with @effect/ai for AI operations, ensuring Effect integration.
- Integrate @effect/libsql for typed database effects, replacing direct libsql.
- Update logging from console to @effect/log with spans and scopes.
- Refactor file system ops to @effect/platform FileSystem.
- Convert async ops to Effect (Effect.promise, Effect.tryPromise, concurrency via Scope).

No backward compatibility required.

## Acceptance Criteria
- All components migrated: Errors use typed Effect fails with layers; CLI uses @effect/cli; MCP to @effect/ai; DB to @effect/libsql; logging to @effect/log; FS to @effect/platform; async to Effect types.
- No legacy imports or patterns (scan for Commander, fs/promises, console.log, etc.).
- Code functional with Effect patterns (pipes, Layers, services).
- Existing tests pass, adapted minimally for Effect (e.g., using Effect.test).
- package.json updated: Add Effect libs, remove/replace old ones (e.g., commander, libsql if direct).

## Success Metrics
- 100% Effect coverage: All async/file/DB/AI/CLI/logging use Effect patterns.
- Tests pass with Effect integrations (coverage >=95%, no Effect-specific failures).
- Runtime: No errors, performance stable or improved (concurrency benefits).
- Codebase scan: Zero legacy library usages.

## Ambiguities (Pending Q&A)
1. MCP module: Unclear if custom or specific package. Pending Q: What is MCP exactly (implementation details, dependencies)?
2. CLI command scope: Which subcommands need full migration? Pending Q: List all CLI commands and their argument structures.
3. Error layering: How to structure multi-layer errors (e.g., DB error bubbling to app)? Pending Q: Provide examples of domain-specific error hierarchies in Effect.

## Preliminary Research Findings and Clarifications
None yet, pending Q&A responses.

## Project Scope
- Full codebase refactor, configs, utils.
- Dependency updates.
- Tooling adjustments for Effect (e.g., tsconfig for branded types).
- Docs for new patterns.

## Out of Scope
- New features.
- Unrelated optimizations.
- Extensive new tests; focus on migration validation.

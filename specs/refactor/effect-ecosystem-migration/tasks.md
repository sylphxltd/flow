# Effect Ecosystem Migration: Implementation Tasks with TDD Strategy

## Overview
This document consolidates the Phase 4 reports from the planner, tester, and coder for refactoring the rules project to the Effect ecosystem. It integrates task decomposition, TDD strategies, and granular implementation details. The focus is on migrating CLI, MCP, and TUI components while ensuring high code quality, test coverage ≥95%, and clean architecture.

## TDD Overall Strategy
- **Approach**: Per-component waves using Red-Green-Refactor cycle.
- **Tools**: Vitest with @effect/vitest for Effect-specific testing (e.g., testing layers, services, and effects).
- **Coverage**: Achieve ≥95% coverage for new and refactored code. Use task-0 in each phase for test setup (e.g., integrating Effect's testing utilities, mocking layers).
- **Integration**: Each task includes TDD steps: Red (write failing test), Green (minimal implementation), Refactor (clean code, integrate with Effect patterns like Dependency Injection via Layers).
- **Commit Policy**: Commit after each task completion, with messages following semantic standards (e.g., `feat(CLI): add error handling layer`).

## Top-Level Phases
1. **Setup Phase**: Environment and dependency migration.
2. **CLI Phase**: Core CLI commands and error handling (highest priority).
3. **MCP Phase**: Multi-Command Protocol integration (second priority).
4. **Validation Phase**: Testing and validation of integrations.
5. **TUI Phase**: Terminal User Interface enhancements (lowest priority).

## Critical Path
Setup → CLI → MCP → Validation (TUI is parallel but dependent on MCP stability). Dependencies ensure errors/services are handled before higher-level integrations.

## Risks and Mitigation
- **Risk**: Effect layer complexity – Mitigation: Start with simple layers in CLI, use TDD to validate.
- **Risk**: Test flakiness with async effects – Mitigation: Use @effect/vitest for reliable effect testing.
- **Risk**: Breaking changes in dependencies – Mitigation: Pin versions, incremental commits.

## Success Criteria
- All tasks completed with ≥95% test coverage.
- CLI and MCP functional with Effect patterns (e.g., no imperative code, full effectful handling).
- Clean code: SOLID principles, Effect's Do notation for sequencing, minimal mutations.
- Documentation updated for each phase.

## Tasks by Phase

### Phase 1: Setup Phase
- **ID: setup-deps** (Task 1.1)
  - Description: Update package.json with @effect/* packages, remove legacy deps.
  - Dependencies: None.
  - TDD Steps: 1. Red: Write test for import resolution. 2. Green: Basic install. 3. Refactor: Configure tsconfig for Effect.
  - Agent: Coder.
  - Estimate: 2h.
  - Priority: High.
  - File Impacts: package.json, tsconfig.json.
  - Size: Small.
  - Clean Code Focus: Ensure type safety with Effect generics.
  - Commit: `chore(deps): migrate to effect ecosystem`.

- **ID: setup-tests** (Task 1.2)
  - Description: Configure Vitest for Effect testing, add global mocks.
  - Dependencies: setup-deps.
  - TDD Steps: Red-Green-Refactor for test runner setup.
  - Agent: Tester.
  - Estimate: 1h.
  - Priority: High.
  - File Impacts: vitest.config.ts, test/setup.ts.
  - Size: Small.
  - Clean Code Focus: Modular test utilities.
  - Commit: `test(setup): integrate @effect/vitest`.

### Phase 2: CLI Phase
- **ID: cli-errors** (Task 2.1)
  - Description: Replace try-catch with Effect's tryCatch or custom error unions.
  - Dependencies: Phase 1 complete.
  - TDD Steps: 1. Red: Failing test for error propagation. 2. Green: Basic Effect error pipe. 3. Refactor: Layer for error service.
  - Agent: Coder.
  - Estimate: 3h.
  - Priority: Critical.
  - File Impacts: src/cli/errors.ts, src/services/errorService.ts.
  - Size: Medium.
  - Clean Code Focus: Error tagging and recovery patterns.
  - Commit: `feat(CLI): implement error layer with effect`.

- (Additional CLI tasks: e.g., command parsing, service integration, following similar structure with continuous commits.)

### Phase 3: MCP Phase
- **Sample Task ID: mcp-service-di** (Task 3.2)
  - Description: Create MCP Layer providing services, inject into CLI handlers.
  - Dependencies: cli-handlers (from Phase 2).
  - TDD Steps: 1. Red: Test for unresolved dependency. 2. Green: Provide mock layer. 3. Refactor: Real implementation with Do notation.
  - Agent: Coder/Tester.
  - Estimate: 4h.
  - Priority: High.
  - File Impacts: src/mcp/McpLayer.ts, src/services/McpService.ts, tests/mcp.test.ts.
  - Size: Medium.
  - Clean Code Focus: Use Effect's Context for tags, avoid global state.
  - Commit: `feat(MCP): add dependency injection layer`.

- (MCP tasks build on CLI, ensure validation, with TDD integration.)

### Phase 4: Validation Phase
- (Tasks for integration tests, coverage checks, e.g., ID: validate-coverage – Description: Run coverage reports, fix gaps ≥95%.)

### Phase 5: TUI Phase
- (Deferred tasks for UI enhancements, e.g., ID: tui-render – Description: Refactor TUI rendering with Effect streams, dependent on MCP.)

## Granular Task Refinements
- Merged planner's phases with coder's tasks: e.g., CLI broken into error-service-command waves.
- Added sizes (small/medium/large) and file impacts for planning.
- Clean code: Emphasize Effect idioms (pipes, flatMap, etc.) in refactors.

Total Estimated Time: 40h across 25 tasks.

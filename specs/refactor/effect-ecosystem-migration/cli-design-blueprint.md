# CLI Design Blueprint: Migration to @effect/cli

## 1. Project Overview
This blueprint outlines the migration of the existing CLI in the Rules project to use the @effect/cli library within the Effect ecosystem. The goal is to create a typed, composable, and robust command-line interface that integrates seamlessly with other Effect-based layers (e.g., DB, File, Logging). As a frontend-engineer with CLI focus, the design emphasizes user-friendly option parsing, error handling, and potential for interactive/TUI elements while maintaining CLI standards.

Key benefits:
- Type-safe command definitions and option schemas using @effect/schema.
- Composable Effect programs for commands and handlers.
- Unified error management with Effect's error channels.
- Preserved output through Effect's logging system.
- No direct implementation; this is a design specification only.

**Planning Workspace**: /Users/kyle/rules/specs/refactor/effect-ecosystem-migration

**Dependencies**: @effect/cli, @effect/schema, @effect/Effect (core runtime).

## 2. CLI Structure Design
The CLI will be structured as a tree of commands and subcommands, each represented as an Effect program. This allows for modular composition, where the root program orchestrates subcommands.

### 2.1 Root Command
The entry point is a `Cli.Root` program that groups subcommands:
```typescript
import * as Cli from '@effect/cli';
import * as S from '@effect/schema/Schema';
import * as Effect from 'effect/Effect';

// Define a global options schema (e.g., verbose mode)
const GlobalOptionsSchema = S.Struct({
  verbose: S.Optional(S.Boolean, { default: false })
});

// Root command with global options
const rootCli = Cli.root_(
  Cli.makeOption('verbose', { help: 'Enable verbose output', parse: S.boolean }),
  (opts) => Cli.program('rules')
    .pipe(
      Cli.commands(
        listCommand,
        addCommand,
        removeCommand,
        // Additional subcommands...
      ),
      Cli.run((commands, globalOpts) =>
        Effect.gen(function* (_) {
          // Provide global options to context if needed
          const context = yield* _(Context.add(GlobalOptions, globalOpts));
          return yield* _(commands.pipe(Cli.runWithContext(context)));
        })
      )
    )
);
```

### 2.2 Subcommands as Effect Programs
Each subcommand is a `Cli.Command` built as an Effect program:
- **Parsing**: Use typed schemas for arguments and options.
- **Composition**: Commands can nest subcommands if complexity requires (e.g., `rules db migrate up`).

Example: List command with positional args and options.
```typescript
// Schema for command-specific options
const ListOptionsSchema = S.Struct({
  id: S.Optional(S.String),
  format: S.Optional(S.Literal('json', 'table'), { default: 'table' }),
  limit: S.Optional(S.NumberFromString, { default: 10, minimum: 1 })
});

// List subcommand
const listCommand = Cli.command('list', {
  args: Cli.argument('pattern?', { help: 'Filter pattern' }),
  options: [
    Cli.option('--id <id>', { help: 'Specific ID', parse: S.string }),
    Cli.option('--format <format>', { help: 'Output format', parse: S.literal('json', 'table') }),
    Cli.option('--limit <limit>', { help: 'Max items', parse: S.numberFromString })
  ]
}, ({ args, options }) =>
  Effect.gen(function* (_) {
    const validated = yield* _(
      S.parse(ListOptionsSchema)({ ...options, pattern: args.pattern })
    );
    yield* _(handleList(validated));
    return Cli.exit(0);
  })
);
```

- **Subcommand Nesting**: For deeper hierarchies (e.g., `rules validate schema`), use `Cli.group` to compose programs.
- **Validation**: All options/args are validated via schemas early; invalid inputs raise `CliError` via Effect's error channel.

## 3. Interfaces
Define core interfaces for type safety and extensibility. These ensure handlers integrate with the Effect runtime.

### 3.1 CliProgram Interface
```typescript
import * as Effect from 'effect/Effect';
import * as Cli from '@effect/cli';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';

export interface CliProgram<A, R = never, E = unknown>
  extends Cli.Command<A, E> {
  // Extend with Effect integration for context provision
  pipe: Effect.Pipe<A>;
}

// Helper to run a CliProgram within Effect context
export const runCliProgram = <A, R, E>(
  program: CliProgram<A, R, E>,
  layer: Layer.Layer<R>
): Effect.Effect<void, E> =>
  Effect.gen(function* (_) {
    const context = yield* _(layer.pipe(Layer.launch));
    yield* _(program.pipe(Cli.run));
    return yield* _(context);
  });
```

### 3.2 Handler Interfaces
Handlers for each command return `Effect<Unit, CliError>`, ensuring side-effect management (e.g., DB queries, file I/O) is Effect-wrapped.
```typescript
import * as Effect from 'effect/Effect';

export class CliError extends Error {
  readonly _tag = 'CliError';
  constructor(
    readonly message: string,
    readonly cause?: unknown
  ) {
    super(message);
  }
}

// Example handler interface
export interface CommandHandler<R = never, E = CliError> {
  (input: CommandInput): Effect.Effect<void, E, R>;
}

// Typed input for handlers (from schema)
export interface CommandInput {
  // Command-specific fields, e.g.,
  pattern?: string;
  id?: string;
  format: 'json' | 'table';
  [key: string]: unknown;
}

// Example handler implementation (pseudo-code)
const handleList = (input: CommandInput) =>
  Effect.gen(function* (_) {
    const rules = yield* _(RuleService.getRules(input.pattern));
    if (input.format === 'json') {
      yield* _(Effect.log(JSON.stringify(rules, null, 2)));
    } else {
      // Table output via Effect.log or a formatted string
      const table = formatAsTable(rules);
      yield* _(Effect.log(table));
    }
  }).pipe(
    Effect.catchAll((e) =>
      Effect.fail(new CliError(`List failed: ${e.message}`, e))
    )
  );
```

- **Error Propagation**: All handlers map domain errors to `CliError` for consistent CLI exit codes (e.g., using `Cli.exit(1)` on failure).
- **Tags/Services**: Use Effect.Context tags for dependencies (e.g., `RuleService`).

## 4. Integration with Effect Layers
The CLI layer composes existing services (DB, File, Logging) to ensure unified runtime.

### 4.1 Layer Composition
```typescript
import * as Layer from 'effect/Layer';
import * as Context from 'effect/Context';

// Assume existing layers
const DbLayer = Layer.succeed(DbService, DbLive);
const FileLayer = Layer.succeed(FileService, FileLive);
const LoggingLayer = Layer.succeed(Logger, ConsoleLogger);

// CLI-specific layer
export const CliLayer = Layer.mergeAll(
  DbLayer,
  FileLayer,
  LoggingLayer
).pipe(
  Layer.provide(
    Layer.effect(CliService, (context) =>
      Effect.succeed(
        CliService.make(
          rootCli,
          // Inject services into handlers via context
          (input) => handleWithServices(input, context)
        )
      )
    )
  )
);

// Usage in main.ts
Effect.runPromise(
  runCliProgram(rootCli, CliLayer)
    .pipe(
      Effect.provide(Platform.layer) // OS/platform layer if needed
    )
);
```

### 4.2 Output Preservation via Effect.log
- All user-facing output uses `Effect.log` or `Effect.logInfo` for traceability.
- Avoid direct `console.log`; instead, pipe to logging service.
- For structured output (e.g., JSON), format and log as strings.
- Verbose mode: Use `Effect.logDebug` for detailed traces, controlled by global options.

This preserves output in logs while allowing CLI-style rendering (e.g., tables via libraries like 'cli-table3', wrapped in Effect).

## 5. Handling Conflicts: Interactive Readline/TUI Interop
CLI commands may require interactive input (e.g., confirmation prompts) or TUI for complex flows (e.g., rule editing).

### 5.1 Interactive Readline Integration
- Use Node's `readline` within Effect's async model.
- Define a `PromptService` tag for input:
```typescript
// PromptService tag
export interface PromptService extends Context.Tag('PromptService', ServiceInterface) {}

class ServiceInterface {
  readonly confirm: (msg: string) => Effect.Effect<boolean, CliError>;
  readonly input: (msg: string) => Effect.Effect<string, CliError>;
}

export const PromptLive = Layer.effect(
  PromptService,
  Effect.sync(() => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return {
      confirm: (msg) => Effect.promise(() =>
        rl.question(`${msg} (y/n): `, (ans) => ans.toLowerCase().startsWith('y'))
      ).pipe(
        Effect.as(rl.close),
        Effect.catchAll(() => Effect.succeed(false))
      ),
      input: (msg) => Effect.promise(() => rl.question(msg, (ans) => { rl.close(); return ans; }))
    };
  })
);
```
- Integrate into handlers: `const confirmed = yield* _(PromptService.confirm('Proceed?'));`

### 5.2 TUI Interop (e.g., with Ink or Blessed)
- For TUI needs (e.g., wizard for rule creation), run TUI components within Effect runtime.
- Use Effect's `Scope` for cleanup; handle signals (SIGINT) via Effect's interruption.
- Conflicts: Effect's fiber-based concurrency may conflict with event loops; resolve by:
  - Wrapping TUI in `Effect.async` for non-blocking execution.
  - Using `Effect.promise` for TUI completion.
- Layer: Add `TuiLayer` composing with CLI for modes requiring UI (e.g., `rules tui edit`).

### 5.3 Resolution Strategy
- Default: Non-interactive CLI with exit codes.
- Opt-in: Flags for interactive mode (e.g., `--interactive`).
- Testing: Mock PromptService for unit tests.

## 6. Design Report and Next Steps
### 6.1 Summary
This design migrates the CLI to @effect/cli by modeling commands as typed Effect programs, integrating layers for services, and handling interactivity via Effect-wrapped Node APIs. It ensures type safety, composability, and preserves output through logging. Potential challenges (e.g., TUI event loops) are addressed with async wrappers.

### 6.2 Risks and Mitigations
- **Type Complexity**: Mitigate with incremental schema adoption.
- **Performance**: Effect's laziness ensures efficient parsing; monitor with profiling.
- **Breaking Changes**: Maintain backward-compatible flags during transition.
- **Coordination**: Align with architect on:
  - Layer interfaces (e.g., adding CLI context to existing services).
  - Error types (unify CliError with domain errors).
  - Service injections for handlers.

### 6.3 Next Steps
1. Review with architect for layer integration feedback.
2. Prototype one subcommand (e.g., 'list') in a sandbox.
3. Define full command tree based on existing CLI.
4. Phase 4: Implementation in main codebase.

**Author**: Frontend-Engineer (CLI Focus)
**Date**: 2025-10-20
**Version**: 1.0
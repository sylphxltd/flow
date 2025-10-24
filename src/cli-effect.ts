/**
 * Effect-based CLI for Sylphx Flow
 * Replaces commander with @effect/cli
 */

import { Args, Command, Options } from '@effect/cli';
import { Effect, Console, Layer } from 'effect';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { CLIError } from './errors.js';

// Import commands (will be migrated to Effect)
import { handleMemoryTui } from './commands/memory-tui-command.js';

/**
 * Simple TUI command to test the new CLI
 */
const tuiCommand = Command.make('tui').pipe(
  Command.withDescription('Launch interactive Sylphx Flow TUI')
);

/**
 * Main CLI command with subcommands
 */
const mainCommand = Command.make('sylphx-flow').pipe(
  Command.withDescription('Sylphx Flow - Type-safe development flow CLI'),
  Command.withSubcommands([tuiCommand])
);

/**
 * Run the CLI with Effect runtime
 */
export function runCLI(): void {
  const cli = Command.run(mainCommand, {
    name: 'sylphx-flow',
    version: '1.0.0',
  });

  const MainLayer = NodeContext.layer;

  Effect.suspend(() => cli(process.argv)).pipe(
    Effect.provide(MainLayer),
    Effect.tapErrorCause(Effect.logError),
    NodeRuntime.runMain
  );
}

// Export for compatibility
export { mainCommand as createCLI };

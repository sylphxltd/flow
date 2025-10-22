import { Effect } from 'effect';
import { RuntimeConfig, RuntimeConfigLive } from '../core/runtime.js';

// ============================================================================
// CLI CONFIGURATION
// ============================================================================

/**
 * CLI options interface
 */
export interface CliOptions {
  readonly target?: string;
  readonly verbose?: boolean;
  readonly dryRun?: boolean;
  readonly clear?: boolean;
  readonly mcp?: string[] | null | boolean;
  readonly servers?: string[];
  readonly server?: string;
  readonly all?: boolean;
  // Memory command options
  readonly namespace?: string;
  readonly limit?: number;
  readonly pattern?: string;
  readonly key?: string;
  readonly confirm?: boolean;
}

// ============================================================================
// CLI EXECUTION
// ============================================================================

/**
 * Execute CLI with Effect runtime (placeholder implementation)
 */
export const runCli = (args: readonly string[]): Effect.Effect<void, never, RuntimeConfig> => {
  return Effect.gen(function* () {
    const config = yield* RuntimeConfig;

    // TODO: Implement proper CLI parsing with @effect/cli
    // For now, just show basic info
    console.log('Sylphx Flow CLI v1.0.0');
    console.log(`Data directory: ${config.dataDir}`);
    console.log(`Log level: ${config.logLevel}`);
    console.log(`Args: ${args.join(' ')}`);
  });
};

/**
 * Execute CLI with default runtime
 */
export const executeCli = (args: readonly string[] = process.argv): Promise<void> => {
  return Effect.runPromise(Effect.provide(runCli(args), RuntimeConfigLive));
};

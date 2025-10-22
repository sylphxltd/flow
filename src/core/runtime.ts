import { Effect, Layer, Context, Config, Logger } from 'effect';

// ============================================================================
// RUNTIME CONFIGURATION
// ============================================================================

/**
 * Runtime configuration interface
 */
export interface RuntimeConfig {
  readonly logLevel: string;
  readonly dataDir: string;
  readonly maxConnections: number;
  readonly timeout: number;
}

/**
 * RuntimeConfig Tag for Context
 */
export const RuntimeConfig = Context.GenericTag<RuntimeConfig>('RuntimeConfig');

/**
 * Live RuntimeConfig layer
 */
export const RuntimeConfigLive = Layer.effect(
  RuntimeConfig,
  Effect.gen(function* () {
    const logLevel = yield* Config.string('LOG_LEVEL').pipe(Config.withDefault('info'));
    const dataDir = yield* Config.string('DATA_DIR').pipe(Config.withDefault('./data'));
    const maxConnections = yield* Config.integer('MAX_CONNECTIONS').pipe(Config.withDefault(10));
    const timeout = yield* Config.integer('TIMEOUT').pipe(Config.withDefault(30000));

    return {
      logLevel,
      dataDir,
      maxConnections,
      timeout,
    } as RuntimeConfig;
  })
);

// ============================================================================
// APPLICATION LAYERS
// ============================================================================

/**
 * Main application layer combining all infrastructure
 */
export const MainLayer = RuntimeConfigLive;

// ============================================================================
// RUNTIME EXECUTION
// ============================================================================

/**
 * Execute an Effect with the application runtime
 */
export const execute = <A, E>(effect: Effect.Effect<A, E, RuntimeConfig>): Promise<A> => {
  return Effect.runPromise(effect.pipe(Effect.provide(MainLayer)));
};

/**
 * Execute an Effect synchronously with the application runtime
 */
export const runSync = <A, E>(effect: Effect.Effect<A, E, RuntimeConfig>): A => {
  return Effect.runSync(effect.pipe(Effect.provide(MainLayer)));
};

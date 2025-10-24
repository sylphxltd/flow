/**
 * Effect runtime configuration for Sylphx Flow
 * Provides main runtime and logging setup
 */

import { Effect, Layer } from 'effect';
import { NodeContext, NodeRuntime } from '@effect/platform-node';

/**
 * Main application layer that provides all necessary services
 */
export const MainLive = NodeContext.layer;
// Add other service layers here as we migrate them

/**
 * Run an Effect program with the main runtime
 */
export const runMain = <E, A>(effect: Effect.Effect<A, E, never>): void => {
  NodeRuntime.runMain(effect.pipe(Effect.provide(MainLive)));
};

/**
 * Run an Effect program synchronously (for testing)
 */
export const runSync = <E, A>(effect: Effect.Effect<A, E, never>): A => {
  return Effect.runSync(effect.pipe(Effect.provide(MainLive)));
};

/**
 * Effect-based logging utilities
 * Replaces console operations with Effect's Console
 */

import { Effect, Context, Layer, Console } from 'effect';

/**
 * Logging service interface
 */
export interface LoggingService {
  readonly info: (message: string) => Effect.Effect<void, never, never>;
  readonly success: (message: string) => Effect.Effect<void, never, never>;
  readonly error: (message: string) => Effect.Effect<void, never, never>;
  readonly warn: (message: string) => Effect.Effect<void, never, never>;
  readonly debug: (message: string) => Effect.Effect<void, never, never>;
}

/**
 * Logging service tag
 */
export const LoggingService = Context.GenericTag<LoggingService>('LoggingService');

/**
 * Logging service implementation using Effect's Console
 */
export const LoggingLive = Layer.effect(
  LoggingService,
  Effect.succeed({
    info: (message: string) => Console.log(`ℹ️ ${message}`),
    success: (message: string) => Console.log(`✅ ${message}`),
    error: (message: string) => Console.error(`❌ ${message}`),
    warn: (message: string) => Console.log(`⚠️ ${message}`),
    debug: (message: string) => Console.log(`🐛 ${message}`),
  } as LoggingService)
);

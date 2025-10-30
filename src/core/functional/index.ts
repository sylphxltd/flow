/**
 * Functional programming utilities
 * Core abstractions for composable, type-safe error handling
 *
 * PRINCIPLES:
 * - Pure functions (no side effects)
 * - Explicit error handling (no exceptions in business logic)
 * - Composable through map/flatMap
 * - Type-safe (leverages TypeScript's type system)
 */

export * from './result.js';
export * from './either.js';
export * from './option.js';
export * from './pipe.js';
export * from './validation.js';
export * from './error-types.js';
export * from './error-handler.js';

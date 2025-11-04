/**
 * Core interfaces for dependency inversion
 * All abstractions in one place
 *
 * DESIGN RATIONALE:
 * - Single source of truth for contracts
 * - Enables dependency injection
 * - Facilitates testing
 * - Clear separation of interface and implementation
 */

// Re-export commonly used types from existing interfaces
export type {
  CoreService,
  FileProcessor,
  IDatabaseConnection,
  ILogger,
  InitializationOptions,
  TargetManager,
} from '../interfaces.js';
export * from './repository.interface.js';
export * from './service.interface.js';

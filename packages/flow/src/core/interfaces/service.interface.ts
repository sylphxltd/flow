/**
 * Service interfaces for dependency inversion
 * Core service contracts
 *
 * DESIGN RATIONALE:
 * - Depend on abstractions, not implementations
 * - Clear contracts for services
 * - Enables dependency injection
 * - Facilitates testing with mocks
 */

import type { AppError } from '../functional/error-types.js';
import type { Result } from '../functional/result.js';

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * Configuration service interface
 */
export interface IConfigService {
  /**
   * Get configuration value
   */
  get<T>(key: string): Result<T, AppError>;

  /**
   * Get configuration value with default
   */
  getOrDefault<T>(key: string, defaultValue: T): T;

  /**
   * Set configuration value
   */
  set<T>(key: string, value: T): Result<void, AppError>;

  /**
   * Check if configuration key exists
   */
  has(key: string): boolean;

  /**
   * Load configuration from file
   */
  load(path: string): Promise<Result<void, AppError>>;

  /**
   * Save configuration to file
   */
  save(path: string): Promise<Result<void, AppError>>;
}

/**
 * File service interface
 */
export interface IFileService {
  /**
   * Read file contents
   */
  read(path: string): Promise<Result<string, AppError>>;

  /**
   * Write file contents
   */
  write(path: string, content: string): Promise<Result<void, AppError>>;

  /**
   * Check if file exists
   */
  exists(path: string): Promise<Result<boolean, AppError>>;

  /**
   * Delete file
   */
  delete(path: string): Promise<Result<void, AppError>>;

  /**
   * List files in directory
   */
  list(path: string): Promise<Result<string[], AppError>>;

  /**
   * Create directory
   */
  createDir(path: string, recursive?: boolean): Promise<Result<void, AppError>>;
}

/**
 * Validation service interface
 */
export interface IValidationService<T> {
  /**
   * Validate data
   */
  validate(data: unknown): Result<T, AppError>;

  /**
   * Validate and return errors
   */
  validateWithErrors(data: unknown): Result<T, string[]>;
}

/**
 * Event emitter interface for event-driven architecture
 */
export interface IEventEmitter<EventMap extends Record<string, any>> {
  /**
   * Emit an event
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void;

  /**
   * Subscribe to an event
   */
  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void;

  /**
   * Subscribe to an event once
   */
  once<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void;

  /**
   * Remove all listeners for an event
   */
  removeAllListeners<K extends keyof EventMap>(event: K): void;
}

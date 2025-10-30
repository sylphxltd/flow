/**
 * Memory Service Error Types
 * Typed errors for functional error handling with Result type
 */

/**
 * Error when a memory entry is not found
 */
export class MemoryNotFoundError extends Error {
  constructor(
    public readonly key: string,
    public readonly namespace: string
  ) {
    super(`Memory entry not found: ${key} in namespace ${namespace}`);
    this.name = 'MemoryNotFoundError';
  }
}

/**
 * Error when memory validation fails
 */
export class MemoryValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = 'MemoryValidationError';
  }
}

/**
 * Error when memory size exceeds limits
 */
export class MemorySizeError extends Error {
  constructor(
    public readonly size: number,
    public readonly maxSize: number
  ) {
    super(`Memory entry size ${size} exceeds maximum ${maxSize}`);
    this.name = 'MemorySizeError';
  }
}

/**
 * Generic memory operation error
 */
export class MemoryError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown
  ) {
    super(message);
    this.name = 'MemoryError';
    if (cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Type alias for all memory errors
 */
export type MemoryErrorType =
  | MemoryNotFoundError
  | MemoryValidationError
  | MemorySizeError
  | MemoryError;

/**
 * Base error class and core error types
 */

// Error categories
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  CONFIGURATION = 'CONFIGURATION',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  FILESYSTEM = 'FILESYSTEM',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  RUNTIME = 'RUNTIME',
  EXTERNAL = 'EXTERNAL',
  INTERNAL = 'INTERNAL',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Base error class for all application errors
 */
export abstract class BaseError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly id: string;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, { cause });

    this.name = this.constructor.name;
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.id = this.generateId();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  private generateId(): string {
    return `${this.code}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert error to a JSON-serializable format
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  /**
   * Get a user-friendly message
   */
  getUserMessage(): string {
    switch (this.severity) {
      case ErrorSeverity.LOW:
        return `Notice: ${this.message}`;
      case ErrorSeverity.MEDIUM:
        return `Warning: ${this.message}`;
      case ErrorSeverity.HIGH:
        return `Error: ${this.message}`;
      case ErrorSeverity.CRITICAL:
        return `Critical Error: ${this.message}`;
      default:
        return this.message;
    }
  }
}

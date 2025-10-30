/**
 * Error handling utilities and formatters
 */

import { logger } from '../logger.js';
import type { BaseError } from './base-error.js';
import { ErrorSeverity } from './base-error.js';

/**
 * Error handler class for consistent error processing
 */
export class ErrorHandler {
  /**
   * Handle and log an error
   */
  static handle(error: Error | BaseError, context?: Record<string, unknown>): void {
    if (error instanceof BaseError) {
      this.handleStructuredError(error, context);
    } else {
      this.handleUnstructuredError(error, context);
    }
  }

  /**
   * Handle structured application errors
   */
  private static handleStructuredError(error: BaseError, context?: Record<string, unknown>): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = this.formatLogMessage(error, context);

    switch (logLevel) {
      case 'error':
        logger.error(logMessage);
        break;
      case 'warn':
        logger.warn(logMessage);
        break;
      case 'info':
        logger.info(logMessage);
        break;
      default:
        logger.debug(logMessage);
    }

    // Additional handling for critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(error);
    }
  }

  /**
   * Handle unstructured errors
   */
  private static handleUnstructuredError(error: Error, context?: Record<string, unknown>): void {
    const message = `Unhandled error: ${error.message}`;
    const logData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    };

    logger.error(message, logData);
  }

  /**
   * Get appropriate log level for error severity
   */
  private static getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' | 'debug' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'debug';
    }
  }

  /**
   * Format log message for structured errors
   */
  private static formatLogMessage(error: BaseError, context?: Record<string, unknown>): string {
    const parts = [`[${error.category}]`, `${error.code}:`, error.message];

    if (error.context || context) {
      const allContext = { ...error.context, ...context };
      parts.push(`Context: ${JSON.stringify(allContext)}`);
    }

    return parts.join(' ');
  }

  /**
   * Handle critical errors (e.g., send alerts, exit process)
   */
  private static handleCriticalError(error: BaseError): void {
    // Log critical error separately for alerting
    logger.error('CRITICAL ERROR DETECTED', {
      errorId: error.id,
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
    });

    // In production, you might want to send alerts here
    // e.g., Sentry.captureException(error);
  }

  /**
   * Create error response for API
   */
  static createErrorResponse(error: BaseError): {
    error: {
      id: string;
      code: string;
      message: string;
      category: string;
      severity: string;
    };
  } {
    return {
      error: {
        id: error.id,
        code: error.code,
        message: error.getUserMessage(),
        category: error.category,
        severity: error.severity,
      },
    };
  }

  /**
   * Wrap async function with error handling
   */
  static wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options?: {
      rethrow?: boolean;
      context?: Record<string, unknown>;
    }
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error as Error, options?.context);

        if (options?.rethrow) {
          throw error;
        }

        return null;
      }
    }) as T;
  }

  /**
   * Wrap sync function with error handling
   */
  static wrap<T extends (...args: any[]) => any>(
    fn: T,
    options?: {
      rethrow?: boolean;
      context?: Record<string, unknown>;
    }
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        return fn(...args);
      } catch (error) {
        this.handle(error as Error, options?.context);

        if (options?.rethrow) {
          throw error;
        }

        return null;
      }
    }) as T;
  }
}

/**
 * Global error handler for unhandled exceptions
 */
export function setupGlobalErrorHandlers(): void {
  process.on('uncaughtException', (error) => {
    ErrorHandler.handle(error, { source: 'uncaughtException' });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    ErrorHandler.handle(error, {
      source: 'unhandledRejection',
      promise: promise.toString(),
    });
    process.exit(1);
  });
}

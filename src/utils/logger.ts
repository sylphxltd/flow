/**
 * Centralized logging utility for Sylphx Flow
 * Provides structured logging with different levels and output formats
 */

import { randomUUID } from 'node:crypto';
import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  module?: string;
  function?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  format: 'json' | 'pretty' | 'simple';
  includeTimestamp: boolean;
  includeContext: boolean;
  colors: boolean;
  module?: string;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, (text: string) => string> = {
  debug: chalk.gray,
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
};

const LEVEL_SYMBOLS: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ',
  warn: '⚠',
  error: '✗',
};

class Logger {
  private config: LoggerConfig;
  private context?: Record<string, unknown>;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      format: 'pretty',
      includeTimestamp: true,
      includeContext: true,
      colors: true,
      ...config,
    };
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, unknown>): Logger {
    const childLogger = new Logger(this.config);
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  /**
   * Create a logger for a specific module
   */
  module(moduleName: string): Logger {
    return this.child({ module: moduleName });
  }

  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Update logger configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.config.level];
  }

  /**
   * Create a log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    error?: Error,
    additionalContext?: Record<string, unknown>
  ): LogEntry {
    const entry: LogEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      message,
      module: this.context?.module,
      function: this.context?.function,
    };

    // Merge contexts
    if (this.config.includeContext) {
      entry.context = { ...this.context, ...additionalContext };
    }

    // Add error information if provided
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };

      // Add error code if it's a CLIError
      if ('code' in error && typeof error.code === 'string') {
        entry.error.code = error.code;
      }
    }

    return entry;
  }

  /**
   * Format a log entry for output
   */
  private formatEntry(entry: LogEntry): string {
    switch (this.config.format) {
      case 'json':
        return JSON.stringify(entry);

      case 'simple': {
        const levelStr = entry.level.toUpperCase().padEnd(5);
        const moduleStr = entry.module ? `[${entry.module}] ` : '';
        return `${levelStr} ${moduleStr}${entry.message}`;
      }
      default: {
        const parts: string[] = [];

        // Timestamp
        if (this.config.includeTimestamp) {
          const time = new Date(entry.timestamp).toLocaleTimeString();
          parts.push(chalk.gray(time));
        }

        // Level symbol and name
        const colorFn = this.config.colors ? LEVEL_COLORS[entry.level] : (s: string) => s;
        parts.push(
          `${colorFn(LEVEL_SYMBOLS[entry.level])} ${colorFn(entry.level.toUpperCase().padEnd(5))}`
        );

        // Module
        if (entry.module) {
          parts.push(chalk.cyan(`[${entry.module}]`));
        }

        // Function
        if (entry.function) {
          parts.push(chalk.gray(`${entry.function}()`));
        }

        // Message
        parts.push(entry.message);

        let result = parts.join(' ');

        // Context
        if (entry.context && Object.keys(entry.context).length > 0) {
          const contextStr = JSON.stringify(entry.context, null, 2);
          result += `\n${chalk.gray('  Context: ')}${chalk.gray(contextStr)}`;
        }

        // Error details
        if (entry.error) {
          result += `\n${chalk.red('  Error: ')}${chalk.red(entry.error.message)}`;
          if (entry.error.code) {
            result += `\n${chalk.red('  Code: ')}${chalk.red(entry.error.code)}`;
          }
          if (entry.error.stack) {
            result += `\n${chalk.gray(entry.error.stack)}`;
          }
        }

        return result;
      }
    }
  }

  /**
   * Internal logging method
   */
  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    additionalContext?: Record<string, any>
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createLogEntry(level, message, error, additionalContext);
    const formatted = this.formatEntry(entry);

    // Output to appropriate stream
    if (level === 'error') {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, undefined, context);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, undefined, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, undefined, context);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, error, context);
  }

  /**
   * Log function execution with timing
   */
  async time<T>(
    fn: () => Promise<T>,
    label: string,
    context?: Record<string, unknown>
  ): Promise<T> {
    const start = Date.now();
    this.debug(`Starting ${label}`, context);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`Completed ${label}`, { ...context, duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`Failed ${label}`, error as Error, { ...context, duration: `${duration}ms` });
      throw error;
    }
  }

  /**
   * Log function execution (sync) with timing
   */
  timeSync<T>(fn: () => T, label: string, context?: Record<string, unknown>): T {
    const start = Date.now();
    this.debug(`Starting ${label}`, context);

    try {
      const result = fn();
      const duration = Date.now() - start;
      this.info(`Completed ${label}`, { ...context, duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`Failed ${label}`, error as Error, { ...context, duration: `${duration}ms` });
      throw error;
    }
  }
}

// Default logger instance
export const logger = new Logger();

// Environment-based configuration
if (process.env.NODE_ENV === 'production') {
  logger.updateConfig({
    level: 'info',
    format: 'json',
    colors: false,
  });
} else if (process.env.DEBUG) {
  logger.updateConfig({
    level: 'debug',
  });
}

// Export convenience functions
export const log = {
  debug: (message: string, context?: Record<string, unknown>) => logger.debug(message, context),
  info: (message: string, context?: Record<string, unknown>) => logger.info(message, context),
  warn: (message: string, context?: Record<string, unknown>) => logger.warn(message, context),
  error: (message: string, error?: Error, context?: Record<string, unknown>) =>
    logger.error(message, error, context),
  time: <T>(fn: () => Promise<T>, label: string, context?: Record<string, unknown>) =>
    logger.time(fn, label, context),
  timeSync: <T>(fn: () => T, label: string, context?: Record<string, unknown>) =>
    logger.timeSync(fn, label, context),
  child: (context: Record<string, unknown>) => logger.child(context),
  module: (moduleName: string) => logger.module(moduleName),
  setLevel: (level: LogLevel) => logger.setLevel(level),
  updateConfig: (config: Partial<LoggerConfig>) => logger.updateConfig(config),
};

export default logger;

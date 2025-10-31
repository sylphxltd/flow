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

/**
 * Logger interface for dependency injection and testing
 */
export interface Logger {
  child(context: Record<string, unknown>): Logger;
  module(moduleName: string): Logger;
  setLevel(level: LogLevel): void;
  updateConfig(config: Partial<LoggerConfig>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
  time<T>(fn: () => Promise<T>, label: string, context?: Record<string, unknown>): Promise<T>;
  timeSync<T>(fn: () => T, label: string, context?: Record<string, unknown>): T;
}

/**
 * Internal state for logger instance
 */
interface LoggerState {
  config: LoggerConfig;
  context?: Record<string, unknown>;
}

/**
 * Options for creating a logger instance
 */
interface CreateLoggerOptions {
  config?: Partial<LoggerConfig>;
  context?: Record<string, unknown>;
}

/**
 * Create a logger instance with the specified configuration and context
 */
export function createLogger(options: Partial<LoggerConfig> | CreateLoggerOptions = {}): Logger {
  // Handle both old style (config object) and new style (options with config and context)
  const isOptionsStyle = 'config' in options || 'context' in options;
  const config = isOptionsStyle
    ? (options as CreateLoggerOptions).config || {}
    : (options as Partial<LoggerConfig>);
  const initialContext = isOptionsStyle ? (options as CreateLoggerOptions).context : undefined;

  const state: LoggerState = {
    config: {
      level: 'info',
      format: 'pretty',
      includeTimestamp: true,
      includeContext: true,
      colors: true,
      ...config,
    },
    context: initialContext,
  };

  /**
   * Check if a log level should be output
   */
  const shouldLog = (level: LogLevel): boolean => {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[state.config.level];
  };

  /**
   * Create a log entry
   */
  const createLogEntry = (
    level: LogLevel,
    message: string,
    error?: Error,
    additionalContext?: Record<string, unknown>
  ): LogEntry => {
    const entry: LogEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      message,
      module: state.context?.module,
      function: state.context?.function,
    };

    // Merge contexts
    if (state.config.includeContext) {
      entry.context = { ...state.context, ...additionalContext };
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
  };

  /**
   * Format a log entry for output
   */
  const formatEntry = (entry: LogEntry): string => {
    switch (state.config.format) {
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
        if (state.config.includeTimestamp) {
          const time = new Date(entry.timestamp).toLocaleTimeString();
          parts.push(chalk.gray(time));
        }

        // Level symbol and name
        const colorFn = state.config.colors ? LEVEL_COLORS[entry.level] : (s: string) => s;
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
  };

  /**
   * Internal logging method
   */
  const logInternal = (
    level: LogLevel,
    message: string,
    error?: Error,
    additionalContext?: Record<string, any>
  ): void => {
    if (!shouldLog(level)) {
      return;
    }

    const entry = createLogEntry(level, message, error, additionalContext);
    const formatted = formatEntry(entry);

    // Output to appropriate stream
    if (level === 'error') {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  };

  /**
   * Create a child logger with additional context
   */
  const child = (context: Record<string, unknown>): Logger => {
    return createLogger({
      config: state.config,
      context: { ...state.context, ...context },
    });
  };

  /**
   * Create a logger for a specific module
   */
  const module = (moduleName: string): Logger => {
    return child({ module: moduleName });
  };

  /**
   * Set the log level
   */
  const setLevel = (level: LogLevel): void => {
    state.config.level = level;
  };

  /**
   * Update logger configuration
   */
  const updateConfig = (config: Partial<LoggerConfig>): void => {
    state.config = { ...state.config, ...config };
  };

  /**
   * Debug level logging
   */
  const debug = (message: string, context?: Record<string, unknown>): void => {
    logInternal('debug', message, undefined, context);
  };

  /**
   * Info level logging
   */
  const info = (message: string, context?: Record<string, unknown>): void => {
    logInternal('info', message, undefined, context);
  };

  /**
   * Warning level logging
   */
  const warn = (message: string, context?: Record<string, unknown>): void => {
    logInternal('warn', message, undefined, context);
  };

  /**
   * Error level logging
   */
  const error = (message: string, errorObj?: Error, context?: Record<string, unknown>): void => {
    logInternal('error', message, errorObj, context);
  };

  /**
   * Log function execution with timing
   */
  const time = async <T>(
    fn: () => Promise<T>,
    label: string,
    context?: Record<string, unknown>
  ): Promise<T> => {
    const start = Date.now();
    debug(`Starting ${label}`, context);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      info(`Completed ${label}`, { ...context, duration: `${duration}ms` });
      return result;
    } catch (caughtError) {
      const duration = Date.now() - start;
      error(`Failed ${label}`, caughtError as Error, { ...context, duration: `${duration}ms` });
      throw caughtError;
    }
  };

  /**
   * Log function execution (sync) with timing
   */
  const timeSync = <T>(fn: () => T, label: string, context?: Record<string, unknown>): T => {
    const start = Date.now();
    debug(`Starting ${label}`, context);

    try {
      const result = fn();
      const duration = Date.now() - start;
      info(`Completed ${label}`, { ...context, duration: `${duration}ms` });
      return result;
    } catch (caughtError) {
      const duration = Date.now() - start;
      error(`Failed ${label}`, caughtError as Error, { ...context, duration: `${duration}ms` });
      throw caughtError;
    }
  };

  return {
    child,
    module,
    setLevel,
    updateConfig,
    debug,
    info,
    warn,
    error,
    time,
    timeSync,
  };
}

// Default logger instance
export const logger = createLogger();

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

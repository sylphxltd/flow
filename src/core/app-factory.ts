/**
 * Application Factory - 應用工廠
 * Feature-first, composable, functional architecture
 */

import type { CommandOptions } from '../types/cli.types.js';
import { setupGlobalErrorHandlers } from './error-handling.js';
import { logger } from '../utils/logger.js';

/**
 * Application interface
 */
export interface Application {
  name: string;
  version: string;
  start(options?: CommandOptions): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

/**
 * Application configuration
 */
export interface AppConfig {
  name: string;
  version: string;
  description?: string;
  commands?: Map<string, CommandHandler>;
  middleware?: Middleware[];
  plugins?: Plugin[];
}

/**
 * Command handler
 */
export type CommandHandler = (options: CommandOptions) => Promise<void>;

/**
 * Middleware interface
 */
export interface Middleware {
  name: string;
  before?: (options: CommandOptions) => Promise<void>;
  after?: (result: unknown, options: CommandOptions) => Promise<void>;
  onError?: (error: Error, options: CommandOptions) => Promise<void>;
}

/**
 * Plugin interface
 */
export interface Plugin {
  name: string;
  version: string;
  install(app: Application): Promise<void>;
  uninstall?(app: Application): Promise<void>;
}

/**
 * Base application implementation
 */
export class BaseApplication implements Application {
  public readonly name: string;
  public readonly version: string;
  private running = false;
  private commands = new Map<string, CommandHandler>();
  private middleware: Middleware[] = [];
  private plugins = new Set<Plugin>();

  constructor(config: AppConfig) {
    this.name = config.name;
    this.version = config.version;

    // Setup global error handling
    setupGlobalErrorHandlers();

    // Register commands
    if (config.commands) {
      for (const [name, handler] of config.commands) {
        this.commands.set(name, handler);
      }
    }

    // Register middleware
    if (config.middleware) {
      this.middleware.push(...config.middleware);
    }

    // Install plugins
    if (config.plugins) {
      for (const plugin of config.plugins) {
        void this.installPlugin(plugin);
      }
    }

    logger.info('Application initialized', {
      name: this.name,
      version: this.version,
      commands: this.commands.size,
      middleware: this.middleware.length,
      plugins: config.plugins?.length || 0,
    });
  }

  async start(options?: CommandOptions): Promise<void> {
    if (this.running) {
      logger.warn('Application is already running');
      return;
    }

    logger.info('Starting application', { options });

    try {
      // Execute before middleware
      for (const middleware of this.middleware) {
        if (middleware.before && options) {
          await middleware.before(options);
        }
      }

      // Execute command if specified
      if (options?.command && this.commands.has(options.command)) {
        const handler = this.commands.get(options.command)!;
        await handler(options);
      }

      this.running = true;
      logger.info('Application started successfully');

    } catch (error) {
      // Execute error middleware
      for (const middleware of this.middleware) {
        if (middleware.onError && options) {
          await middleware.onError(error instanceof Error ? error : new Error(String(error)), options);
        }
      }
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.running) {
      logger.warn('Application is not running');
      return;
    }

    logger.info('Stopping application');

    // Uninstall plugins
    for (const plugin of this.plugins) {
      if (plugin.uninstall) {
        await plugin.uninstall(this);
      }
    }

    this.running = false;
    logger.info('Application stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  registerCommand(name: string, handler: CommandHandler): void {
    this.commands.set(name, handler);
    logger.debug('Command registered', { name });
  }

  unregisterCommand(name: string): boolean {
    const result = this.commands.delete(name);
    if (result) {
      logger.debug('Command unregistered', { name });
    }
    return result;
  }

  addMiddleware(middleware: Middleware): void {
    this.middleware.push(middleware);
    logger.debug('Middleware added', { name: middleware.name });
  }

  removeMiddleware(name: string): boolean {
    const index = this.middleware.findIndex(m => m.name === name);
    if (index > -1) {
      this.middleware.splice(index, 1);
      logger.debug('Middleware removed', { name });
      return true;
    }
    return false;
  }

  async installPlugin(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin)) {
      logger.warn('Plugin already installed', { name: plugin.name });
      return;
    }

    await plugin.install(this);
    this.plugins.add(plugin);
    logger.info('Plugin installed', { name: plugin.name, version: plugin.version });
  }

  async uninstallPlugin(plugin: Plugin): Promise<void> {
    if (!this.plugins.has(plugin)) {
      logger.warn('Plugin not installed', { name: plugin.name });
      return;
    }

    if (plugin.uninstall) {
      await plugin.uninstall(this);
    }
    this.plugins.delete(plugin);
    logger.info('Plugin uninstalled', { name: plugin.name });
  }

  getCommands(): string[] {
    return Array.from(this.commands.keys());
  }

  getMiddleware(): string[] {
    return this.middleware.map(m => m.name);
  }

  getPlugins(): Array<{ name: string; version: string }> {
    return Array.from(this.plugins).map(p => ({ name: p.name, version: p.version }));
  }
}

/**
 * Built-in middleware - moved before factory to fix hoisting
 */

const loggingMiddleware: Middleware = {
  name: 'logging',
  before: async (options: CommandOptions) => {
    logger.debug('Executing command', { command: options.command, options });
  },
  after: async (result, options: CommandOptions) => {
    logger.debug('Command completed', { command: options.command, result });
  },
  onError: async (error, options: CommandOptions) => {
    logger.error('Command failed', { command: options.command, error: error.message });
  },
};

const validationMiddleware: Middleware = {
  name: 'validation',
  before: async (options: CommandOptions) => {
    // Basic validation
    if (options.command && typeof options.command !== 'string') {
      throw new Error('Command must be a string');
    }

    if (options.concurrency && (typeof options.concurrency !== 'number' || options.concurrency < 1)) {
      throw new Error('Concurrency must be a positive number');
    }

    if (options.delay && (typeof options.delay !== 'number' || options.delay < 0)) {
      throw new Error('Delay must be a non-negative number');
    }
  },
};

const corsMiddleware: Middleware = {
  name: 'cors',
  before: async (options: CommandOptions) => {
    // CORS headers would be set here for web applications
    logger.debug('CORS middleware applied');
  },
};

/**
 * Application factory
 */
export class ApplicationFactory {
  private static defaultConfig: Partial<AppConfig> = {
    middleware: [
      loggingMiddleware,
      validationMiddleware,
    ],
  };

  static create(config: AppConfig): Application {
    const finalConfig = {
      ...this.defaultConfig,
      ...config,
    };

    return new BaseApplication(finalConfig);
  }

  static createCLIApp(config: Omit<AppConfig, 'name' | 'version'> & {
    name: string;
    version: string;
  }): Application {
    return this.create({
      ...config,
      commands: config.commands || new Map(),
    });
  }

  static createWebApp(config: Omit<AppConfig, 'name' | 'version'> & {
    name: string;
    version: string;
  }): Application {
    return this.create({
      ...config,
      middleware: [
        loggingMiddleware,
        validationMiddleware,
        corsMiddleware,
      ],
      ...config,
    });
  }
}

/**
 * Common plugins
 */

export const LoggingPlugin: Plugin = {
  name: 'logging',
  version: '1.0.0',
  async install(app: Application): Promise<void> {
    logger.info('Logging plugin installed');
    // Additional logging setup could go here
  },
};

export const StoragePlugin: Plugin = {
  name: 'storage',
  version: '1.0.0',
  async install(app: Application): Promise<void> {
    // Initialize storage systems
    logger.info('Storage plugin installed');
  },
};

export const CachePlugin: Plugin = {
  name: 'cache',
  version: '1.0.0',
  async install(app: Application): Promise<void> {
    // Initialize cache systems
    logger.info('Cache plugin installed');
  },
};

/**
 * Utility functions
 */

export const CommandUtils = {
  registerCommands(app: Application, commands: Record<string, CommandHandler>): void {
    for (const [name, handler] of Object.entries(commands)) {
      app.registerCommand(name, handler);
    }
  },

  createCommandHandler(
    handler: (options: CommandOptions) => Promise<void>,
    options?: {
      name?: string;
      description?: string;
      validate?: (options: CommandOptions) => boolean;
      transform?: (options: CommandOptions) => CommandOptions;
    }
  ): CommandHandler {
    return async (opts: CommandOptions): Promise<void> => {
      // Validate
      if (options?.validate && !options.validate(opts)) {
        throw new Error(`Validation failed for command: ${options.name || 'unknown'}`);
      }

      // Transform
      const finalOpts = options?.transform ? options.transform(opts) : opts;

      // Execute
      await handler(finalOpts);
    };
  },
} as const;
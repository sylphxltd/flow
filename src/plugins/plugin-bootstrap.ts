/**
 * Plugin Bootstrap System
 *
 * Integrates the plugin system with the main application
 * and provides a unified interface for plugin management
 */

import { PluginManager } from './plugin-manager.js';
import { configureServices } from '../core/service-config.js';
import type { DIContainer } from '../core/di-container.js';
import type { ILogger } from '../core/interfaces.js';
import { container } from '../core/di-container.js';

export interface PluginBootstrapConfig {
  pluginDir?: string;
  configFile?: string;
  autoStart?: boolean;
  plugins?: string[];
  disabledPlugins?: string[];
  enableHotReload?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export class PluginBootstrap {
  private pluginManager?: PluginManager;
  private logger?: ILogger;
  private isStarted = false;

  constructor(private readonly config: PluginBootstrapConfig = {}) {
    this.config = {
      pluginDir: './plugins',
      configFile: './plugins/config.json',
      autoStart: true,
      enableHotReload: false,
      logLevel: 'info',
      ...config,
    };
  }

  /**
   * Bootstrap the entire plugin system
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    try {
      // Configure services
      await configureServices();

      // Get logger
      this.logger = await container.resolve<ILogger>('logger');

      // Create plugin manager
      this.pluginManager = new PluginManager(this.logger, container, {
        pluginDir: this.config.pluginDir,
        autoLoad: this.config.autoStart,
        enableHotReload: this.config.enableHotReload,
        configPath: this.config.configFile,
      });

      // Initialize plugin manager
      await this.pluginManager.initialize();

      // Register built-in plugins
      await this.registerBuiltinPlugins();

      // Load external plugins
      await this.loadExternalPlugins();

      // Enable/disable plugins based on config
      await this.configurePlugins();

      this.isStarted = true;
      this.logger?.info('Plugin bootstrap completed successfully');

      // Log plugin statistics
      const stats = this.pluginManager.getStats();
      this.logger?.info('Plugin statistics:', stats);
    } catch (error) {
      this.logger?.error('Plugin bootstrap failed', error);
      throw error;
    }
  }

  /**
   * Stop the plugin system
   */
  async stop(): Promise<void> {
    if (!this.isStarted || !this.pluginManager) {
      return;
    }

    try {
      await this.pluginManager.dispose();
      await container.dispose();
      this.isStarted = false;
      this.logger?.info('Plugin system stopped');
    } catch (error) {
      this.logger?.error('Failed to stop plugin system', error);
      throw error;
    }
  }

  /**
   * Get the plugin manager instance
   */
  getPluginManager(): PluginManager | undefined {
    return this.pluginManager;
  }

  /**
   * Get the DI container
   */
  getContainer(): DIContainer {
    return container;
  }

  /**
   * Check if the system is started
   */
  isRunning(): boolean {
    return this.isStarted;
  }

  /**
   * Get system status
   */
  async getStatus(): Promise<{
    running: boolean;
    plugins: {
      total: number;
      enabled: number;
      disabled: number;
      byCategory: Record<string, number>;
    };
    services: number;
    health: Record<string, boolean>;
  }> {
    if (!this.pluginManager) {
      return {
        running: false,
        plugins: { total: 0, enabled: 0, disabled: 0, byCategory: {} },
        services: 0,
        health: {},
      };
    }

    const pluginStats = this.pluginManager.getStats();
    const pluginHealth = await this.pluginManager.healthCheck();

    // Count registered services
    const serviceTokens = [
      'logger',
      'config',
      'database',
      'memoryStorage',
      'searchService',
      'targetManager',
      'embeddingProvider',
    ];
    const serviceCount = serviceTokens.filter((token) => container.isRegistered(token)).length;

    return {
      running: this.isStarted,
      plugins: pluginStats,
      services: serviceCount,
      health: pluginHealth,
    };
  }

  /**
   * Register built-in plugins
   */
  private async registerBuiltinPlugins(): Promise<void> {
    if (!this.pluginManager) { return; }

    try {
      // Import and register memory MCP plugin
      const { MemoryMCPPlugin } = await import('./examples/memory-mcp-plugin.js');
      const memoryPlugin = new MemoryMCPPlugin();
      await this.pluginManager.registerPlugin(memoryPlugin);

      this.logger?.info('Built-in plugins registered');
    } catch (error) {
      this.logger?.warn('Failed to register built-in plugins', error);
    }
  }

  /**
   * Load external plugins
   */
  private async loadExternalPlugins(): Promise<void> {
    if (!this.pluginManager) { return; }

    try {
      // Discover and load plugins from directory
      const results = await this.pluginManager.discoverAndLoadPlugins();

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      if (successful.length > 0) {
        this.logger?.info(`Loaded ${successful.length} external plugins`);
      }

      if (failed.length > 0) {
        this.logger?.warn(`${failed.length} plugins failed to load`, {
          failed: failed.map((f) => ({ path: f.error, error: f.error })),
        });
      }
    } catch (error) {
      this.logger?.warn('Failed to load external plugins', error);
    }
  }

  /**
   * Configure plugins based on bootstrap config
   */
  private async configurePlugins(): Promise<void> {
    if (!this.pluginManager) { return; }

    try {
      const { plugins: enabledPlugins, disabledPlugins } = this.config;

      // Enable specific plugins
      if (enabledPlugins && enabledPlugins.length > 0) {
        for (const pluginName of enabledPlugins) {
          try {
            await this.pluginManager.enablePlugin(pluginName);
            this.logger?.debug(`Plugin enabled: ${pluginName}`);
          } catch (error) {
            this.logger?.warn(`Failed to enable plugin: ${pluginName}`, error);
          }
        }
      }

      // Disable specific plugins
      if (disabledPlugins && disabledPlugins.length > 0) {
        for (const pluginName of disabledPlugins) {
          try {
            await this.pluginManager.disablePlugin(pluginName);
            this.logger?.debug(`Plugin disabled: ${pluginName}`);
          } catch (error) {
            this.logger?.warn(`Failed to disable plugin: ${pluginName}`, error);
          }
        }
      }
    } catch (error) {
      this.logger?.warn('Failed to configure plugins', error);
    }
  }
}

/**
 * Global plugin bootstrap instance
 */
let globalPluginBootstrap: PluginBootstrap | null = null;

/**
 * Initialize the global plugin system
 */
export async function initializePlugins(config?: PluginBootstrapConfig): Promise<PluginBootstrap> {
  if (globalPluginBootstrap) {
    return globalPluginBootstrap;
  }

  globalPluginBootstrap = new PluginBootstrap(config);
  await globalPluginBootstrap.start();
  return globalPluginBootstrap;
}

/**
 * Get the global plugin bootstrap instance
 */
export function getPluginBootstrap(): PluginBootstrap | null {
  return globalPluginBootstrap;
}

/**
 * Shutdown the global plugin system
 */
export async function shutdownPlugins(): Promise<void> {
  if (globalPluginBootstrap) {
    await globalPluginBootstrap.stop();
    globalPluginBootstrap = null;
  }
}

/**
 * Convenience function to get a plugin
 */
export async function getPlugin<T = any>(pluginName: string): Promise<T | undefined> {
  const bootstrap = getPluginBootstrap();
  if (!bootstrap) {
    throw new Error('Plugin system not initialized. Call initializePlugins() first.');
  }

  const pluginManager = bootstrap.getPluginManager();
  if (!pluginManager) {
    throw new Error('Plugin manager not available');
  }

  const plugin = pluginManager.getPlugin(pluginName);
  return plugin as T;
}

/**
 * Convenience function to get a service
 */
export async function getService<T = any>(serviceName: string): Promise<T> {
  const bootstrap = getPluginBootstrap();
  if (!bootstrap) {
    throw new Error('Plugin system not initialized. Call initializePlugins() first.');
  }

  return await bootstrap.getContainer().resolve<T>(serviceName);
}

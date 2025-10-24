/**
 * Plugin Manager
 *
 * Manages loading, initialization, and lifecycle of plugins
 * with dependency injection and hot reloading support
 */

import type { ILogger } from '../core/interfaces.js';
import type { DIContainer } from '../core/di-container.js';

export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  dependencies?: string[];
  optionalDependencies?: string[];
  enabled: boolean;
  priority: number; // Lower number = higher priority
  category: 'mcp' | 'storage' | 'search' | 'utility';
}

export interface Plugin {
  metadata: PluginMetadata;
  initialize?(container: DIContainer): Promise<void>;
  dispose?(): Promise<void>;
  healthCheck?(): Promise<{ healthy: boolean; error?: string }>;
  onEnable?(): Promise<void>;
  onDisable?(): Promise<void>;
  onConfigChange?(config: any): Promise<void>;
}

export interface PluginLoadResult {
  plugin: Plugin;
  success: boolean;
  error?: string;
  loadTime: number;
}

export interface PluginRegistry {
  [pluginName: string]: Plugin;
}

export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private pluginConfigs = new Map<string, any>();
  private loadOrder: string[] = [];
  private isInitialized = false;

  constructor(
    private readonly logger: ILogger,
    private readonly container: DIContainer,
    private readonly config: {
      pluginDir?: string;
      autoLoad?: boolean;
      enableHotReload?: boolean;
      configPath?: string;
    } = {}
  ) {}

  /**
   * Initialize the plugin manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.loadPluginConfigs();

      if (this.config.autoLoad) {
        await this.discoverAndLoadPlugins();
      }

      await this.initializePlugins();

      this.isInitialized = true;
      this.logger.info('Plugin manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize plugin manager', error);
      throw error;
    }
  }

  /**
   * Register a plugin
   */
  async registerPlugin(plugin: Plugin): Promise<void> {
    try {
      // Validate plugin metadata
      this.validatePlugin(plugin);

      // Check dependencies
      await this.checkDependencies(plugin);

      // Register plugin
      this.plugins.set(plugin.metadata.name, plugin);
      this.updateLoadOrder();

      this.logger.info(`Plugin registered: ${plugin.metadata.name} v${plugin.metadata.version}`);
    } catch (error) {
      this.logger.error(`Failed to register plugin: ${plugin.metadata.name}`, error);
      throw error;
    }
  }

  /**
   * Load a plugin from file path
   */
  async loadPlugin(pluginPath: string): Promise<PluginLoadResult> {
    const startTime = Date.now();

    try {
      // Dynamic import plugin
      const module = await import(pluginPath);
      const PluginClass = module.default || module.Plugin;

      if (!PluginClass) {
        throw new Error(`No default export found in ${pluginPath}`);
      }

      // Get plugin config
      const config = this.getPluginConfig(PluginClass.name);

      // Create plugin instance
      const plugin = new PluginClass(config);

      // Register plugin
      await this.registerPlugin(plugin);

      const loadTime = Date.now() - startTime;

      return {
        plugin,
        success: true,
        loadTime,
      };
    } catch (error) {
      const loadTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to load plugin from ${pluginPath}`, error);

      return {
        plugin: {} as Plugin,
        success: false,
        error: errorMessage,
        loadTime,
      };
    }
  }

  /**
   * Discover and load plugins from directory
   */
  async discoverAndLoadPlugins(): Promise<PluginLoadResult[]> {
    const pluginDir = this.config.pluginDir || './plugins';
    const results: PluginLoadResult[] = [];

    try {
      const { asyncFileOps } = await import('../utils/async-file-operations.js');

      // Check if plugin directory exists
      if (!(await asyncFileOps.exists(pluginDir))) {
        this.logger.warn(`Plugin directory not found: ${pluginDir}`);
        return results;
      }

      // Read plugin directory
      const entries = await asyncFileOps.readDir(pluginDir);

      for (const entry of entries) {
        if (entry.isFile && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
          const pluginPath = `${pluginDir}/${entry.name}`;
          const result = await this.loadPlugin(pluginPath);
          results.push(result);
        }
      }

      this.logger.info(`Discovered and loaded ${results.filter(r => r.success).length} plugins`);
      return results;
    } catch (error) {
      this.logger.error('Failed to discover plugins', error);
      return results;
    }
  }

  /**
   * Initialize all registered plugins
   */
  async initializePlugins(): Promise<void> {
    const errors: Array<{ plugin: string; error: string }> = [];

    for (const pluginName of this.loadOrder) {
      const plugin = this.plugins.get(pluginName);

      if (!plugin || !plugin.metadata.enabled) {
        continue;
      }

      try {
        if (plugin.initialize) {
          await plugin.initialize(this.container);
        }

        if (plugin.onEnable) {
          await plugin.onEnable();
        }

        this.logger.info(`Plugin initialized: ${pluginName}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ plugin: pluginName, error: errorMessage });
        this.logger.error(`Failed to initialize plugin: ${pluginName}`, error);
      }
    }

    if (errors.length > 0) {
      this.logger.warn(`${errors.length} plugins failed to initialize`, { errors });
    }
  }

  /**
   * Get a plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by category
   */
  getPluginsByCategory(category: string): Plugin[] {
    return Array.from(this.plugins.values()).filter(
      plugin => plugin.metadata.category === category
    );
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);

    if (!plugin) {
      throw new Error(`Plugin not found: ${name}`);
    }

    if (plugin.metadata.enabled) {
      return;
    }

    try {
      plugin.metadata.enabled = true;

      if (plugin.initialize && !this.isInitialized) {
        await plugin.initialize(this.container);
      }

      if (plugin.onEnable) {
        await plugin.onEnable();
      }

      this.logger.info(`Plugin enabled: ${name}`);
    } catch (error) {
      plugin.metadata.enabled = false;
      this.logger.error(`Failed to enable plugin: ${name}`, error);
      throw error;
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);

    if (!plugin) {
      throw new Error(`Plugin not found: ${name}`);
    }

    if (!plugin.metadata.enabled) {
      return;
    }

    try {
      if (plugin.onDisable) {
        await plugin.onDisable();
      }

      plugin.metadata.enabled = false;
      this.logger.info(`Plugin disabled: ${name}`);
    } catch (error) {
      this.logger.error(`Failed to disable plugin: ${name}`, error);
      throw error;
    }
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);

    if (!plugin) {
      return;
    }

    try {
      // Disable plugin first
      if (plugin.metadata.enabled) {
        await this.disablePlugin(name);
      }

      // Dispose plugin
      if (plugin.dispose) {
        await plugin.dispose();
      }

      // Remove from registry
      this.plugins.delete(name);
      this.updateLoadOrder();

      this.logger.info(`Plugin unregistered: ${name}`);
    } catch (error) {
      this.logger.error(`Failed to unregister plugin: ${name}`, error);
      throw error;
    }
  }

  /**
   * Reload a plugin
   */
  async reloadPlugin(name: string): Promise<void> {
    // This would require tracking plugin paths for hot reloading
    // For now, just disable and re-enable
    await this.disablePlugin(name);
    await this.enablePlugin(name);
  }

  /**
   * Perform health check on all plugins
   */
  async healthCheck(): Promise<{ [pluginName: string]: { healthy: boolean; error?: string } }> {
    const results: { [pluginName: string]: { healthy: boolean; error?: string } } = {};

    for (const [name, plugin] of this.plugins) {
      if (!plugin.metadata.enabled || !plugin.healthCheck) {
        results[name] = { healthy: true };
        continue;
      }

      try {
        const result = await plugin.healthCheck();
        results[name] = result;
      } catch (error) {
        results[name] = {
          healthy: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return results;
  }

  /**
   * Get plugin statistics
   */
  getStats() {
    const plugins = Array.from(this.plugins.values());
    const enabled = plugins.filter(p => p.metadata.enabled);
    const byCategory = plugins.reduce((acc, plugin) => {
      acc[plugin.metadata.category] = (acc[plugin.metadata.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: plugins.length,
      enabled: enabled.length,
      disabled: plugins.length - enabled.length,
      byCategory,
      loadOrder: this.loadOrder,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Dispose all plugins
   */
  async dispose(): Promise<void> {
    const disposePromises = Array.from(this.plugins.values()).map(async (plugin) => {
      try {
        if (plugin.dispose) {
          await plugin.dispose();
        }
      } catch (error) {
        this.logger.error(`Error disposing plugin: ${plugin.metadata.name}`, error);
      }
    });

    await Promise.all(disposePromises);

    this.plugins.clear();
    this.pluginConfigs.clear();
    this.loadOrder = [];
    this.isInitialized = false;

    this.logger.info('Plugin manager disposed');
  }

  /**
   * Validate plugin metadata
   */
  private validatePlugin(plugin: Plugin): void {
    const { metadata } = plugin;

    if (!metadata.name || typeof metadata.name !== 'string') {
      throw new Error('Plugin must have a valid name');
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      throw new Error('Plugin must have a valid version');
    }

    if (!metadata.description || typeof metadata.description !== 'string') {
      throw new Error('Plugin must have a valid description');
    }

    if (typeof metadata.enabled !== 'boolean') {
      throw new Error('Plugin metadata must specify enabled status');
    }

    if (typeof metadata.priority !== 'number') {
      throw new Error('Plugin metadata must specify priority');
    }

    const validCategories = ['mcp', 'storage', 'search', 'utility'];
    if (!validCategories.includes(metadata.category)) {
      throw new Error(`Plugin category must be one of: ${validCategories.join(', ')}`);
    }
  }

  /**
   * Check plugin dependencies
   */
  private async checkDependencies(plugin: Plugin): Promise<void> {
    const { dependencies = [], optionalDependencies = [] } = plugin.metadata;

    // Check required dependencies
    for (const dep of dependencies) {
      if (!this.plugins.has(dep)) {
        throw new Error(`Missing required dependency: ${dep}`);
      }
    }

    // Log optional dependencies that are missing
    for (const dep of optionalDependencies) {
      if (!this.plugins.has(dep)) {
        this.logger.warn(`Optional dependency not found: ${dep} for plugin: ${plugin.metadata.name}`);
      }
    }
  }

  /**
   * Update plugin load order based on priorities
   */
  private updateLoadOrder(): void {
    this.loadOrder = Array.from(this.plugins.entries())
      .sort(([, a], [, b]) => a.metadata.priority - b.metadata.priority)
      .map(([name]) => name);
  }

  /**
   * Load plugin configurations
   */
  private async loadPluginConfigs(): Promise<void> {
    const configPath = this.config.configPath || './plugins/config.json';

    try {
      const { asyncFileOps } = await import('../utils/async-file-operations.js');

      if (await asyncFileOps.exists(configPath)) {
        const configContent = await asyncFileOps.readFile(configPath);
        const configs = JSON.parse(configContent as string);

        for (const [pluginName, config] of Object.entries(configs)) {
          this.pluginConfigs.set(pluginName, config);
        }

        this.logger.info(`Loaded plugin configurations from ${configPath}`);
      }
    } catch (error) {
      this.logger.warn('Failed to load plugin configurations', error);
    }
  }

  /**
   * Get configuration for a plugin
   */
  private getPluginConfig(pluginName: string): any {
    return this.pluginConfigs.get(pluginName) || {};
  }
}
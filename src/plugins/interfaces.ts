/**
 * Plugin Interfaces and Base Classes
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DIContainer } from '../core/di-container.js';
import type { ILogger } from '../core/interfaces.js';
import type { PluginMetadata } from './plugin-manager.js';

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  [key: string]: unknown;
}

/**
 * Storage plugin interface
 */
export interface IStoragePlugin {
  /**
   * Initialize storage
   */
  initializeStorage(): Promise<void>;

  /**
   * Get storage capabilities
   */
  getCapabilities(): {
    supportsNamespaces: boolean;
    supportsVersioning: boolean;
    supportsEncryption: boolean;
    maxSize?: number;
    supportedFormats?: string[];
  };

  /**
   * Store data
   */
  store(key: string, value: unknown, options?: StorageOptions): Promise<void>;

  /**
   * Retrieve data
   */
  retrieve(key: string, options?: StorageOptions): Promise<unknown>;

  /**
   * Delete data
   */
  delete(key: string, options?: StorageOptions): Promise<void>;

  /**
   * List keys
   */
  list(options?: StorageOptions): Promise<string[]>;
}

/**
 * Storage options
 */
export interface StorageOptions {
  namespace?: string;
  version?: string;
  encrypt?: boolean;
  format?: string;
  [key: string]: unknown;
}

/**
 * Search content interface
 */
export interface SearchContent {
  id: string;
  text: string;
  type: string;
  metadata?: Record<string, unknown>;
}

/**
 * Search result interface
 */
export interface SearchResultItem {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * Search options interface
 */
export interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  fuzzy?: boolean;
  semantic?: boolean;
}

/**
 * Search plugin interface
 */
export interface ISearchPlugin {
  /**
   * Initialize search engine
   */
  initializeSearch(): Promise<void>;

  /**
   * Index content
   */
  index(content: SearchContent, metadata?: Record<string, unknown>): Promise<void>;

  /**
   * Search content
   */
  search(query: string, options?: SearchOptions): Promise<SearchResultItem[]>;

  /**
   * Get search capabilities
   */
  getCapabilities(): {
    supportedContentTypes: string[];
    supportsFuzzySearch: boolean;
    supportsSemanticSearch: boolean;
    maxResults?: number;
  };
}

/**
 * Base Plugin Class
 *
 * All plugins should extend this class
 */
export abstract class BasePlugin {
  protected logger?: ILogger;
  protected config: PluginConfig;

  constructor(config: PluginConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize the plugin with DI container
   */
  async initialize(container: DIContainer): Promise<void> {
    this.logger = await container.resolve<ILogger>('logger');
    await this.onInitialize();
  }

  /**
   * Plugin-specific initialization logic
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * Plugin metadata
   */
  abstract get metadata(): PluginMetadata;

  /**
   * Cleanup when plugin is disposed
   */
  async dispose(): Promise<void> {
    await this.onDispose();
  }

  /**
   * Plugin-specific cleanup logic
   */
  protected async onDispose(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Called when plugin is enabled
   */
  async onEnable(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Called when plugin is disabled
   */
  async onDisable(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Health check implementation
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      return await this.onHealthCheck();
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Plugin-specific health check
   */
  protected async onHealthCheck(): Promise<{ healthy: boolean; error?: string }> {
    return { healthy: true };
  }

  /**
   * Handle configuration changes
   */
  async onConfigChange(config: PluginConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.onConfigurationChanged();
  }

  /**
   * Plugin-specific configuration change handling
   */
  protected async onConfigurationChanged(): Promise<void> {
    // Override in subclasses
  }
}

/**
 * MCP Tool Plugin Interface
 */
export interface IMCPToolPlugin {
  /**
   * Register tools with MCP server
   */
  registerTools(server: McpServer): Promise<void>;

  /**
   * Get list of tool names this plugin provides
   */
  getToolNames(): string[];

  /**
   * Get tool schema information
   */
  getToolSchemas(): Record<string, any>;
}

/**
 * MCP Tool Plugin Base Class
 */
export abstract class MCPToolPlugin extends BasePlugin implements IMCPToolPlugin {
  /**
   * Register tools with MCP server
   */
  abstract registerTools(server: McpServer): Promise<void>;

  /**
   * Get list of tool names
   */
  abstract getToolNames(): string[];

  /**
   * Get tool schemas
   */
  getToolSchemas(): Record<string, any> {
    return {};
  }

  /**
   * Helper method to create tool handler with error handling
   */
  protected createToolHandler<T = any>(
    handler: (args: T) => Promise<any>,
    options: {
      name: string;
      description?: string;
      timeout?: number;
    }
  ) {
    const { name, description, timeout = 30000 } = options;

    return async (args: T) => {
      const startTime = Date.now();

      try {
        this.logger?.debug(`Executing tool: ${name}`, { args });

        // Add timeout
        const result = await Promise.race([
          handler(args),
          new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error(`Tool ${name} timed out after ${timeout}ms`)),
              timeout
            );
          }),
        ]);

        const duration = Date.now() - startTime;
        this.logger?.debug(`Tool completed: ${name} in ${duration}ms`);

        return {
          success: true,
          data: result,
          metadata: {
            tool: name,
            duration,
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        this.logger?.error(`Tool failed: ${name} after ${duration}ms`, error);

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          metadata: {
            tool: name,
            duration,
            timestamp: new Date().toISOString(),
          },
        };
      }
    };
  }
}

/**
 * Storage Plugin Base Class
 */
export abstract class StoragePlugin extends BasePlugin implements IStoragePlugin {
  abstract initializeStorage(): Promise<void>;

  abstract getCapabilities(): {
    supportsNamespaces: boolean;
    supportsVersioning: boolean;
    supportsEncryption: boolean;
    maxSize?: number;
    supportedFormats?: string[];
  };

  abstract store(key: string, value: unknown, options?: StorageOptions): Promise<void>;

  abstract retrieve(key: string, options?: StorageOptions): Promise<unknown>;

  abstract delete(key: string, options?: StorageOptions): Promise<void>;

  abstract list(options?: StorageOptions): Promise<string[]>;

  protected async onInitialize(): Promise<void> {
    await this.initializeStorage();
  }
}

/**
 * Search Plugin Base Class
 */
export abstract class SearchPlugin extends BasePlugin implements ISearchPlugin {
  abstract initializeSearch(): Promise<void>;

  abstract index(content: SearchContent, metadata?: Record<string, unknown>): Promise<void>;

  abstract search(query: string, options?: SearchOptions): Promise<SearchResultItem[]>;

  abstract getCapabilities(): {
    supportedContentTypes: string[];
    supportsFuzzySearch: boolean;
    supportsSemanticSearch: boolean;
    maxResults?: number;
  };

  protected async onInitialize(): Promise<void> {
    await this.initializeSearch();
  }
}

/**
 * Function parameter interface
 */
export interface FunctionParameter {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  default?: unknown;
}

/**
 * Utility function metadata
 */
export interface UtilityFunctionMetadata {
  name: string;
  description: string;
  parameters?: FunctionParameter[];
  returnType?: string;
}

/**
 * Utility Plugin Interface
 */
export interface IUtilityPlugin {
  /**
   * Get utility functions
   */
  getUtilities(): Record<string, Function>;

  /**
   * Get utility metadata
   */
  getUtilityMetadata(): Record<string, UtilityFunctionMetadata>;
}

/**
 * Utility Plugin Base Class
 */
export abstract class UtilityPlugin extends BasePlugin implements IUtilityPlugin {
  abstract getUtilities(): Record<string, Function>;

  abstract getUtilityMetadata(): Record<string, UtilityFunctionMetadata>;

  /**
   * Helper method to register utilities with the container
   */
  async registerUtilities(container: DIContainer): Promise<void> {
    const utilities = this.getUtilities();
    const metadata = this.getUtilityMetadata();

    for (const [key, utility] of Object.entries(utilities)) {
      const utilMeta = metadata[key];
      if (utilMeta) {
        container.register(`utility.${key}`, () => utility, 'singleton');
        this.logger?.debug(`Registered utility: ${utilMeta.name}`);
      }
    }
  }
}

/**
 * Plugin factory for creating typed plugins
 */
export abstract class PluginFactory<T extends BasePlugin = BasePlugin> {
  abstract create(config?: PluginConfig): T;

  /**
   * Get plugin metadata
   */
  abstract getMetadata(): PluginMetadata;
}

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry {
  factory: PluginFactory;
  instance?: BasePlugin;
  loaded: boolean;
  enabled: boolean;
  config?: PluginConfig;
}

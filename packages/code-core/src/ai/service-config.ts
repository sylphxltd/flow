/**
 * Service configuration and registration for DI container
 */

import { targetManager } from '../ai/target-manager.js';
import { MemoryDatabaseClient } from '../db/memory-db.js';
import { createMCPService } from '../services/mcp-service.js';
import { getDefaultEmbeddingProvider } from '../services/search/embeddings.js';
import { getSearchService } from '../services/search/unified-search-service.js';
import { createLogger as createRealLogger } from '../utils/logger.js';
// Import concrete implementations (will be updated as we refactor)
import { SeparatedMemoryStorage } from '../utils/separated-storage.js';
import { container, SERVICE_TOKENS } from './di-container.js';
import type {
  IConfiguration,
  IDatabaseConnection,
  IEmbeddingProvider,
  ILogger,
  IMCPService,
  ISearchService,
  IStorage,
  ITargetManager,
} from './interfaces.js';

/**
 * Configure and register all core services with the DI container
 */
export async function configureServices(): Promise<void> {
  // Logger Service - Singleton
  container.register<ILogger>(SERVICE_TOKENS.LOGGER, () => createLogger(), 'singleton');

  // Configuration Service - Singleton
  container.register<IConfiguration>(
    SERVICE_TOKENS.CONFIG,
    () => createConfiguration(),
    'singleton'
  );

  // Database Connection - Singleton
  container.register<IDatabaseConnection>(
    SERVICE_TOKENS.DATABASE,
    async () => {
      const dbClient = new MemoryDatabaseClient();
      await dbClient.initialize();
      return dbClient;
    },
    'singleton'
  );

  // Memory Storage - Singleton
  container.register<IStorage>(
    SERVICE_TOKENS.MEMORY_STORAGE,
    async () => {
      const storage = new SeparatedMemoryStorage();
      await storage.initialize();
      return storage;
    },
    'singleton'
  );

  // Search Service - Singleton
  container.register<ISearchService>(
    SERVICE_TOKENS.SEARCH_SERVICE,
    async () => {
      const searchService = getSearchService();
      await searchService.initialize();
      return searchService;
    },
    'singleton'
  );

  // Target Manager - Singleton
  container.register<ITargetManager>(
    SERVICE_TOKENS.TARGET_MANAGER,
    () => targetManager,
    'singleton'
  );

  // Embedding Provider - Singleton (lazy initialization)
  container.register<IEmbeddingProvider>(
    SERVICE_TOKENS.EMBEDDING_PROVIDER,
    async () => {
      try {
        return await getDefaultEmbeddingProvider();
      } catch (_error) {
        // Return a fallback provider that doesn't require external dependencies
        return createFallbackEmbeddingProvider();
      }
    },
    'singleton'
  );

  // MCP Service - Transient (since it depends on target)
  container.register<IMCPService>(
    SERVICE_TOKENS.MCP_SERVICE,
    (targetId: string) => {
      const targetOption = targetManager.getTarget(targetId);
      if (targetOption._tag === 'None') {
        throw new Error(`Target not found: ${targetId}`);
      }

      const target = targetOption.value;
      return createMCPService({ target });
    },
    'transient'
  );
}

/**
 * Create a logger instance that adapts our Logger to the ILogger interface
 */
function createLogger(): ILogger {
  const logger = createRealLogger();

  return {
    info(message: string, ...args: any[]): void {
      // Merge args into context for structured logging
      const context = args.length > 0 ? { args } : undefined;
      logger.info(message, context);
    },

    warn(message: string, ...args: any[]): void {
      const context = args.length > 0 ? { args } : undefined;
      logger.warn(message, context);
    },

    error(message: string, error?: Error | unknown, ...args: any[]): void {
      const context = args.length > 0 ? { args } : undefined;
      if (error instanceof Error) {
        logger.error(message, error, context);
      } else {
        logger.error(message, undefined, { ...context, error });
      }
    },

    debug(message: string, ...args: any[]): void {
      const context = args.length > 0 ? { args } : undefined;
      logger.debug(message, context);
    },

    success(message: string, ...args: any[]): void {
      // Success is just info with different styling
      const context = args.length > 0 ? { args, level: 'success' } : { level: 'success' };
      logger.info(message, context);
    },
  };
}

/**
 * Create a configuration service
 */
function createConfiguration(): IConfiguration {
  const config = new Map<string, any>();

  // Load environment variables
  const loadEnvConfig = () => {
    config.set('env', process.env.NODE_ENV || 'development');
    config.set('debug', process.env.DEBUG === 'true');
    config.set('logLevel', process.env.LOG_LEVEL || 'info');
    config.set('databasePath', process.env.DATABASE_PATH || '.sylphx-flow/memory.db');
    config.set('embeddings.provider', process.env.EMBEDDINGS_PROVIDER || 'local');
    config.set(
      'embeddings.dimension',
      Number.parseInt(process.env.EMBEDDINGS_DIMENSION || '384', 10)
    );
  };

  loadEnvConfig();

  return {
    get<T = any>(key: string, defaultValue?: T): T {
      return config.get(key) ?? defaultValue;
    },

    getRequired<T = any>(key: string): T {
      const value = config.get(key);
      if (value === undefined) {
        throw new Error(`Required configuration key missing: ${key}`);
      }
      return value;
    },

    has(key: string): boolean {
      return config.has(key);
    },

    set(key: string, value: any): void {
      config.set(key, value);
    },

    async reload(): Promise<void> {
      config.clear();
      loadEnvConfig();
    },
  };
}

/**
 * Create a fallback embedding provider for when external providers are unavailable
 */
function createFallbackEmbeddingProvider(): IEmbeddingProvider {
  return {
    name: 'fallback-tfidf',
    async embed(text: string): Promise<number[]> {
      // Simple TF-IDF like fallback - just return a hash-based vector
      const words = text.toLowerCase().split(/\s+/);
      const vector = new Array(384).fill(0);

      // Create a simple hash-based embedding
      words.forEach((word, index) => {
        const hash = simpleHash(word);
        const index1 = hash % 384;
        const index2 = (hash * 2) % 384;
        vector[index1] = (index + 1) / words.length;
        vector[index2] = (index + 1) / (words.length * 2);
      });

      return vector;
    },

    async isAvailable(): Promise<boolean> {
      return true; // Always available as fallback
    },
  };
}

/**
 * Simple hash function for fallback embeddings
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a service from the container (convenience method)
 */
export async function getService<T>(token: string): Promise<T> {
  return await container.resolve<T>(token);
}

/**
 * Check if a service is registered (convenience method)
 */
export function hasService(token: string): boolean {
  return container.isRegistered(token);
}

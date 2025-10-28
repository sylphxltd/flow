/**
 * Simplified Memory Service
 *
 * A streamlined memory service that focuses on core functionality
 * without over-engineering. Uses the unified storage system.
 */

import type { StorageAdapter } from '../interfaces/unified-storage.js';
import { createValidationError, createDatabaseError, ErrorHandler } from '../utils/simplified-errors.js';
import { logger } from '../utils/logger.js';

/**
 * Memory entry interface
 */
export interface MemoryEntry {
  key: string;
  value: unknown;
  namespace?: string;
  timestamp: number;
}

/**
 * Memory search parameters
 */
export interface MemorySearchParams {
  query: string;
  namespace?: string;
  limit?: number;
}

/**
 * Simplified memory service configuration
 */
export interface SimplifiedMemoryServiceConfig {
  defaultNamespace?: string;
  maxEntrySize?: number;
}

/**
 * Simplified Memory Service
 *
 * Provides core memory operations without the complexity of caching,
 * cleanup timers, retention policies, and other over-engineered features.
 */
export class SimplifiedMemoryService {
  private readonly config: Required<SimplifiedMemoryServiceConfig>;

  constructor(
    private readonly storage: StorageAdapter,
    config: SimplifiedMemoryServiceConfig = {}
  ) {
    this.config = {
      defaultNamespace: config.defaultNamespace || 'default',
      maxEntrySize: config.maxEntrySize || 1024 * 1024, // 1MB default
    };

    logger.info('Simplified memory service initialized', {
      defaultNamespace: this.config.defaultNamespace,
      maxEntrySize: this.config.maxEntrySize,
    });
  }

  /**
   * Get a memory entry
   */
  async get(key: string, namespace?: string): Promise<MemoryEntry | null> {
    const fullKey = this.getFullKey(key, namespace);

    const result = await ErrorHandler.execute(async () => {
      const entry = await this.storage.get(fullKey);
      return entry as MemoryEntry | null;
    }, { operation: 'memory.get', key: fullKey });

    if (result.success) {
      logger.debug('Memory entry retrieved', { key: fullKey });
      return result.data;
    } else {
      logger.warn('Failed to retrieve memory entry', {
        key: fullKey,
        error: result.error.message
      });
      return null;
    }
  }

  /**
   * Set a memory entry
   */
  async set(
    key: string,
    value: unknown,
    namespace?: string
  ): Promise<void> {
    // Validate input
    this.validateKey(key);
    this.validateValue(value);

    const fullKey = this.getFullKey(key, namespace);
    const entry: MemoryEntry = {
      key,
      value,
      namespace: namespace || this.config.defaultNamespace,
      timestamp: Date.now(),
    };

    const result = await ErrorHandler.execute(async () => {
      await this.storage.set(fullKey, entry);
    }, { operation: 'memory.set', key: fullKey });

    if (result.success) {
      logger.debug('Memory entry stored', { key: fullKey });
    } else {
      throw createDatabaseError(
        `Failed to store memory entry: ${result.error.message}`,
        'set',
        fullKey
      );
    }
  }

  /**
   * Delete a memory entry
   */
  async delete(key: string, namespace?: string): Promise<boolean> {
    const fullKey = this.getFullKey(key, namespace);

    const result = await ErrorHandler.execute(async () => {
      return await this.storage.delete(fullKey);
    }, { operation: 'memory.delete', key: fullKey });

    if (result.success) {
      logger.debug('Memory entry deleted', { key: fullKey, deleted: result.data });
      return result.data;
    } else {
      logger.warn('Failed to delete memory entry', {
        key: fullKey,
        error: result.error.message
      });
      return false;
    }
  }

  /**
   * List all memory entries in a namespace
   */
  async list(namespace?: string, limit?: number): Promise<MemoryEntry[]> {
    const targetNamespace = namespace || this.config.defaultNamespace;

    const result = await ErrorHandler.execute(async () => {
      const keys = await this.storage.keys();
      const namespaceKeys = keys.filter(key =>
        key.startsWith(`${targetNamespace}:`)
      );

      // Get entries in parallel
      const entries = await Promise.all(
        namespaceKeys.map(async (key) => {
          const entry = await this.storage.get(key);
          return entry as MemoryEntry | null;
        })
      );

      return entries
        .filter((entry): entry is MemoryEntry => entry !== null)
        .slice(0, limit);
    }, { operation: 'memory.list', namespace: targetNamespace });

    if (result.success) {
      logger.debug('Memory entries listed', {
        namespace: targetNamespace,
        count: result.data.length
      });
      return result.data;
    } else {
      throw createDatabaseError(
        `Failed to list memory entries: ${result.error.message}`,
        'list'
      );
    }
  }

  /**
   * Search memory entries
   */
  async search(params: MemorySearchParams): Promise<MemoryEntry[]> {
    const { query, namespace, limit } = params;
    const targetNamespace = namespace || this.config.defaultNamespace;

    const result = await ErrorHandler.execute(async () => {
      const entries = await this.list(targetNamespace);

      // Simple text search (can be enhanced later)
      const searchLower = query.toLowerCase();
      const filtered = entries.filter(entry => {
        // Search in key
        if (entry.key.toLowerCase().includes(searchLower)) {
          return true;
        }

        // Search in value (if string)
        if (typeof entry.value === 'string' &&
            entry.value.toLowerCase().includes(searchLower)) {
          return true;
        }

        // Search in serialized value
        try {
          const serialized = JSON.stringify(entry.value).toLowerCase();
          if (serialized.includes(searchLower)) {
            return true;
          }
        } catch {
          // Ignore serialization errors
        }

        return false;
      });

      return filtered.slice(0, limit);
    }, { operation: 'memory.search', query, namespace: targetNamespace });

    if (result.success) {
      logger.debug('Memory search completed', {
        query,
        namespace: targetNamespace,
        results: result.data.length
      });
      return result.data;
    } else {
      throw createDatabaseError(
        `Failed to search memory entries: ${result.error.message}`,
        'search'
      );
    }
  }

  /**
   * Clear all memory entries in a namespace
   */
  async clear(namespace?: string): Promise<void> {
    const targetNamespace = namespace || this.config.defaultNamespace;

    const result = await ErrorHandler.execute(async () => {
      const keys = await this.storage.keys();
      const namespaceKeys = keys.filter(key =>
        key.startsWith(`${targetNamespace}:`)
      );

      // Delete in parallel
      await Promise.all(
        namespaceKeys.map(key => this.storage.delete(key))
      );
    }, { operation: 'memory.clear', namespace: targetNamespace });

    if (result.success) {
      logger.info('Memory namespace cleared', { namespace: targetNamespace });
    } else {
      throw createDatabaseError(
        `Failed to clear memory namespace: ${result.error.message}`,
        'clear'
      );
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(namespace?: string): Promise<{
    totalEntries: number;
    namespaces: string[];
    size?: number;
  }> {
    const targetNamespace = namespace;

    const result = await ErrorHandler.execute(async () => {
      const keys = await this.storage.keys();
      const namespaces = new Set<string>();

      keys.forEach(key => {
        const parts = key.split(':');
        if (parts.length >= 2) {
          namespaces.add(parts[0]);
        }
      });

      if (targetNamespace) {
        const namespaceKeys = keys.filter(key =>
          key.startsWith(`${targetNamespace}:`)
        );
        return {
          totalEntries: namespaceKeys.length,
          namespaces: Array.from(namespaces),
        };
      }

      return {
        totalEntries: keys.length,
        namespaces: Array.from(namespaces),
      };
    }, { operation: 'memory.stats', namespace: targetNamespace });

    if (result.success) {
      return result.data;
    } else {
      throw createDatabaseError(
        `Failed to get memory stats: ${result.error.message}`,
        'stats'
      );
    }
  }

  /**
   * Create full key with namespace
   */
  private getFullKey(key: string, namespace?: string): string {
    const targetNamespace = namespace || this.config.defaultNamespace;
    return `${targetNamespace}:${key}`;
  }

  /**
   * Validate key
   */
  private validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw createValidationError('Key must be a non-empty string', 'key', key);
    }

    if (key.trim().length === 0) {
      throw createValidationError('Key cannot be empty', 'key', key);
    }

    if (key.length > 255) {
      throw createValidationError('Key cannot exceed 255 characters', 'key', key);
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(key)) {
      throw createValidationError(
        'Key can only contain letters, numbers, dots, hyphens, and underscores',
        'key',
        key
      );
    }
  }

  /**
   * Validate value
   */
  private validateValue(value: unknown): void {
    if (value === null || value === undefined) {
      throw createValidationError('Value cannot be null or undefined', 'value', value);
    }

    // Check size if it's a string
    if (typeof value === 'string') {
      if (value.length > this.config.maxEntrySize) {
        throw createValidationError(
          `Value size exceeds maximum allowed size (${this.config.maxEntrySize} bytes)`,
          'value',
          value.length
        );
      }
    }

    // Check serialized size for other types
    try {
      const serialized = JSON.stringify(value);
      if (serialized.length > this.config.maxEntrySize) {
        throw createValidationError(
          `Value size exceeds maximum allowed size (${this.config.maxEntrySize} bytes)`,
          'value',
          serialized.length
        );
      }
    } catch (error) {
      throw createValidationError(
        'Value must be JSON serializable',
        'value',
        value
      );
    }
  }
}

/**
 * Factory function to create simplified memory service
 */
export function createSimplifiedMemoryService(
  storage: StorageAdapter,
  config?: SimplifiedMemoryServiceConfig
): SimplifiedMemoryService {
  return new SimplifiedMemoryService(storage, config);
}
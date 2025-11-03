/**
 * Unified Storage Tests
 * Tests for the new unified storage system
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryStorage, CacheStorage, VectorStorage, createStorage } from '../../src/core/unified-storage.js';
import type { StorageConfig } from '../../src/interfaces/unified-storage.js';

describe('Unified Storage System', () => {
  describe('MemoryStorage', () => {
    let storage: MemoryStorage<string>;

    beforeEach(async () => {
      storage = new MemoryStorage<string>();
      await storage.initialize();
    });

    afterEach(async () => {
      await storage.close();
    });

    it('should initialize successfully', async () => {
      expect(storage.type).toBe('memory');
      const stats = await storage.getStats();
      expect(stats.initialized).toBe(true);
      expect(stats.size).toBe(0);
    });

    it('should store and retrieve values', async () => {
      await storage.set('test-key', 'test-value');
      const value = await storage.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should return null for non-existent keys', async () => {
      const value = await storage.get('non-existent');
      expect(value).toBe(null);
    });

    it('should delete values', async () => {
      await storage.set('test-key', 'test-value');
      expect(await storage.exists('test-key')).toBe(true);

      const deleted = await storage.delete('test-key');
      expect(deleted).toBe(true);
      expect(await storage.exists('test-key')).toBe(false);
    });

    it('should clear all values', async () => {
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');
      expect(await storage.size()).toBe(2);

      await storage.clear();
      expect(await storage.size()).toBe(0);
    });

    it('should list all keys', async () => {
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');
      await storage.set('key3', 'value3');

      const keys = await storage.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });
  });

  describe('CacheStorage', () => {
    let storage: CacheStorage<string>;

    beforeEach(async () => {
      const config: StorageConfig = {
        type: 'cache',
        defaultTTL: 1, // 1 second for testing
      };
      storage = new CacheStorage<string>(config);
      await storage.initialize();
    });

    afterEach(async () => {
      await storage.close();
    });

    it('should initialize successfully', async () => {
      expect(storage.type).toBe('cache');
      const stats = await storage.getStats();
      expect(stats.initialized).toBe(true);
      expect(stats.defaultTTL).toBe(1);
    });

    it('should store and retrieve values with TTL', async () => {
      await storage.set('test-key', 'test-value');
      const value = await storage.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should expire values after TTL', async () => {
      await storage.set('test-key', 'test-value', 0.1); // 100ms TTL

      // Should be available immediately
      const value = await storage.get('test-key');
      expect(value).toBe('test-value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const expiredValue = await storage.get('test-key');
      expect(expiredValue).toBe(null);
    });

    it('should get values with TTL information', async () => {
      await storage.set('test-key', 'test-value', 10); // 10 seconds
      const result = await storage.getWithTTL('test-key');

      expect(result).toBeTruthy();
      expect(result!.value).toBe('test-value');
      expect(result!.ttl).toBeGreaterThan(0);
      expect(result!.ttl).toBeLessThanOrEqual(10);
    });

    it('should cleanup expired entries', async () => {
      await storage.set('key1', 'value1', 0.1);
      await storage.set('key2', 'value2', 10);

      // Wait for first entry to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const cleaned = await storage.cleanup();
      expect(cleaned).toBe(1);

      const value1 = await storage.get('key1');
      const value2 = await storage.get('key2');

      expect(value1).toBe(null);
      expect(value2).toBe('value2');
    });
  });

  describe('VectorStorage', () => {
    let storage: VectorStorage;

    beforeEach(async () => {
      storage = new VectorStorage();
      await storage.initialize();
    });

    afterEach(async () => {
      await storage.close();
    });

    it('should initialize successfully', async () => {
      expect(storage.type).toBe('vector');
      const stats = await storage.getStats();
      expect(stats.initialized).toBe(true);
      expect(stats.documentCount).toBe(0);
    });

    it('should store and retrieve documents', async () => {
      const document = {
        content: 'test content',
        embedding: [1, 2, 3],
        metadata: { category: 'test' },
      };

      await storage.set('doc1', document);
      const retrieved = await storage.get('doc1');

      expect(retrieved).toBeTruthy();
      expect(retrieved!.content).toBe('test content');
      expect(retrieved!.embedding).toEqual([1, 2, 3]);
      expect(retrieved!.metadata).toEqual({ category: 'test' });
    });

    it('should search for similar documents', async () => {
      const doc1 = {
        content: 'first document',
        embedding: [1, 0, 0],
      };
      const doc2 = {
        content: 'second document',
        embedding: [0, 1, 0],
      };
      const doc3 = {
        content: 'third document',
        embedding: [0.9, 0.1, 0],
      };

      await storage.set('doc1', doc1);
      await storage.set('doc2', doc2);
      await storage.set('doc3', doc3);

      const query = [1, 0, 0];
      const results = await storage.search(query, 2);

      expect(results).toHaveLength(2);
      expect(results[0].document.content).toBe('first document');
      expect(results[1].document.content).toBe('third document');
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('should calculate cosine similarity correctly', async () => {
      const doc = {
        content: 'test',
        embedding: [1, 0, 0],
      };

      await storage.set('doc1', doc);

      // Same vector should have similarity 1
      const results1 = await storage.search([1, 0, 0]);
      expect(results1[0].score).toBe(1);

      // Orthogonal vector should have similarity 0
      const results2 = await storage.search([0, 1, 0]);
      expect(results2[0].score).toBe(0);
    });
  });

  describe('Storage Factory', () => {
    it('should create memory storage', async () => {
      const config: StorageConfig = { type: 'memory' };
      const storage = createStorage<string>(config);

      expect(storage.type).toBe('memory');
      await storage.initialize();

      await storage.set('test', 'value');
      expect(await storage.get('test')).toBe('value');

      await storage.close();
    });

    it('should create cache storage', async () => {
      const config: StorageConfig = {
        type: 'cache',
        defaultTTL: 3600,
      };
      const storage = createStorage<string>(config);

      expect(storage.type).toBe('cache');
      await storage.initialize();

      await storage.set('test', 'value');
      expect(await storage.get('test')).toBe('value');

      await storage.close();
    });

    it('should create vector storage', async () => {
      const config: StorageConfig = { type: 'vector' };
      const storage = createStorage(config);

      expect(storage.type).toBe('vector');
      await storage.initialize();

      const document = {
        content: 'test',
        embedding: [1, 2, 3],
      };

      await storage.set('doc1', document);
      const retrieved = await storage.get('doc1');
      expect(retrieved!.content).toBe('test');

      await storage.close();
    });

    it('should throw error for unsupported storage type', () => {
      expect(() => {
        createStorage({ type: 'unsupported' as any });
      }).toThrow('Unsupported storage type: unsupported');
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      const storage = new MemoryStorage<string>();
      await storage.initialize();

      // Double initialization should not throw
      await storage.initialize();

      await storage.close();
    });

    it('should handle operations on closed storage', async () => {
      const storage = new MemoryStorage<string>();
      await storage.initialize();
      await storage.close();

      // Operations on closed storage should not throw
      await expect(storage.set('test', 'value')).resolves.toBeUndefined();
      await expect(storage.get('test')).resolves.toBeNull();
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of entries efficiently', async () => {
      const storage = new MemoryStorage<string>();
      await storage.initialize();

      const startTime = Date.now();

      // Insert 1000 entries
      for (let i = 0; i < 1000; i++) {
        await storage.set(`key${i}`, `value${i}`);
      }

      const insertTime = Date.now() - startTime;
      expect(insertTime).toBeLessThan(1000); // Should be under 1 second

      // Retrieve all entries
      const retrieveStartTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        const value = await storage.get(`key${i}`);
        expect(value).toBe(`value${i}`);
      }

      const retrieveTime = Date.now() - retrieveStartTime;
      expect(retrieveTime).toBeLessThan(1000); // Should be under 1 second

      await storage.close();
    });
  });
});
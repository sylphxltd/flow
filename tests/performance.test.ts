import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the paths module to avoid the dist directory check
vi.mock('../src/utils/paths.js', () => ({
  getDistDir: () => '/mock/dist',
  getAssetsDir: () => '/mock/dist/assets',
}));

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Loading Performance', () => {
    it('should load Effect modules within reasonable time', async () => {
      const startTime = performance.now();

      await import('effect');
      await import('@effect/cli');
      await import('@effect/platform');
      await import('@effect/sql');

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should load within 2 seconds (Effect modules have larger footprint)
      expect(loadTime).toBeLessThan(2000);
    });

    it('should load application modules efficiently', async () => {
      const startTime = performance.now();

      // Load key application modules
      await import('../src/cli-effect.js');
      await import('../src/db/base-database-client-effect.js');
      await import('../src/utils/file-system-effect.js');

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });
  });

  describe('CLI Performance', () => {
    it('should create CLI structure quickly', async () => {
      const startTime = performance.now();

      const { createCLI } = await import('../src/cli-effect.js');
      const cli = createCLI; // Command object, not function call

      const endTime = performance.now();
      const creationTime = endTime - startTime;

      expect(cli).toBeDefined();
      expect(creationTime).toBeLessThan(500); // Should be reasonably fast
    });

    it('should handle command creation efficiently', async () => {
      const startTime = performance.now();

      const { createCLI } = await import('../src/cli-effect.js');
      const cli = createCLI; // Command object creation

      const endTime = performance.now();
      const creationTime = endTime - startTime;

      // Should create within 100ms
      expect(creationTime).toBeLessThan(100);
    });
  });

  describe('Memory Usage', () => {
    it('should not have excessive memory usage during imports', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Import modules
      await import('effect');
      await import('@effect/cli');
      await import('../src/cli-effect.js');

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not increase by more than 50MB during imports
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Database Performance', () => {
    it('should create database layer efficiently', async () => {
      const startTime = performance.now();

      const { DatabaseLive } = await import('../src/db/base-database-client-effect.js');

      // Just test that the layer can be created
      expect(DatabaseLive).toBeDefined();

      const endTime = performance.now();
      const creationTime = endTime - startTime;

      expect(creationTime).toBeLessThan(100);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors efficiently', async () => {
      const { CLIError } = await import('../src/utils/error-handler.js');

      const startTime = performance.now();

      // Create many errors to test performance
      for (let i = 0; i < 1000; i++) {
        new CLIError(`Test error ${i}`, 'TEST_ERROR');
      }

      const endTime = performance.now();
      const errorCreationTime = endTime - startTime;

      // Should create 1000 errors quickly
      expect(errorCreationTime).toBeLessThan(100);
    });
  });
});

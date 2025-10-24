import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Effect Database Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Service Interface', () => {
    it('should export database service and layer', async () => {
      const { Database, DatabaseLive } = await import('../src/db/base-database-client-effect.js');

      expect(Database).toBeDefined();
      expect(DatabaseLive).toBeDefined();
    });

    it('should have proper service tag', async () => {
      const { Database } = await import('../src/db/base-database-client-effect.js');

      expect(Database).toBeDefined();
      expect(Database.key).toBe('DatabaseService');
    });

    it('should create database layer', async () => {
      const { DatabaseLive } = await import('../src/db/base-database-client-effect.js');

      expect(DatabaseLive).toBeDefined();
      expect(typeof DatabaseLive).toBe('object');
    });
  });

  describe('Error Types', () => {
    it('should export DatabaseError', async () => {
      const { DatabaseError } = await import('../src/errors.js');

      expect(DatabaseError).toBeDefined();
      expect(typeof DatabaseError).toBe('function');
    });
  });

  describe('Module Structure', () => {
    it('should import required Effect modules', async () => {
      // Test that the module can be imported without errors
      await expect(import('../src/db/base-database-client-effect.js')).resolves.toBeDefined();
    });

    it('should have proper dependencies', async () => {
      const module = await import('../src/db/base-database-client-effect.js');

      // Check that key exports exist
      expect(module).toHaveProperty('Database');
      expect(module).toHaveProperty('DatabaseLive');
    });
  });
});

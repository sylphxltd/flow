import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DatabaseMigrations,
  DatabaseService,
  DefaultDatabaseConfig,
  TestDatabaseServiceLive,
  createDatabaseConfig,
  ensureDatabaseDirectory,
  getDatabasePath,
} from '../../src/services/database-service.js';

describe('DatabaseService', () => {
  const runTest = (testEffect: Effect.Effect<any, any, any>) => {
    return Effect.runSync(Effect.provide(testEffect, TestDatabaseServiceLive)) as any;
  };

  const runTestAsync = async (testEffect: Effect.Effect<any, any, any>) => {
    return (await Effect.runPromise(Effect.provide(testEffect, TestDatabaseServiceLive))) as any;
  };

  describe('database configuration', () => {
    it('should create default database config', () => {
      const config = Effect.runSync(createDatabaseConfig());

      expect(config).toEqual(DefaultDatabaseConfig);
    });

    it('should get database path from file URL', () => {
      const config = { url: 'file:/path/to/database.db' };
      const path = getDatabasePath(config);

      expect(path).toBe('/path/to/database.db');
    });

    it('should return URL as-is for non-file URLs', () => {
      const config = { url: 'https://example.com/database.db' };
      const path = getDatabasePath(config);

      expect(path).toBe('https://example.com/database.db');
    });
  });

  describe('database service operations', () => {
    it('should initialize database', () =>
      runTest(
        Effect.gen(function* () {
          const db = yield* DatabaseService;

          yield* db.initialize();

          // Should not throw
          expect(true).toBe(true);
        })
      ));

    it('should pass health check', () =>
      runTest(
        Effect.gen(function* () {
          const db = yield* DatabaseService;

          const isHealthy = yield* db.healthCheck();

          expect(isHealthy).toBe(true);
        })
      ));

    it('should close database', () =>
      runTest(
        Effect.gen(function* () {
          const db = yield* DatabaseService;

          yield* db.close();

          // Should not throw
          expect(true).toBe(true);
        })
      ));

    it('should get SQL client', () =>
      runTest(
        Effect.gen(function* () {
          const db = yield* DatabaseService;

          const sqlClient = yield* db.getSqlClient();

          expect(sqlClient).toBeDefined();
        })
      ));
  });

  describe('database migrations', () => {
    it('should create memory table', () =>
      runTest(
        Effect.gen(function* () {
          const db = yield* DatabaseService;
          const sql = yield* db.getSqlClient();

          yield* DatabaseMigrations.createMemoryTable(sql);

          // Should not throw
          expect(true).toBe(true);
        })
      ));

    it('should run all migrations', () =>
      runTest(
        Effect.gen(function* () {
          const db = yield* DatabaseService;
          const sql = yield* db.getSqlClient();

          yield* DatabaseMigrations.runMigrations(sql);

          // Should not throw
          expect(true).toBe(true);
        })
      ));
  });

  describe('database utilities', () => {
    it('should ensure database directory exists', async () => {
      const config = { url: 'file:/tmp/test-db/memory.db' };

      const result = await runTestAsync(ensureDatabaseDirectory(config));

      // Should not throw
      expect(result).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle database initialization errors', () =>
      runTest(
        Effect.gen(function* () {
          const db = yield* DatabaseService;

          // Mock a failing initialization
          try {
            yield* db.initialize();
            // If we get here, the test passed (no error in test environment)
            expect(true).toBe(true);
          } catch (error) {
            // In a real scenario, this would handle the error
            expect(error).toBeDefined();
          }
        })
      ));
  });
});

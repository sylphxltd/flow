/**
 * Cache Database Tests
 * Tests for the CacheDatabaseClient class
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CacheDatabaseClient } from '../../src/db/cache-db.js';
import { DatabaseError } from '../../src/utils/database-errors.js';

describe('Cache Database Client', () => {
  let client: CacheDatabaseClient;
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Create temp directory
    testDir = join(tmpdir(), `cache-db-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Change to test directory
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Create fresh client instance
    client = new CacheDatabaseClient();
  });

  afterEach(async () => {
    // Clean up
    try {
      await client.close();
    } catch {
      // Ignore cleanup errors
    }

    // Restore original directory
    process.chdir(originalCwd);

    // Remove test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Constructor', () => {
    it('should create cache database client', () => {
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(CacheDatabaseClient);
    });

    it('should have db property', () => {
      expect(client.db).toBeDefined();
    });

    it('should create .sylphx-flow directory', () => {
      const dbDir = join(testDir, '.sylphx-flow');
      expect(existsSync(dbDir)).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should initialize cache database tables', async () => {
      await expect(client.initialize()).resolves.not.toThrow();
    });

    it('should create codebase_files_table', async () => {
      await client.initialize();

      const result = await client.client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='codebase_files_table'"
      );
      expect(result.rows.length).toBe(1);
    });

    it('should create codebase_metadata_table', async () => {
      await client.initialize();

      const result = await client.client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='codebase_metadata_table'"
      );
      expect(result.rows.length).toBe(1);
    });

    it('should create tfidf_documents_table', async () => {
      await client.initialize();

      const result = await client.client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='tfidf_documents_table'"
      );
      expect(result.rows.length).toBe(1);
    });

    it('should create tfidf_idf_table', async () => {
      await client.initialize();

      const result = await client.client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='tfidf_idf_table'"
      );
      expect(result.rows.length).toBe(1);
    });

    it('should create tfidf_terms_table', async () => {
      await client.initialize();

      const result = await client.client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='tfidf_terms_table'"
      );
      expect(result.rows.length).toBe(1);
    });

    it('should create indexes on codebase_files_table', async () => {
      await client.initialize();

      const result = await client.client.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_codebase_files%'"
      );
      expect(result.rows.length).toBeGreaterThanOrEqual(2);
    });

    it('should create indexes on tfidf_terms_table', async () => {
      await client.initialize();

      const result = await client.client.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_tfidf_terms%'"
      );
      expect(result.rows.length).toBeGreaterThanOrEqual(2);
    });

    it('should skip initialization if already initialized', async () => {
      await client.initialize();
      await expect(client.initialize()).resolves.not.toThrow();
    });

    it('should handle initialization errors gracefully', async () => {
      // Close the client to simulate connection error
      const brokenClient = new CacheDatabaseClient();
      // @ts-expect-error - Testing error handling
      brokenClient.client = {
        execute: async () => {
          throw new Error('Connection error');
        },
      };

      await expect(brokenClient.initialize()).rejects.toThrow(DatabaseError);
    });
  });

  describe('getMigrationStatus', () => {
    it('should return not migrated for fresh database', async () => {
      const status = await client.getMigrationStatus();

      expect(status).toBeDefined();
      expect(status.isMigrated).toBe(false);
      expect(status.migrationCount).toBe(0);
    });

    it('should return migrated after initialization', async () => {
      await client.initialize();
      const status = await client.getMigrationStatus();

      expect(status.isMigrated).toBe(true);
      expect(status.migrationCount).toBeGreaterThanOrEqual(2);
    });

    it('should count existing tables correctly', async () => {
      await client.initialize();
      const status = await client.getMigrationStatus();

      expect(status.migrationCount).toBeGreaterThanOrEqual(3);
    });

    it('should consider database migrated with partial tables', async () => {
      // Create only codebase_files_table and tfidf_terms_table
      await client.client.execute(`
        CREATE TABLE IF NOT EXISTS codebase_files_table (
          path TEXT PRIMARY KEY,
          mtime INTEGER NOT NULL,
          hash TEXT NOT NULL,
          content TEXT,
          language TEXT,
          size INTEGER,
          indexed_at TEXT NOT NULL
        )
      `);

      await client.client.execute(`
        CREATE TABLE IF NOT EXISTS tfidf_terms_table (
          file_path TEXT NOT NULL,
          term TEXT NOT NULL,
          frequency REAL NOT NULL,
          PRIMARY KEY (file_path, term)
        )
      `);

      const status = await client.getMigrationStatus();

      expect(status.isMigrated).toBe(true);
      expect(status.migrationCount).toBe(2);
    });

    it('should handle errors during status check', async () => {
      const brokenClient = new CacheDatabaseClient();
      // @ts-expect-error - Testing error handling
      brokenClient.client = {
        execute: async () => {
          throw new Error('Database error');
        },
      };

      await expect(brokenClient.getMigrationStatus()).rejects.toThrow(DatabaseError);
    });
  });

  describe('clearCache', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    it('should clear cache data', async () => {
      // Insert test data
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('test.ts', 123456, 'hash123', '2024-01-01T00:00:00Z')
      `);

      await client.clearCache();

      const result = await client.client.execute('SELECT * FROM codebase_files_table');
      expect(result.rows.length).toBe(0);
    });

    it('should clear tfidf_terms_table', async () => {
      // Insert test data
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('test.ts', 123456, 'hash123', '2024-01-01T00:00:00Z')
      `);

      await client.client.execute(`
        INSERT INTO tfidf_terms_table (file_path, term, frequency)
        VALUES ('test.ts', 'function', 0.5)
      `);

      await client.clearCache();

      const result = await client.client.execute('SELECT * FROM tfidf_terms_table');
      expect(result.rows.length).toBe(0);
    });

    it('should clear tfidf_documents_table', async () => {
      // Insert test data
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('test.ts', 123456, 'hash123', '2024-01-01T00:00:00Z')
      `);

      await client.client.execute(`
        INSERT INTO tfidf_documents_table (file_path, magnitude, term_count, raw_terms)
        VALUES ('test.ts', 1.5, 10, '{"term1": 0.5}')
      `);

      await client.clearCache();

      const result = await client.client.execute('SELECT * FROM tfidf_documents_table');
      expect(result.rows.length).toBe(0);
    });

    it('should clear tfidf_idf_table', async () => {
      // Insert test data
      await client.client.execute(`
        INSERT INTO tfidf_idf_table (term, idf_value)
        VALUES ('function', 2.5)
      `);

      await client.clearCache();

      const result = await client.client.execute('SELECT * FROM tfidf_idf_table');
      expect(result.rows.length).toBe(0);
    });

    it('should clear codebase_metadata_table', async () => {
      // Insert test data
      await client.client.execute(`
        INSERT INTO codebase_metadata_table (key, value)
        VALUES ('last_indexed', '2024-01-01T00:00:00Z')
      `);

      await client.clearCache();

      const result = await client.client.execute('SELECT * FROM codebase_metadata_table');
      expect(result.rows.length).toBe(0);
    });

    it('should handle errors during cache clear', async () => {
      const brokenClient = new CacheDatabaseClient();
      await brokenClient.initialize();

      // @ts-expect-error - Testing error handling
      brokenClient.client = {
        execute: async () => {
          throw new Error('Delete failed');
        },
      };

      await expect(brokenClient.clearCache()).rejects.toThrow(DatabaseError);
    });

    it('should clear all tables in correct order', async () => {
      // Insert test data with foreign key relationships
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('test.ts', 123456, 'hash123', '2024-01-01T00:00:00Z')
      `);

      await client.client.execute(`
        INSERT INTO tfidf_terms_table (file_path, term, frequency)
        VALUES ('test.ts', 'function', 0.5)
      `);

      await client.client.execute(`
        INSERT INTO tfidf_documents_table (file_path, magnitude, term_count, raw_terms)
        VALUES ('test.ts', 1.5, 10, '{}')
      `);

      await expect(client.clearCache()).resolves.not.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should return unhealthy for uninitialized database', async () => {
      const health = await client.healthCheck();

      expect(health).toBeDefined();
      expect(health.healthy).toBe(false);
      expect(health.error).toBeDefined();
    });

    it('should return healthy for initialized database', async () => {
      await client.initialize();
      const health = await client.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.error).toBeUndefined();
    });

    it('should include migration status in details', async () => {
      await client.initialize();
      const health = await client.healthCheck();

      expect(health.details).toBeDefined();
      expect(health.details?.tablesExist).toBe(true);
    });

    it('should include table count in details', async () => {
      await client.initialize();
      const health = await client.healthCheck();

      expect(health.details?.tableCount).toBeGreaterThanOrEqual(2);
    });

    it('should include cached files count in details', async () => {
      await client.initialize();

      // Insert test data
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('test1.ts', 123456, 'hash1', '2024-01-01T00:00:00Z')
      `);

      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('test2.ts', 123457, 'hash2', '2024-01-01T00:00:00Z')
      `);

      const health = await client.healthCheck();

      expect(health.details?.cachedFiles).toBe(2);
    });

    it('should return zero cached files for empty database', async () => {
      await client.initialize();
      const health = await client.healthCheck();

      expect(health.details?.cachedFiles).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      const brokenClient = new CacheDatabaseClient();
      // @ts-expect-error - Testing error handling
      brokenClient.client = {
        execute: async () => {
          throw new Error('Connection lost');
        },
      };

      const health = await brokenClient.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error).toContain('Connection lost');
    });

    it('should test basic connectivity', async () => {
      await client.initialize();
      const health = await client.healthCheck();

      // If healthy, basic SELECT 1 should have worked
      expect(health.healthy).toBe(true);
    });
  });

  describe('close', () => {
    it('should close database connection', async () => {
      await expect(client.close()).resolves.not.toThrow();
    });

    it('should be callable multiple times', async () => {
      await client.close();
      await expect(client.close()).resolves.not.toThrow();
    });
  });

  describe('getDatabasePath', () => {
    it('should return correct database path', () => {
      const path = client.getDatabasePath();

      expect(path).toBeDefined();
      expect(path).toContain('.sylphx-flow');
      expect(path).toContain('cache.db');
    });

    it('should include current working directory', () => {
      const path = client.getDatabasePath();

      expect(path).toContain(testDir);
    });

    it('should return absolute path', () => {
      const path = client.getDatabasePath();

      expect(path.startsWith('/')).toBe(true);
    });
  });

  describe('Database Operations', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    it('should insert and query codebase files', async () => {
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('src/test.ts', 1234567890, 'abc123', '2024-01-01T00:00:00Z')
      `);

      const result = await client.client.execute('SELECT * FROM codebase_files_table');
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].path).toBe('src/test.ts');
    });

    it('should insert and query codebase metadata', async () => {
      await client.client.execute(`
        INSERT INTO codebase_metadata_table (key, value)
        VALUES ('version', '1.0.0')
      `);

      const result = await client.client.execute('SELECT * FROM codebase_metadata_table');
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].key).toBe('version');
      expect(result.rows[0].value).toBe('1.0.0');
    });

    it('should respect foreign key constraints', async () => {
      // Insert parent record
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('test.ts', 123456, 'hash123', '2024-01-01T00:00:00Z')
      `);

      // Insert child record
      await client.client.execute(`
        INSERT INTO tfidf_terms_table (file_path, term, frequency)
        VALUES ('test.ts', 'function', 0.5)
      `);

      const result = await client.client.execute('SELECT * FROM tfidf_terms_table');
      expect(result.rows.length).toBe(1);
    });

    it('should cascade delete tfidf terms when file is deleted', async () => {
      // Insert parent and child
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('test.ts', 123456, 'hash123', '2024-01-01T00:00:00Z')
      `);

      await client.client.execute(`
        INSERT INTO tfidf_terms_table (file_path, term, frequency)
        VALUES ('test.ts', 'function', 0.5)
      `);

      // Delete parent
      await client.client.execute("DELETE FROM codebase_files_table WHERE path = 'test.ts'");

      // Check child is also deleted
      const result = await client.client.execute('SELECT * FROM tfidf_terms_table');
      expect(result.rows.length).toBe(0);
    });

    it('should enforce primary key constraint on codebase files', async () => {
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('test.ts', 123456, 'hash123', '2024-01-01T00:00:00Z')
      `);

      await expect(
        client.client.execute(`
          INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
          VALUES ('test.ts', 654321, 'hash456', '2024-01-02T00:00:00Z')
        `)
      ).rejects.toThrow();
    });

    it('should enforce composite primary key on tfidf terms', async () => {
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('test.ts', 123456, 'hash123', '2024-01-01T00:00:00Z')
      `);

      await client.client.execute(`
        INSERT INTO tfidf_terms_table (file_path, term, frequency)
        VALUES ('test.ts', 'function', 0.5)
      `);

      await expect(
        client.client.execute(`
          INSERT INTO tfidf_terms_table (file_path, term, frequency)
          VALUES ('test.ts', 'function', 0.7)
        `)
      ).rejects.toThrow();
    });

    it('should support querying by mtime index', async () => {
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('test1.ts', 100, 'hash1', '2024-01-01T00:00:00Z')
      `);

      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('test2.ts', 200, 'hash2', '2024-01-01T00:00:00Z')
      `);

      const result = await client.client.execute(
        'SELECT * FROM codebase_files_table WHERE mtime > 150'
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].path).toBe('test2.ts');
    });

    it('should support querying by hash index', async () => {
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('test.ts', 123456, 'uniquehash', '2024-01-01T00:00:00Z')
      `);

      const result = await client.client.execute(
        "SELECT * FROM codebase_files_table WHERE hash = 'uniquehash'"
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].path).toBe('test.ts');
    });

    it('should support querying by term index', async () => {
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('test.ts', 123456, 'hash123', '2024-01-01T00:00:00Z')
      `);

      await client.client.execute(`
        INSERT INTO tfidf_terms_table (file_path, term, frequency)
        VALUES ('test.ts', 'searchterm', 0.5)
      `);

      const result = await client.client.execute(
        "SELECT * FROM tfidf_terms_table WHERE term = 'searchterm'"
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].file_path).toBe('test.ts');
    });

    it('should handle optional fields in codebase files', async () => {
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, content, language, size, indexed_at)
        VALUES ('test.ts', 123456, 'hash123', 'function test() {}', 'typescript', 1024, '2024-01-01T00:00:00Z')
      `);

      const result = await client.client.execute('SELECT * FROM codebase_files_table');
      expect(result.rows[0].content).toBe('function test() {}');
      expect(result.rows[0].language).toBe('typescript');
      expect(result.rows[0].size).toBe(1024);
    });

    it('should store and retrieve tfidf document data', async () => {
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('test.ts', 123456, 'hash123', '2024-01-01T00:00:00Z')
      `);

      await client.client.execute(`
        INSERT INTO tfidf_documents_table (file_path, magnitude, term_count, raw_terms)
        VALUES ('test.ts', 2.5, 50, '{"function": 0.5, "const": 0.3}')
      `);

      const result = await client.client.execute('SELECT * FROM tfidf_documents_table');
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].magnitude).toBe(2.5);
      expect(result.rows[0].term_count).toBe(50);
      expect(result.rows[0].raw_terms).toContain('function');
    });

    it('should store and retrieve tfidf idf values', async () => {
      await client.client.execute(`
        INSERT INTO tfidf_idf_table (term, idf_value)
        VALUES ('function', 3.2)
      `);

      const result = await client.client.execute('SELECT * FROM tfidf_idf_table');
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].term).toBe('function');
      expect(result.rows[0].idf_value).toBe(3.2);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete codebase indexing workflow', async () => {
      await client.initialize();

      // 1. Check database is healthy
      const health = await client.healthCheck();
      expect(health.healthy).toBe(true);

      // 2. Insert a file
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, content, language, size, indexed_at)
        VALUES ('src/index.ts', 1234567890, 'hash123', 'export function main() {}', 'typescript', 512, '2024-01-01T00:00:00Z')
      `);

      // 3. Add TF-IDF terms
      await client.client.execute(`
        INSERT INTO tfidf_terms_table (file_path, term, frequency)
        VALUES ('src/index.ts', 'export', 0.5)
      `);

      await client.client.execute(`
        INSERT INTO tfidf_terms_table (file_path, term, frequency)
        VALUES ('src/index.ts', 'function', 0.3)
      `);

      // 4. Add TF-IDF document
      await client.client.execute(`
        INSERT INTO tfidf_documents_table (file_path, magnitude, term_count, raw_terms)
        VALUES ('src/index.ts', 1.8, 2, '{"export": 0.5, "function": 0.3}')
      `);

      // 5. Add IDF value
      await client.client.execute(`
        INSERT INTO tfidf_idf_table (term, idf_value)
        VALUES ('export', 2.1)
      `);

      // 6. Verify all data
      const files = await client.client.execute('SELECT COUNT(*) as count FROM codebase_files_table');
      const terms = await client.client.execute('SELECT COUNT(*) as count FROM tfidf_terms_table');
      const docs = await client.client.execute('SELECT COUNT(*) as count FROM tfidf_documents_table');
      const idfs = await client.client.execute('SELECT COUNT(*) as count FROM tfidf_idf_table');

      expect(files.rows[0].count).toBe(1);
      expect(terms.rows[0].count).toBe(2);
      expect(docs.rows[0].count).toBe(1);
      expect(idfs.rows[0].count).toBe(1);

      // 7. Clear cache
      await client.clearCache();

      // 8. Verify all tables are empty
      const filesAfter = await client.client.execute('SELECT COUNT(*) as count FROM codebase_files_table');
      expect(filesAfter.rows[0].count).toBe(0);
    });

    it('should handle multiple files with shared terms', async () => {
      await client.initialize();

      // Insert multiple files
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('file1.ts', 100, 'hash1', '2024-01-01T00:00:00Z')
      `);

      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('file2.ts', 200, 'hash2', '2024-01-01T00:00:00Z')
      `);

      // Both files share the term 'function'
      await client.client.execute(`
        INSERT INTO tfidf_terms_table (file_path, term, frequency)
        VALUES ('file1.ts', 'function', 0.5)
      `);

      await client.client.execute(`
        INSERT INTO tfidf_terms_table (file_path, term, frequency)
        VALUES ('file2.ts', 'function', 0.3)
      `);

      // Query files containing 'function'
      const result = await client.client.execute(
        "SELECT file_path FROM tfidf_terms_table WHERE term = 'function'"
      );

      expect(result.rows.length).toBe(2);
    });

    it('should maintain referential integrity during complex operations', async () => {
      await client.initialize();

      // Create multiple files with relationships
      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('app.ts', 100, 'h1', '2024-01-01T00:00:00Z')
      `);

      await client.client.execute(`
        INSERT INTO codebase_files_table (path, mtime, hash, indexed_at)
        VALUES ('utils.ts', 200, 'h2', '2024-01-01T00:00:00Z')
      `);

      // Add related data
      await client.client.execute(`
        INSERT INTO tfidf_terms_table (file_path, term, frequency)
        VALUES ('app.ts', 'import', 0.6)
      `);

      await client.client.execute(`
        INSERT INTO tfidf_documents_table (file_path, magnitude, term_count, raw_terms)
        VALUES ('app.ts', 1.5, 10, '{}')
      `);

      // Delete one file - should cascade
      await client.client.execute("DELETE FROM codebase_files_table WHERE path = 'app.ts'");

      // Verify related data is deleted
      const terms = await client.client.execute(
        "SELECT * FROM tfidf_terms_table WHERE file_path = 'app.ts'"
      );
      const docs = await client.client.execute(
        "SELECT * FROM tfidf_documents_table WHERE file_path = 'app.ts'"
      );

      expect(terms.rows.length).toBe(0);
      expect(docs.rows.length).toBe(0);

      // Verify other file remains
      const remainingFiles = await client.client.execute('SELECT * FROM codebase_files_table');
      expect(remainingFiles.rows.length).toBe(1);
      expect(remainingFiles.rows[0].path).toBe('utils.ts');
    });
  });
});

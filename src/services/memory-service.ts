import { SqlClient } from '@effect/sql';
import { Effect, Layer } from 'effect';
import { type MemoryEntry, MemoryError, MemoryService } from './service-types.js';

// ============================================================================
// MEMORY SERVICE IMPLEMENTATION
// ============================================================================

/**
 * Memory service implementation using Effect SQL
 */
const makeMemoryService = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  // Initialize database schema
  yield* initializeSchema(sql);

  const set = (key: string, value: string, namespace = 'default') =>
    Effect.gen(function* () {
      const now = new Date();
      const serializedValue = JSON.stringify(value);

      // Check if entry exists
      const existing = yield* get(key, namespace);

      if (existing) {
        // Update existing entry (preserve created_at)
        yield* sql`
          UPDATE memory 
          SET value = ${serializedValue}, updated_at = ${now.toISOString()}
          WHERE key = ${key} AND namespace = ${namespace}
        `.pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              new MemoryError(`Failed to update memory entry: ${error}`, error as Error, 'set')
            )
          )
        );
      } else {
        // Insert new entry
        yield* sql`
          INSERT INTO memory (id, key, value, namespace, created_at, updated_at)
          VALUES (${crypto.randomUUID()}, ${key}, ${serializedValue}, ${namespace}, ${now.toISOString()}, ${now.toISOString()})
        `.pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              new MemoryError(`Failed to insert memory entry: ${error}`, error as Error, 'set')
            )
          )
        );
      }
    });

  const get = (key: string, namespace = 'default') =>
    Effect.gen(function* () {
      const result = yield* sql`
        SELECT id, key, value, namespace, created_at, updated_at
        FROM memory
        WHERE key = ${key} AND namespace = ${namespace}
      `.pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new MemoryError(`Failed to retrieve memory entry: ${error}`, error as Error, 'get')
          )
        )
      );

      if (result.length === 0) {
        return null;
      }

      const row = result[0] as {
        id: string;
        key: string;
        value: string;
        namespace: string;
        created_at: string;
        updated_at: string;
      };

      let parsedValue: string;

      try {
        parsedValue = JSON.parse(row.value);
      } catch {
        parsedValue = row.value;
      }

      return {
        id: row.id,
        key: row.key,
        value: parsedValue,
        namespace: row.namespace,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      } as MemoryEntry;
    });

  const list = (namespace?: string, limit?: number) =>
    Effect.gen(function* () {
      let query = sql`
        SELECT id, key, value, namespace, created_at, updated_at
        FROM memory
      `;

      if (namespace && namespace !== 'all') {
        query = sql`${query} WHERE namespace = ${namespace}`;
      }

      query = sql`${query} ORDER BY updated_at DESC`;

      if (limit) {
        query = sql`${query} LIMIT ${limit}`;
      }

      const result = yield* query.pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new MemoryError(`Failed to list memory entries: ${error}`, error as Error, 'list')
          )
        )
      );

      return result.map((row) => {
        const typedRow = row as {
          id: string;
          key: string;
          value: string;
          namespace: string;
          created_at: string;
          updated_at: string;
        };

        let parsedValue: string;

        try {
          parsedValue = JSON.parse(typedRow.value);
        } catch {
          parsedValue = typedRow.value;
        }

        return {
          id: typedRow.id,
          key: typedRow.key,
          value: parsedValue,
          namespace: typedRow.namespace,
          createdAt: new Date(typedRow.created_at),
          updatedAt: new Date(typedRow.updated_at),
        } as MemoryEntry;
      });
    });

  const deleteEntry = (key: string, namespace = 'default') =>
    Effect.gen(function* () {
      const result = yield* sql`
        DELETE FROM memory
        WHERE key = ${key} AND namespace = ${namespace}
      `.pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new MemoryError(`Failed to delete memory entry: ${error}`, error as Error, 'delete')
          )
        )
      );

      // For Effect SQL, we need to check the affected rows differently
      return (result as any).changes > 0 || (result as any).rowCount > 0;
    });

  const clear = (namespace?: string) =>
    Effect.gen(function* () {
      if (namespace && namespace !== 'all') {
        yield* sql`
          DELETE FROM memory WHERE namespace = ${namespace}
        `.pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              new MemoryError(`Failed to clear memory namespace: ${error}`, error as Error, 'clear')
            )
          )
        );
      } else {
        yield* sql`DELETE FROM memory`.pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              new MemoryError(`Failed to clear all memory: ${error}`, error as Error, 'clear')
            )
          )
        );
      }
    });

  const search = (pattern: string, namespace?: string) =>
    Effect.gen(function* () {
      const searchPattern = pattern.replace(/\*/g, '%');

      let query = sql`
        SELECT id, key, value, namespace, created_at, updated_at
        FROM memory
        WHERE (key LIKE ${searchPattern} OR value LIKE ${searchPattern})
      `;

      if (namespace && namespace !== 'all') {
        query = sql`${query} AND namespace = ${namespace}`;
      }

      query = sql`${query} ORDER BY updated_at DESC`;

      const result = yield* query.pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new MemoryError(`Failed to search memory entries: ${error}`, error as Error, 'search')
          )
        )
      );

      return result.map((row) => {
        const typedRow = row as {
          id: string;
          key: string;
          value: string;
          namespace: string;
          created_at: string;
          updated_at: string;
        };

        let parsedValue: string;

        try {
          parsedValue = JSON.parse(typedRow.value);
        } catch {
          parsedValue = typedRow.value;
        }

        return {
          id: typedRow.id,
          key: typedRow.key,
          value: parsedValue,
          namespace: typedRow.namespace,
          createdAt: new Date(typedRow.created_at),
          updatedAt: new Date(typedRow.updated_at),
        } as MemoryEntry;
      });
    });

  return {
    set,
    get,
    list,
    delete: deleteEntry,
    clear,
    search,
  } as MemoryService;
});

// ============================================================================
// SCHEMA INITIALIZATION
// ============================================================================

/**
 * Initialize database schema for memory service
 */
const initializeSchema = (sql: SqlClient.SqlClient) =>
  Effect.gen(function* () {
    // Create memory table
    yield* sql`
      CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        namespace TEXT NOT NULL DEFAULT 'default',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `.pipe(
      Effect.catchAll((error) =>
        Effect.fail(
          new MemoryError(
            `Failed to create memory table: ${error}`,
            error as Error,
            'initializeSchema'
          )
        )
      )
    );

    // Create indexes for performance
    yield* sql`
      CREATE INDEX IF NOT EXISTS idx_memory_key ON memory(key)
    `.pipe(
      Effect.catchAll((error) =>
        Effect.fail(
          new MemoryError(
            `Failed to create key index: ${error}`,
            error as Error,
            'initializeSchema'
          )
        )
      )
    );

    yield* sql`
      CREATE INDEX IF NOT EXISTS idx_memory_namespace ON memory(namespace)
    `.pipe(
      Effect.catchAll((error) =>
        Effect.fail(
          new MemoryError(
            `Failed to create namespace index: ${error}`,
            error as Error,
            'initializeSchema'
          )
        )
      )
    );

    yield* sql`
      CREATE INDEX IF NOT EXISTS idx_memory_updated_at ON memory(updated_at)
    `.pipe(
      Effect.catchAll((error) =>
        Effect.fail(
          new MemoryError(
            `Failed to create updated_at index: ${error}`,
            error as Error,
            'initializeSchema'
          )
        )
      )
    );

    yield* sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_key_namespace ON memory(key, namespace)
    `.pipe(
      Effect.catchAll((error) =>
        Effect.fail(
          new MemoryError(
            `Failed to create unique key index: ${error}`,
            error as Error,
            'initializeSchema'
          )
        )
      )
    );
  });

// ============================================================================
// SERVICE LAYER
// ============================================================================

/**
 * Memory service layer
 */
export const MemoryServiceLive = Layer.effect(MemoryService, makeMemoryService);

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Create a test memory service layer with in-memory database
 */
export const TestMemoryServiceLive = Layer.effect(
  MemoryService,
  Effect.gen(function* () {
    // For testing, we'll use a mock implementation
    const memoryStore = new Map<string, MemoryEntry>();

    const set = (key: string, value: string, namespace = 'default') =>
      Effect.sync(() => {
        const now = new Date();
        const id = `${namespace}:${key}`;
        const entry: MemoryEntry = {
          id: crypto.randomUUID(),
          key,
          value,
          namespace,
          createdAt: now,
          updatedAt: now,
        };
        memoryStore.set(id, entry);
      });

    const get = (key: string, namespace = 'default') =>
      Effect.sync(() => {
        const id = `${namespace}:${key}`;
        return memoryStore.get(id) || null;
      });

    const list = (namespace?: string, limit?: number) =>
      Effect.sync(() => {
        const entries = Array.from(memoryStore.values()).filter(
          (entry) => !namespace || namespace === 'all' || entry.namespace === namespace
        );

        entries.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        return limit ? entries.slice(0, limit) : entries;
      });

    const deleteEntry = (key: string, namespace = 'default') =>
      Effect.sync(() => {
        const id = `${namespace}:${key}`;
        return memoryStore.delete(id);
      });

    const clear = (namespace?: string) =>
      Effect.sync(() => {
        if (namespace && namespace !== 'all') {
          for (const [id] of memoryStore) {
            if (id.startsWith(`${namespace}:`)) {
              memoryStore.delete(id);
            }
          }
        } else {
          memoryStore.clear();
        }
      });

    const search = (pattern: string, namespace?: string) =>
      Effect.sync(() => {
        const searchPattern = pattern.replace(/\*/g, '.*');
        const regex = new RegExp(searchPattern, 'i');

        return Array.from(memoryStore.values()).filter((entry) => {
          const matchesNamespace =
            !namespace || namespace === 'all' || entry.namespace === namespace;
          const matchesPattern = regex.test(entry.key) || regex.test(entry.value);
          return matchesNamespace && matchesPattern;
        });
      });

    return {
      set,
      get,
      list,
      delete: deleteEntry,
      clear,
      search,
    } as MemoryService;
  })
);

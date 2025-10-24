/**
 * Effect-based Base database client
 * Replaces @libsql/client with @effect/sql-libsql
 */

import { Context, Effect, Layer } from 'effect';
import { LibsqlClient } from '@effect/sql-libsql';
import { FileSystem, Path } from '@effect/platform';
import { DatabaseError } from '../errors.js';

/**
 * Database service interface
 */
export interface DatabaseService {
  readonly sql: any;
  readonly initialize: Effect.Effect<void, DatabaseError, never>;
  readonly close: Effect.Effect<void, never, never>;
}

/**
 * Database service tag
 */
export const Database = Context.GenericTag('DatabaseService');

/**
 * Create database layer
 */
export const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    // Ensure database directory exists
    const dbDir = path.join('.sylphx-flow');
    yield* fs.makeDirectory(dbDir, { recursive: true });

    // Create SQL client using libsql
    const sql = yield* LibsqlClient.make({
      url: 'file:.sylphx-flow/memory.db',
    });

    const initialize = Effect.gen(function* () {
      try {
        // Create memory table if it doesn't exist
        yield* sql`
          CREATE TABLE IF NOT EXISTS memory_table (
            key TEXT NOT NULL,
            namespace TEXT NOT NULL DEFAULT 'default',
            value TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (key, namespace)
          )
        `;

        // Create indexes
        yield* sql`CREATE INDEX IF NOT EXISTS idx_memory_namespace ON memory_table (namespace)`;
        yield* sql`CREATE INDEX IF NOT EXISTS idx_memory_timestamp ON memory_table (timestamp)`;
        yield* sql`CREATE INDEX IF NOT EXISTS idx_memory_key ON memory_table (key)`;
      } catch (error) {
        yield* Effect.fail(
          new DatabaseError({
            message: `Failed to initialize database: ${error}`,
            operation: 'initialize',
            cause: error,
          })
        );
      }
    });

    const close = Effect.sync(() => {}); // libSQL doesn't need explicit closing

    return {
      sql,
      initialize,
      close,
    } as DatabaseService;
  })
).pipe(
  Layer.provide(
    LibsqlClient.layer({
      url: 'file:.sylphx-flow/memory.db',
    })
  )
);

import * as fs from 'node:fs';
import * as path from 'node:path';
import { pipe } from '@effect/data/Function';
import * as Effect from '@effect/io/Effect';
import { Layer } from '@effect/io/Layer';
import * as SqlClient from '@effect/sql/SqlClient';
import { createClient } from '@libsql/client';

// Tag for SqlClient
export interface DbTag {
  readonly _: unique symbol;
}
export const DbTag = Context.GenericTag<DbTag, SqlClient.SqlClient>('@services/DbTag');
export type DbTag = Context.Tag.Service<DbTag['_'], SqlClient.SqlClient>;

// Function to create libsql client
const makeLibsqlClient = () => {
  const memoryDir = path.join(process.cwd(), '.sylphx-flow');
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
  const dbPath = path.join(memoryDir, 'memory.db');
  const client = createClient({
    url: `file:${dbPath}`,
  });
  return { client, dbPath };
};

// Acquire release for the client (libsql client doesn't require close for file db, but we can noop it)
const acquireLibsql = Effect.acquireRelease(
  Effect.sync(() => makeLibsqlClient().client),
  (client) =>
    Effect.sync(() => {
      client.close?.();
    })
);

// Initialize tables in the layer
const initializeDb = (client: any) =>
  Effect.promise(() =>
    Promise.all([
      client.execute(`
      CREATE TABLE IF NOT EXISTS memory (
        key TEXT NOT NULL,
        namespace TEXT NOT NULL DEFAULT 'default',
        value TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (key, namespace)
      )
    `),
      client.execute(`
      CREATE INDEX IF NOT EXISTS idx_memory_namespace ON memory(namespace)
    `),
      client.execute(`
      CREATE INDEX IF NOT EXISTS idx_memory_timestamp ON memory(timestamp)
    `),
      client.execute(`
      CREATE INDEX IF NOT EXISTS idx_memory_key ON memory(key)
    `),
    ])
  );

// Layer providing SqlClient via libsql with initialization
export const DbLayer = Layer.scoped(
  DbTag,
  pipe(
    acquireLibsql,
    Effect.tap((client) => initializeDb(client)),
    Effect.flatMap((client) => SqlClient.libsqlSqlClient(client)),
    Effect.mapError((e) => new Error(`Db layer failed: ${e}`))
  )
);

// For testing
export const TestDbLayer = Layer.test(DbTag, {
  execute: (statement) => Effect.succeed({ rows: [{ test: 1 }], rowsAffected: 0 }),
  // Add more stubs as needed
} satisfies SqlClient.SqlClient);

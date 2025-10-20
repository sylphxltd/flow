import * as Effect from 'effect/Effect';
import { Layer } from 'effect/Layer';
import { Context } from 'effect/Context';
import * as SqlClient from '@effect/sql/SqlClient';
import { createClient } from '@libsql/client';
import { Sql } from '@effect/sql/Sql';
import { FileSystem } from '@effect/platform/FileSystem';
import { Path } from '@effect/platform/Path';
import * as Sqlite from '@effect/sql/Sqlite'; // If needed for types

// Tag for SqlClient
export interface DbTag {
  readonly _: unique symbol;
}
export const DbTag = Context.GenericTag<DbTag, SqlClient.SqlClient>('@services/DbTag');
export type DbTag = Context.Tag.Service<DbTag['_'], SqlClient.SqlClient>;

// Effect to create libsql client with FS directory management
const makeLibsqlClient = Effect.gen(function* (_) {
  const fs = yield* _(FileSystem);
  const cwd = Path.cwd();
  const memoryDir = Path.join(cwd, Path.make('.sylphx-flow'));
  const exists = yield* _(fs.exists(memoryDir));
  if (!exists) {
    yield* _(fs.makeDirectory(memoryDir, { recursive: true }));
  }
  const dbPath = Path.join(memoryDir, Path.make('memory.db'));
  const url = `file:${dbPath.toString()}`;
  const client = createClient({ url });
  return { client, dbPath };
});

// Acquire release for the client
const acquireLibsql = Effect.acquireRelease(
  makeLibsqlClient,
  ({ client }) => Effect.sync(() => client.close?.())
);

// Initialize tables
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
    Effect.flatMap((_) => Effect.promise(() => _.client)),
    Effect.flatMap((client) => initializeDb(client)),
    Effect.flatMap((_) => SqlClient.libsqlSqlClient(_.client)),
    Effect.mapError((e) => new Error(`Db layer failed: ${String(e)}`))
  )
);

// For testing - mock SqlClient
export const TestDbLayer = Layer.test(DbTag, {
  execute: (_: Sql.Sql) => Effect.succeed({ rows: [], rowsAffected: 0 }),
  transaction: () => Effect.succeed({} as any),
} satisfies SqlClient.SqlClient);


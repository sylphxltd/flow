import { Context, pipe } from '@effect/data/Function';
import * as Effect from '@effect/io/Effect';
import type * as PgStatement from '@effect/sql/PgStatement'; // For typed, but adapt for sqlite
import { Schema } from '@effect/sql/Schema';
import { sql } from '@effect/sql/Sql';
import * as SqlClient from '@effect/sql/SqlClient';

export interface DbService {
  readonly query: <A>(
    query: string | PgStatement.PgStatement<A[]>,
    params?: any[]
  ) => Effect.Effect<never, string, { rows: A[] }>;
  readonly execute: <A>(
    query: string | PgStatement.PgStatement<A[]>,
    params?: any[]
  ) => Effect.Effect<never, string, { rows: A[]; rowsAffected: number }>;
  readonly transaction: <R, E, A>(
    txEffect: Effect.Effect<R, E, A>
  ) => Effect.Effect<R, E | string, A>;
  readonly set: (key: string, value: any, namespace?: string) => Effect.Effect<never, string, void>;
  readonly get: (key: string, namespace?: string) => Effect.Effect<never, string, any | null>;
}

export const DbService = Context.GenericTag<DbService>('@services/DbService');

const serializeValue = (value: any) => Effect.sync(() => JSON.stringify(value));
const deserializeValue = (value: string) =>
  Effect.tryPromise({
    try: () => JSON.parse(value),
    catch: () => value,
  });

export const makeDbService = (client: SqlClient.SqlClient) => {
  const service = {
    query: <A>(query: string, params: any[] = []) =>
      pipe(
        sql.rawQuery(query)(...params),
        Effect.flatMap((q) => client.execute(q as any)),
        Effect.map((result) => ({ rows: result.rows as A[] })),
        Effect.mapError((e) => `Query error: ${String(e)}`)
      ),
    execute: <A>(query: string, params: any[] = []) =>
      pipe(
        sql.rawQuery(query)(...params),
        Effect.flatMap((q) => client.execute(q as any)),
        Effect.mapError((e) => `Execute error: ${String(e)}`)
      ),
    transaction: <R, E, A>(txEffect: Effect.Effect<R, E, A>) =>
      pipe(
        client.transaction(txEffect),
        Effect.mapError((e) => `Transaction error: ${String(e)}`)
      ),
    set: (key: string, value: any, namespace = 'default') =>
      pipe(
        Effect.sync(() => {
          const now = new Date();
          return {
            timestamp: now.getTime(),
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          };
        }),
        Effect.flatMap(({ timestamp, created_at, updated_at }) =>
          pipe(
            serializeValue(value),
            Effect.flatMap(
              (serialized) =>
                // Check if exists
                service.query<{ exists: number }>(
                  'SELECT 1 as exists FROM memory WHERE key = ? AND namespace = ?',
                  [key, namespace]
                ),
              Effect.flatMap((res) => {
                if (res.rows[0]?.exists) {
                  return service.execute(
                    'UPDATE memory SET value = ?, timestamp = ?, updated_at = ? WHERE key = ? AND namespace = ?',
                    [serialized, timestamp, updated_at, key, namespace]
                  );
                } else {
                  return service.execute(
                    'INSERT INTO memory (key, namespace, value, timestamp, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [key, namespace, serialized, timestamp, created_at, updated_at]
                  );
                }
              })
            )
          )
        ),
        Effect.asUnit,
        Effect.mapError((e) => `Set error: ${String(e)}`)
      ),
    get: (key: string, namespace = 'default') =>
      pipe(
        service.query<any>('SELECT * FROM memory WHERE key = ? AND namespace = ?', [
          key,
          namespace,
        ]),
        Effect.map((res) => res.rows[0]),
        Effect.flatMap((row) =>
          row
            ? pipe(
                Effect.sync(() => row.value),
                deserializeValue
              )
            : Effect.succeed(null)
        ),
        Effect.mapError((e) => `Get error: ${String(e)}`)
      ),
  } as DbService;

  return service;
};

export const DbServiceLive = Layer.effect(DbService)(
  pipe(
    Effect.service(SqlClient.SqlClient),
    Effect.map(makeDbService),
    Effect.mapError((e) => new Error(String(e)))
  )
);

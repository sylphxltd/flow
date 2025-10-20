import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as Effect from '@effect/io/Effect';
import { pipe } from '@effect/data/Function';
import { Layer } from '@effect/io/Layer';
import { Scope } from '@effect/io/Scope';
import * as Context from '@effect/data/Context';
import { createClient } from '@libsql/client';
import * as SqlClient from '@effect/sql/SqlClient';

describe('DbLayer', () => {
  let program: Effect.Effect<never, never, Scope.Scope>;
  let layer: Layer.Layer<never, never, Scope.Scope>;

  beforeEach(() => {
    // This will fail initially as DbLayer doesn't exist
    // @ts-expect-error
    layer = DbLayer.layer;
    program = pipe(
      Effect.gen(function* (_) {
        const client = yield* _(SqlClient.SqlClient);
        const result = yield* _(client.execute('SELECT 1 as test'));
        return result.rows[0]?.test;
      }),
      Effect.scoped,
      Effect.provide(layer)
    );
  });

  afterEach(async () => {
    // Cleanup if needed
  });

  it('should connect to the database successfully', async () => {
    const result = await Effect.runPromise(program);
    expect(result).toBe(1);
  });
});

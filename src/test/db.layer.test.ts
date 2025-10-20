import * as Context from '@effect/data/Context';
import { pipe } from '@effect/data/Function';
import * as Effect from '@effect/io/Effect';
import type { Layer } from '@effect/io/Layer';
import type { Scope } from '@effect/io/Scope';
import * as SqlClient from '@effect/sql/SqlClient';
import { createClient } from '@libsql/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

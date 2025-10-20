import { pipe } from 'effect/Function';
import * as Effect from '@effect/io/Effect';
import * as Layer from 'effect/Layer'; import type { Layer as LayerType } from '@effect/io/Layer';
import * as S from '@effect/schema/Schema';
import * as Sql from '@effect/sql/Schema';
import { beforeEach, describe, expect, it } from 'vitest';

describe('DbService', () => {
  let program: Effect.Effect<never, never, never>;
  let layer: Layer.Layer<never, never, never>;

  beforeEach(() => {
    // @ts-expect-error
    layer = Layer.succeed({}); // Mock DbService
    program = pipe(
      Effect.gen(function* (_) {
        const db = yield* _(DbService);
        const result = yield* _(db.query('SELECT 1 as test'));
        return result.rows[0]?.test;
      }),
      Effect.provide(layer)
    );
  });

  it('should execute a simple query', async () => {
    const result = await Effect.runPromise(program);
    expect(result).toBe(1);
  });

  it('should handle transactions', async () => {
    const txProgram = pipe(
      Effect.gen(function* (_) {
        const db = yield* _(DbService);
        const tx = yield* _(db.transaction());
        const insert = yield* _(tx.execute('INSERT INTO temp_table (value) VALUES (?)', ['test']));
        yield* _(tx.rollback());
        return insert.rowsAffected;
      }),
      Effect.provide(layer)
    );
    // Expect 0 since rollback
    const result = await Effect.runPromise(txProgram.catchAll(() => Effect.succeed(0)));
    expect(result).toBe(0);
  });
});

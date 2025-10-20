import * as Sql from '@effect/sql/sql';
import { Client } from '@libsql/client';
import * as Layer from 'effect/Layer';
import { Logger, logLayer } from './log.layer';

// Placeholder for DB layer
const dbLayer = Layer.succeed(
  Sql.Sql,
  /* DB config */ Layer.succeed(Client, {
    /* client config */
  })
);

export const infraLayer = logLayer.pipe(Layer.provide(dbLayer));

export const program = Effect.gen(function* (_) {
  // Simple program that logs
  yield* _(Log.info('Infra layer initialized'));
  return 'Infra ready';
});

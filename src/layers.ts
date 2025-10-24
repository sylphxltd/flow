/**
 * Effect service layers for Sylphx Flow
 * Provides dependency injection structure for all services
 */

import { Context, Layer } from 'effect';
import { Path } from '@effect/platform';
import { SqlClient } from '@effect/sql';
import { LibsqlClient } from '@effect/sql-libsql';

/**
 * Service tags for dependency injection
 */

// Database service
export class Database extends Context.Tag('Database')<Database, typeof SqlClient.SqlClient>() {}

// Path service
export const PathLive = Path.layer;

// Database layer using libSQL
export const DatabaseLive = Layer.succeed(Database, SqlClient.SqlClient);

/**
 * Combined service layer
 */
export const ServicesLive = Layer.mergeAll(PathLive, DatabaseLive);

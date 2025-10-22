import { SqlClient } from '@effect/sql';
import { LibsqlClient } from '@effect/sql-libsql';
import { Context, Effect, Layer, Redacted } from 'effect';
import { MemoryError } from './service-types.js';

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  readonly url: string;
  readonly authToken?: string;
  readonly maxConnections?: number;
  readonly connectionTimeout?: number;
}

// ============================================================================
// DATABASE SERVICE INTERFACE
// ============================================================================

/**
 * Database service interface
 */
export interface DatabaseService {
  readonly initialize: () => Effect.Effect<void, MemoryError, SqlClient.SqlClient>;
  readonly close: () => Effect.Effect<void, MemoryError, never>;
  readonly healthCheck: () => Effect.Effect<boolean, MemoryError, SqlClient.SqlClient>;
  readonly getSqlClient: () => Effect.Effect<SqlClient.SqlClient, MemoryError, SqlClient.SqlClient>;
}

/**
 * Database service tag
 */
export const DatabaseService = Context.GenericTag<DatabaseService>('DatabaseService');

// ============================================================================
// DATABASE SERVICE IMPLEMENTATION
// ============================================================================

/**
 * Create database service with Effect SQL
 */
const makeDatabaseService = (config: DatabaseConfig) =>
  Effect.gen(function* () {
    // Initialize database
    const initialize = () =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        // Test connection
        yield* sql`SELECT 1 as test`.pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              new MemoryError(
                `Failed to connect to database: ${error}`,
                error as Error,
                'initialize'
              )
            )
          )
        );

        // Initialize schema will be handled by individual services
      }).pipe(Effect.scoped);

    const close = () =>
      Effect.gen(function* () {
        // Effect SQL handles connection cleanup automatically
        yield* Effect.void;
      });

    const healthCheck = () =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        return yield* sql`SELECT 1 as test`.pipe(
          Effect.map(() => true),
          Effect.catchAll(() => Effect.succeed(false))
        );
      }).pipe(Effect.scoped);

    const getSqlClient = () =>
      Effect.gen(function* () {
        return yield* SqlClient.SqlClient;
      });

    return {
      initialize,
      close,
      healthCheck,
      getSqlClient,
    } as DatabaseService;
  });

// ============================================================================
// SERVICE LAYERS
// ============================================================================

/**
 * Create database service layer
 */
export const DatabaseServiceLive = (config: DatabaseConfig) =>
  Layer.effect(DatabaseService, makeDatabaseService(config)).pipe(
    Layer.provide(
      LibsqlClient.layer({
        url: config.url,
        authToken: config.authToken ? Redacted.make(config.authToken) : undefined,
      })
    )
  );

/**
 * Default database configuration for development
 */
export const DefaultDatabaseConfig: DatabaseConfig = {
  url: 'file:.sylphx-flow/memory.db',
  maxConnections: 10,
  connectionTimeout: 30000,
};

/**
 * Default database service layer
 */
export const DefaultDatabaseServiceLive = DatabaseServiceLive(DefaultDatabaseConfig);

// ============================================================================
// TEST LAYER
// ============================================================================

/**
 * In-memory database for testing
 */
export const TestDatabaseServiceLive = Layer.effect(
  DatabaseService,
  Effect.gen(function* () {
    const initialize = () =>
      Effect.gen(function* () {
        // In-memory test database initialization
        yield* Effect.void;
      });

    const close = () =>
      Effect.gen(function* () {
        yield* Effect.void;
      });

    const healthCheck = () =>
      Effect.gen(function* () {
        return true; // Always healthy in tests
      });

    const getSqlClient = () =>
      Effect.gen(function* () {
        // Return a mock SQL client for tests with template literal support
        const mockSql = (strings: TemplateStringsArray, ...values: any[]) =>
          Effect.succeed({ rows: [], changes: 0 });

        const mockClient = {
          query: mockSql,
          execute: mockSql,
          transaction: <A, E, R>(effect: Effect.Effect<A, E, R>) => effect,
        };

        // Make the client callable as a template literal
        const client = ((strings: TemplateStringsArray, ...values: any[]) =>
          Effect.succeed({ rows: [], changes: 0 })) as any;

        // Copy all methods to the callable function
        Object.assign(client, mockClient);

        return client;
      });

    return {
      initialize,
      close,
      healthCheck,
      getSqlClient,
    } as DatabaseService;
  })
);

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Create database configuration from environment variables
 */
export const createDatabaseConfig = (): Effect.Effect<DatabaseConfig, never, never> =>
  Effect.sync(() => ({
    url: process.env.DATABASE_URL || DefaultDatabaseConfig.url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
    maxConnections: process.env.DATABASE_MAX_CONNECTIONS
      ? Number.parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10)
      : DefaultDatabaseConfig.maxConnections,
    connectionTimeout: process.env.DATABASE_CONNECTION_TIMEOUT
      ? Number.parseInt(process.env.DATABASE_CONNECTION_TIMEOUT, 10)
      : DefaultDatabaseConfig.connectionTimeout,
  }));

/**
 * Get database file path from URL
 */
export const getDatabasePath = (config: DatabaseConfig): string => {
  if (config.url.startsWith('file:')) {
    return config.url.replace('file:', '');
  }
  return config.url;
};

/**
 * Ensure database directory exists
 */
export const ensureDatabaseDirectory = (
  config: DatabaseConfig
): Effect.Effect<void, MemoryError, never> =>
  Effect.gen(function* () {
    const fs = yield* Effect.promise(() => import('node:fs'));
    const path = yield* Effect.promise(() => import('node:path'));

    const dbPath = getDatabasePath(config);
    const dbDir = path.dirname(dbPath);

    try {
      yield* Effect.promise(() => fs.promises.mkdir(dbDir, { recursive: true }));
    } catch (error) {
      yield* Effect.fail(
        new MemoryError(
          `Failed to create database directory: ${error}`,
          error as Error,
          'ensureDatabaseDirectory'
        )
      );
    }
  });

/**
 * Database migration utilities
 */
export const DatabaseMigrations = {
  /**
   * Create memory table
   */
  createMemoryTable: (sql: SqlClient.SqlClient) =>
    Effect.gen(function* () {
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
              'createMemoryTable'
            )
          )
        )
      );

      // Create indexes
      yield* sql`
        CREATE INDEX IF NOT EXISTS idx_memory_key ON memory(key)
      `.pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new MemoryError(
              `Failed to create key index: ${error}`,
              error as Error,
              'createMemoryTable'
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
              'createMemoryTable'
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
              'createMemoryTable'
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
              'createMemoryTable'
            )
          )
        )
      );
    }),

  /**
   * Run all migrations
   */
  runMigrations: (sql: SqlClient.SqlClient) =>
    Effect.gen(function* () {
      yield* DatabaseMigrations.createMemoryTable(sql);
    }),
};

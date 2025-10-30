/**
 * Functional Repository Pattern Implementation
 * Pure functions for data operations, side effects isolated
 *
 * DESIGN RATIONALE:
 * - Separate pure query building from side effects (execution)
 * - Return Result instead of throwing exceptions
 * - Composable query builders
 * - Type-safe operations
 * - Dependency injection through function parameters
 */

import type { DatabaseError } from '../core/functional/error-types.js';
import { databaseError } from '../core/functional/error-types.js';
import type { Result } from '../core/functional/result.js';
import { failure, success, tryCatchAsync } from '../core/functional/result.js';
import type { IDatabaseConnection, ILogger } from '../core/interfaces.js';

/**
 * Query building (pure functions - no side effects)
 */

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  where?: Record<string, any>;
}

export interface QueryParts {
  query: string;
  params: any[];
}

/**
 * Build SELECT query
 */
export const buildSelectQuery = (
  tableName: string,
  options: QueryOptions = {}
): QueryParts => {
  let query = `SELECT * FROM ${tableName}`;
  const params: any[] = [];
  const conditions: string[] = [];

  // Add WHERE conditions
  if (options.where) {
    Object.entries(options.where).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
  }

  // Add ORDER BY
  if (options.orderBy) {
    const direction = options.orderDirection || 'ASC';
    query += ` ORDER BY ${options.orderBy} ${direction}`;
  }

  // Add LIMIT and OFFSET
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);

    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  return { query, params };
};

/**
 * Build INSERT query
 */
export const buildInsertQuery = <T>(
  tableName: string,
  data: Partial<T>
): Result<QueryParts, DatabaseError> => {
  const keys = Object.keys(data).filter((key) => data[key as keyof T] !== undefined);

  if (keys.length === 0) {
    return failure(
      databaseError('No data provided for creation', 'insert', { table: tableName })
    );
  }

  const columns = keys.join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map((key) => data[key as keyof T]);

  const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;

  return success({ query, params: values });
};

/**
 * Build UPDATE query
 */
export const buildUpdateQuery = <T>(
  tableName: string,
  id: string | number,
  data: Partial<T>
): Result<QueryParts, DatabaseError> => {
  const keys = Object.keys(data).filter((key) => data[key as keyof T] !== undefined);

  if (keys.length === 0) {
    return failure(
      databaseError('No data provided for update', 'update', { table: tableName })
    );
  }

  const setClause = keys.map((key) => `${key} = ?`).join(', ');
  const values = keys.map((key) => data[key as keyof T]);
  values.push(id);

  const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ? RETURNING *`;

  return success({ query, params: values });
};

/**
 * Build DELETE query
 */
export const buildDeleteQuery = (
  tableName: string,
  id: string | number
): QueryParts => {
  return {
    query: `DELETE FROM ${tableName} WHERE id = ?`,
    params: [id],
  };
};

/**
 * Build COUNT query
 */
export const buildCountQuery = (
  tableName: string,
  options: { where?: Record<string, any> } = {}
): QueryParts => {
  let query = `SELECT COUNT(*) as count FROM ${tableName}`;
  const params: any[] = [];
  const conditions: string[] = [];

  if (options.where) {
    Object.entries(options.where).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
  }

  return { query, params };
};

/**
 * Query execution (side effects)
 */

/**
 * Execute query and return Result
 */
export const executeQuery = async <T>(
  db: IDatabaseConnection,
  logger: ILogger,
  tableName: string,
  query: string,
  params: any[]
): Promise<Result<T[], DatabaseError>> => {
  return tryCatchAsync(
    async () => {
      const result = await db.execute(query, params);
      return result.rows;
    },
    (error) => {
      logger.error(`Failed to execute query on ${tableName}`, error);
      return databaseError(
        `Failed to execute query on ${tableName}`,
        'query',
        { table: tableName, cause: error instanceof Error ? error : undefined }
      );
    }
  );
};

/**
 * Repository operations (composition of query building + execution)
 */

export interface Repository<T> {
  findById: (id: string | number) => Promise<Result<T | null, DatabaseError>>;
  findMany: (options?: QueryOptions) => Promise<Result<T[], DatabaseError>>;
  create: (data: Partial<T>) => Promise<Result<T, DatabaseError>>;
  update: (id: string | number, data: Partial<T>) => Promise<Result<T | null, DatabaseError>>;
  delete: (id: string | number) => Promise<Result<boolean, DatabaseError>>;
  count: (options?: { where?: Record<string, any> }) => Promise<Result<number, DatabaseError>>;
  exists: (id: string | number) => Promise<Result<boolean, DatabaseError>>;
}

/**
 * Create repository with dependency injection
 */
export const createRepository = <T>(
  db: IDatabaseConnection,
  logger: ILogger,
  tableName: string
): Repository<T> => {
  return {
    findById: async (id: string | number): Promise<Result<T | null, DatabaseError>> => {
      const queryParts = buildSelectQuery(tableName, {});
      const query = `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`;
      const result = await executeQuery<T>(db, logger, tableName, query, [id]);

      if (result._tag === 'Failure') {
        return result;
      }

      return success(result.value[0] || null);
    },

    findMany: async (options: QueryOptions = {}): Promise<Result<T[], DatabaseError>> => {
      const queryParts = buildSelectQuery(tableName, options);
      return executeQuery<T>(db, logger, tableName, queryParts.query, queryParts.params);
    },

    create: async (data: Partial<T>): Promise<Result<T, DatabaseError>> => {
      const queryResult = buildInsertQuery<T>(tableName, data);

      if (queryResult._tag === 'Failure') {
        return queryResult;
      }

      const { query, params } = queryResult.value;
      const result = await executeQuery<T>(db, logger, tableName, query, params);

      if (result._tag === 'Failure') {
        return result;
      }

      if (result.value.length === 0) {
        return failure(
          databaseError('Failed to create record', 'insert', { table: tableName })
        );
      }

      return success(result.value[0]);
    },

    update: async (
      id: string | number,
      data: Partial<T>
    ): Promise<Result<T | null, DatabaseError>> => {
      const queryResult = buildUpdateQuery<T>(tableName, id, data);

      if (queryResult._tag === 'Failure') {
        return queryResult;
      }

      const { query, params } = queryResult.value;
      const result = await executeQuery<T>(db, logger, tableName, query, params);

      if (result._tag === 'Failure') {
        return result;
      }

      return success(result.value[0] || null);
    },

    delete: async (id: string | number): Promise<Result<boolean, DatabaseError>> => {
      const queryParts = buildDeleteQuery(tableName, id);
      return tryCatchAsync(
        async () => {
          const result = await db.execute(queryParts.query, queryParts.params);
          return result.rowsAffected > 0;
        },
        (error) => {
          logger.error(`Failed to delete ${tableName} record: ${id}`, error);
          return databaseError(
            `Failed to delete ${tableName} record`,
            'delete',
            { table: tableName, cause: error instanceof Error ? error : undefined }
          );
        }
      );
    },

    count: async (options: { where?: Record<string, any> } = {}): Promise<Result<number, DatabaseError>> => {
      const queryParts = buildCountQuery(tableName, options);
      const result = await executeQuery<{ count: number }>(
        db,
        logger,
        tableName,
        queryParts.query,
        queryParts.params
      );

      if (result._tag === 'Failure') {
        return result;
      }

      return success(result.value[0].count);
    },

    exists: async (id: string | number): Promise<Result<boolean, DatabaseError>> => {
      const query = `SELECT 1 FROM ${tableName} WHERE id = ? LIMIT 1`;
      const result = await executeQuery<{ 1: number }>(db, logger, tableName, query, [id]);

      if (result._tag === 'Failure') {
        return result;
      }

      return success(result.value.length > 0);
    },
  };
};

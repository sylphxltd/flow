/**
 * Repository interface for dependency inversion
 * Abstracts data access implementation
 *
 * DESIGN RATIONALE:
 * - Depend on abstractions, not concrete implementations
 * - Enables testing with in-memory implementations
 * - Separates interface from implementation
 * - Clear contract for data access
 */

import type { DatabaseError } from '../functional/error-types.js';
import type { Result } from '../functional/result.js';

/**
 * Query options for filtering, sorting, pagination
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  where?: Record<string, any>;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Generic repository interface
 * All operations return Result for explicit error handling
 */
export interface IRepository<T, ID = string | number> {
  /**
   * Find entity by ID
   */
  findById(id: ID): Promise<Result<T | null, DatabaseError>>;

  /**
   * Find multiple entities with filtering and sorting
   */
  findMany(options?: QueryOptions): Promise<Result<T[], DatabaseError>>;

  /**
   * Find entities with pagination
   */
  findPaginated(
    page: number,
    pageSize: number,
    options?: Omit<QueryOptions, 'limit' | 'offset'>
  ): Promise<Result<PaginatedResult<T>, DatabaseError>>;

  /**
   * Create a new entity
   */
  create(data: Partial<T>): Promise<Result<T, DatabaseError>>;

  /**
   * Update an existing entity
   */
  update(id: ID, data: Partial<T>): Promise<Result<T | null, DatabaseError>>;

  /**
   * Delete an entity
   */
  delete(id: ID): Promise<Result<boolean, DatabaseError>>;

  /**
   * Count entities matching criteria
   */
  count(options?: { where?: Record<string, any> }): Promise<Result<number, DatabaseError>>;

  /**
   * Check if entity exists
   */
  exists(id: ID): Promise<Result<boolean, DatabaseError>>;
}

/**
 * Factory function type for creating repositories
 */
export type RepositoryFactory<T, ID = string | number> = (tableName: string) => IRepository<T, ID>;

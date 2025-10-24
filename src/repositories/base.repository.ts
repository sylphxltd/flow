/**
 * Base Repository Pattern Implementation
 *
 * Provides a generic repository interface for data access
 * with common CRUD operations and error handling
 */

import type { IDatabaseConnection, ILogger } from '../core/interfaces.js';
import { DatabaseError } from '../utils/database-errors.js';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  where?: Record<string, any>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export abstract class BaseRepository<T> {
  constructor(
    protected readonly db: IDatabaseConnection,
    protected readonly logger: ILogger,
    protected readonly tableName: string
  ) {}

  /**
   * Find a single record by ID
   */
  async findById(id: string | number): Promise<T | null> {
    try {
      const result = await this.db.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ? LIMIT 1`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      this.logger.error(`Failed to find ${this.tableName} by ID: ${id}`, error);
      throw new DatabaseError(
        `Failed to find ${this.tableName} by ID`,
        `${this.tableName}.findById`,
        error as Error
      );
    }
  }

  /**
   * Find all records matching criteria
   */
  async findMany(options: QueryOptions = {}): Promise<T[]> {
    try {
      let query = `SELECT * FROM ${this.tableName}`;
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
        query += ` LIMIT ?`;
        params.push(options.limit);

        if (options.offset) {
          query += ` OFFSET ?`;
          params.push(options.offset);
        }
      }

      const result = await this.db.execute(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error(`Failed to find ${this.tableName} records`, error);
      throw new DatabaseError(
        `Failed to find ${this.tableName} records`,
        `${this.tableName}.findMany`,
        error as Error
      );
    }
  }

  /**
   * Find records with pagination
   */
  async findPaginated(
    page: number = 1,
    pageSize: number = 10,
    options: Omit<QueryOptions, 'limit' | 'offset'> = {}
  ): Promise<PaginatedResult<T>> {
    try {
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const countResult = await this.db.execute(countQuery);
      const total = countResult.rows[0].total;

      // Calculate pagination
      const offset = (page - 1) * pageSize;
      const totalPages = Math.ceil(total / pageSize);

      // Get items
      const items = await this.findMany({
        ...options,
        limit: pageSize,
        offset,
      });

      return {
        items,
        total,
        page,
        pageSize,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      };
    } catch (error) {
      this.logger.error(`Failed to find paginated ${this.tableName} records`, error);
      throw new DatabaseError(
        `Failed to find paginated ${this.tableName} records`,
        `${this.tableName}.findPaginated`,
        error as Error
      );
    }
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      const keys = Object.keys(data).filter(key => data[key as keyof T] !== undefined);
      if (keys.length === 0) {
        throw new Error('No data provided for creation');
      }

      const columns = keys.join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map(key => data[key as keyof T]);

      const query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
      const result = await this.db.execute(query, values);

      return result.rows[0];
    } catch (error) {
      this.logger.error(`Failed to create ${this.tableName} record`, error);
      throw new DatabaseError(
        `Failed to create ${this.tableName} record`,
        `${this.tableName}.create`,
        error as Error
      );
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: string | number, data: Partial<T>): Promise<T | null> {
    try {
      const keys = Object.keys(data).filter(key => data[key as keyof T] !== undefined);
      if (keys.length === 0) {
        throw new Error('No data provided for update');
      }

      const setClause = keys.map(key => `${key} = ?`).join(', ');
      const values = keys.map(key => data[key as keyof T]);
      values.push(id);

      const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ? RETURNING *`;
      const result = await this.db.execute(query, values);

      return result.rows[0] || null;
    } catch (error) {
      this.logger.error(`Failed to update ${this.tableName} record: ${id}`, error);
      throw new DatabaseError(
        `Failed to update ${this.tableName} record`,
        `${this.tableName}.update`,
        error as Error
      );
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string | number): Promise<boolean> {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await this.db.execute(query, [id]);

      return result.rowsAffected > 0;
    } catch (error) {
      this.logger.error(`Failed to delete ${this.tableName} record: ${id}`, error);
      throw new DatabaseError(
        `Failed to delete ${this.tableName} record`,
        `${this.tableName}.delete`,
        error as Error
      );
    }
  }

  /**
   * Count records matching criteria
   */
  async count(options: { where?: Record<string, any> } = {}): Promise<number> {
    try {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
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

      const result = await this.db.execute(query, params);
      return result.rows[0].count;
    } catch (error) {
      this.logger.error(`Failed to count ${this.tableName} records`, error);
      throw new DatabaseError(
        `Failed to count ${this.tableName} records`,
        `${this.tableName}.count`,
        error as Error
      );
    }
  }

  /**
   * Check if a record exists
   */
  async exists(id: string | number): Promise<boolean> {
    try {
      const result = await this.db.execute(
        `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`,
        [id]
      );

      return result.rows.length > 0;
    } catch (error) {
      this.logger.error(`Failed to check if ${this.tableName} exists: ${id}`, error);
      throw new DatabaseError(
        `Failed to check if ${this.tableName} exists`,
        `${this.tableName}.exists`,
        error as Error
      );
    }
  }

  /**
   * Execute a custom query (for complex operations)
   */
  protected async executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
    try {
      const result = await this.db.execute(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error(`Failed to execute custom query on ${this.tableName}`, error);
      throw new DatabaseError(
        `Failed to execute custom query`,
        `${this.tableName}.executeQuery`,
        error as Error
      );
    }
  }
}
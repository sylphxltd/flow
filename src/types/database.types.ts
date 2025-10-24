import { z } from 'zod';

// ============================================================================
// DATABASE ENTITIES AND OPERATIONS
// ============================================================================

/**
 * Base database entity interface
 */
export interface BaseEntity {
  /** Unique identifier */
  id: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
  /** Entity version for optimistic locking */
  version?: number;
  /** Soft delete flag */
  deletedAt?: string;
  /** Entity metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Memory storage entry
 */
export interface MemoryStorageEntry extends BaseEntity {
  /** Storage namespace */
  namespace: string;
  /** Entry key */
  key: string;
  /** Entry value */
  value: unknown;
  /** Value type for serialization */
  valueType: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  /** Entry size in bytes */
  size?: number;
  /** Expiration timestamp */
  expiresAt?: string;
  /** Access count */
  accessCount?: number;
  /** Last accessed timestamp */
  lastAccessedAt?: string;
}

/**
 * Vector database entry
 */
export interface VectorStorageEntry extends BaseEntity {
  /** Entry content/text */
  content: string;
  /** Vector embedding */
  embedding: number[];
  /** Vector dimensions */
  dimensions: number;
  /** Source file path */
  sourcePath?: string;
  /** Content hash for deduplication */
  contentHash?: string;
  /** Entry type */
  type: 'document' | 'code' | 'markdown' | 'text';
  /** Language or format */
  language?: string;
  /** Token count */
  tokenCount?: number;
  /** Additional metadata */
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
    author?: string;
    project?: string;
    [key: string]: unknown;
  };
}

/**
 * Search index entry
 */
export interface SearchIndexEntry extends BaseEntity {
  /** Document ID */
  documentId: string;
  /** Term or token */
  term: string;
  /** Term frequency in document */
  frequency: number;
  /** Term position(s) in document */
  positions?: number[];
  /** Document field where term appears */
  field?: 'title' | 'content' | 'metadata' | 'all';
  /** TF-IDF score */
  tfidfScore?: number;
  /** Additional indexing metadata */
  indexMetadata?: Record<string, unknown>;
}

/**
 * Database health check result
 */
export interface DatabaseHealthCheckResult {
  /** Overall health status */
  healthy: boolean;
  /** Health check timestamp */
  timestamp: string;
  /** Error message if unhealthy */
  error?: string;
  /** Detailed health information */
  details?: {
    /** Connection status */
    connection?: 'connected' | 'disconnected' | 'error';
    /** Response time in milliseconds */
    responseTime?: number;
    /** Database size information */
    size?: {
      totalRecords: number;
      totalSize: number;
      indexes: number;
    };
    /** Memory usage */
    memory?: {
      used: number;
      available: number;
      percentage: number;
    };
    /** Additional metrics */
    metrics?: Record<string, number | string>;
  };
}

/**
 * Database query options
 */
export interface DatabaseQueryOptions {
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort order */
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  /** Filter conditions */
  where?: Record<string, unknown>;
  /** Fields to include/exclude */
  select?: string[];
  /** Include soft-deleted records */
  includeDeleted?: boolean;
  /** Query timeout in milliseconds */
  timeout?: number;
}

/**
 * Database transaction options
 */
export interface DatabaseTransactionOptions {
  /** Transaction isolation level */
  isolation?: 'read-uncommitted' | 'read-committed' | 'repeatable-read' | 'serializable';
  /** Transaction timeout in milliseconds */
  timeout?: number;
  /** Whether transaction is read-only */
  readOnly?: boolean;
  /** Transaction metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult<T = unknown> {
  /** Number of successful operations */
  successCount: number;
  /** Number of failed operations */
  failureCount: number;
  /** Total operations attempted */
  total: number;
  /** Successful results */
  successes: Array<{
    index: number;
    data?: T;
    id?: string;
  }>;
  /** Failed operations */
  failures: Array<{
    index: number;
    error: string;
    data?: unknown;
  }>;
  /** Operation duration in milliseconds */
  duration: number;
  /** Operation timestamp */
  timestamp: string;
}

/**
 * Database migration entry
 */
export interface DatabaseMigration extends BaseEntity {
  /** Migration version */
  version: string;
  /** Migration name */
  name: string;
  /** Migration description */
  description?: string;
  /** Migration type */
  type: 'schema' | 'data' | 'index' | 'config';
  /** Migration status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled-back';
  /** Migration script content */
  script?: string;
  /** Checksum for integrity verification */
  checksum?: string;
  /** Execution duration in milliseconds */
  duration?: number;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// ZOD SCHEMAS FOR RUNTIME VALIDATION
// ============================================================================

/**
 * Zod schema for BaseEntity
 */
export const BaseEntitySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().optional(),
  deletedAt: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for MemoryStorageEntry
 */
export const MemoryStorageEntrySchema = BaseEntitySchema.extend({
  namespace: z.string(),
  key: z.string(),
  value: z.unknown(),
  valueType: z.enum(['string', 'number', 'boolean', 'object', 'array', 'null']),
  size: z.number().optional(),
  expiresAt: z.string().optional(),
  accessCount: z.number().optional(),
  lastAccessedAt: z.string().optional(),
});

/**
 * Zod schema for VectorStorageEntry
 */
export const VectorStorageEntrySchema = BaseEntitySchema.extend({
  content: z.string(),
  embedding: z.array(z.number()),
  dimensions: z.number(),
  sourcePath: z.string().optional(),
  contentHash: z.string().optional(),
  type: z.enum(['document', 'code', 'markdown', 'text']),
  language: z.string().optional(),
  tokenCount: z.number().optional(),
  metadata: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      author: z.string().optional(),
      project: z.string().optional(),
    })
    .catchall(z.unknown())
    .optional(),
});

/**
 * Zod schema for SearchIndexEntry
 */
export const SearchIndexEntrySchema = BaseEntitySchema.extend({
  documentId: z.string(),
  term: z.string(),
  frequency: z.number(),
  positions: z.array(z.number()).optional(),
  field: z.enum(['title', 'content', 'metadata', 'all']).optional(),
  tfidfScore: z.number().optional(),
  indexMetadata: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for DatabaseHealthCheckResult
 */
export const DatabaseHealthCheckResultSchema = z.object({
  healthy: z.boolean(),
  timestamp: z.string(),
  error: z.string().optional(),
  details: z
    .object({
      connection: z.enum(['connected', 'disconnected', 'error']).optional(),
      responseTime: z.number().optional(),
      size: z
        .object({
          totalRecords: z.number(),
          totalSize: z.number(),
          indexes: z.number(),
        })
        .optional(),
      memory: z
        .object({
          used: z.number(),
          available: z.number(),
          percentage: z.number(),
        })
        .optional(),
      metrics: z.record(z.union([z.number(), z.string()])).optional(),
    })
    .optional(),
});

/**
 * Zod schema for DatabaseQueryOptions
 */
export const DatabaseQueryOptionsSchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
  orderBy: z
    .object({
      field: z.string(),
      direction: z.enum(['asc', 'desc']),
    })
    .optional(),
  where: z.record(z.unknown()).optional(),
  select: z.array(z.string()).optional(),
  includeDeleted: z.boolean().optional(),
  timeout: z.number().optional(),
});

/**
 * Zod schema for DatabaseTransactionOptions
 */
export const DatabaseTransactionOptionsSchema = z.object({
  isolation: z
    .enum(['read-uncommitted', 'read-committed', 'repeatable-read', 'serializable'])
    .optional(),
  timeout: z.number().optional(),
  readOnly: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for BatchOperationResult
 */
export const BatchOperationResultSchema = z.object({
  successCount: z.number(),
  failureCount: z.number(),
  total: z.number(),
  successes: z.array(
    z.object({
      index: z.number(),
      data: z.unknown().optional(),
      id: z.string().optional(),
    })
  ),
  failures: z.array(
    z.object({
      index: z.number(),
      error: z.string(),
      data: z.unknown().optional(),
    })
  ),
  duration: z.number(),
  timestamp: z.string(),
});

/**
 * Zod schema for DatabaseMigration
 */
export const DatabaseMigrationSchema = BaseEntitySchema.extend({
  version: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['schema', 'data', 'index', 'config']),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'rolled-back']),
  script: z.string().optional(),
  checksum: z.string().optional(),
  duration: z.number().optional(),
  error: z.string().optional(),
});

// ============================================================================
// TYPE GUARDS FOR RUNTIME TYPE CHECKING
// ============================================================================

/**
 * Type guard to check if value is BaseEntity
 */
export function isBaseEntity(value: unknown): value is BaseEntity {
  return BaseEntitySchema.safeParse(value).success;
}

/**
 * Type guard to check if value is MemoryStorageEntry
 */
export function isMemoryStorageEntry(value: unknown): value is MemoryStorageEntry {
  return MemoryStorageEntrySchema.safeParse(value).success;
}

/**
 * Type guard to check if value is VectorStorageEntry
 */
export function isVectorStorageEntry(value: unknown): value is VectorStorageEntry {
  return VectorStorageEntrySchema.safeParse(value).success;
}

/**
 * Type guard to check if value is SearchIndexEntry
 */
export function isSearchIndexEntry(value: unknown): value is SearchIndexEntry {
  return SearchIndexEntrySchema.safeParse(value).success;
}

/**
 * Type guard to check if value is DatabaseHealthCheckResult
 */
export function isDatabaseHealthCheckResult(value: unknown): value is DatabaseHealthCheckResult {
  return DatabaseHealthCheckResultSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is DatabaseQueryOptions
 */
export function isDatabaseQueryOptions(value: unknown): value is DatabaseQueryOptions {
  return DatabaseQueryOptionsSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is BatchOperationResult
 */
export function isBatchOperationResult(value: unknown): value is BatchOperationResult {
  return BatchOperationResultSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is DatabaseMigration
 */
export function isDatabaseMigration(value: unknown): value is DatabaseMigration {
  return DatabaseMigrationSchema.safeParse(value).success;
}

// ============================================================================
// UTILITY TYPES AND FUNCTIONS
// ============================================================================

/**
 * Generic database result wrapper
 */
export interface DatabaseResult<T = unknown> {
  /** Success status */
  success: boolean;
  /** Result data */
  data?: T;
  /** Error information */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  /** Result metadata */
  metadata?: {
    executionTime: number;
    timestamp: string;
    affectedRows?: number;
  };
}

/**
 * Type for database event listeners
 */
export type DatabaseEventListener<T = unknown> = (event: DatabaseEvent<T>) => void;

/**
 * Database event interface
 */
export interface DatabaseEvent<T = unknown> {
  /** Event type */
  type: 'insert' | 'update' | 'delete' | 'query' | 'transaction' | 'error';
  /** Event timestamp */
  timestamp: string;
  /** Event data */
  data?: T;
  /** Event metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Create a safe database result
 */
export function createDatabaseResult<T>(
  success: boolean,
  data?: T,
  error?: { code: string; message: string; details?: Record<string, unknown> },
  metadata?: { executionTime: number; timestamp: string; affectedRows?: number }
): DatabaseResult<T> {
  return {
    success,
    data,
    error,
    metadata: metadata || {
      executionTime: 0,
      timestamp: new Date().toISOString(),
    },
  };
}

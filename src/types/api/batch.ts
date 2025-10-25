import { z } from 'zod';
import type { ApiError } from './errors.js';

// ============================================================================
// BATCH API INTERFACES
// ============================================================================

/**
 * Batch API result for processing multiple operations
 */
export interface BatchApiResult<T = unknown> {
  /** Batch operation ID */
  batchId: string;
  /** Total number of operations */
  total: number;
  /** Number of successful operations */
  successful: number;
  /** Number of failed operations */
  failed: number;
  /** Results for individual operations */
  results: BatchOperationResult<T>[];
  /** Batch operation metadata */
  metadata?: {
    /** Batch start timestamp */
    startedAt: string;
    /** Batch completion timestamp */
    completedAt?: string;
    /** Total processing time in milliseconds */
    duration?: number;
    /** Processing batch size */
    batchSize?: number;
    /** Number of concurrent operations */
    concurrency?: number;
  };
}

/**
 * Individual batch operation result
 */
export interface BatchOperationResult<T = unknown> {
  /** Operation index in the batch */
  index: number;
  /** Operation ID */
  id: string;
  /** Operation success status */
  success: boolean;
  /** Operation result data */
  data?: T;
  /** Operation error (if failed) */
  error?: ApiError;
  /** Operation processing time in milliseconds */
  processingTime?: number;
  /** Operation retry attempts */
  retryCount?: number;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const BatchOperationResultSchema = z.object({
  index: z.number().min(0),
  id: z.string(),
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      statusCode: z.number().optional(),
      type: z.enum([
        'validation',
        'authentication',
        'authorization',
        'not_found',
        'conflict',
        'rate_limit',
        'server_error',
        'network',
        'timeout',
      ]),
      description: z.string().optional(),
      fieldErrors: z.record(z.array(z.string())).optional(),
      stack: z.string().optional(),
      context: z.record(z.unknown()).optional(),
      suggestions: z.array(z.string()).optional(),
    })
    .optional(),
  processingTime: z.number().min(0).optional(),
  retryCount: z.number().min(0).optional(),
});

export const BatchApiResultSchema = z.object({
  batchId: z.string(),
  total: z.number().min(0),
  successful: z.number().min(0),
  failed: z.number().min(0),
  results: z.array(BatchOperationResultSchema),
  metadata: z
    .object({
      startedAt: z.string(),
      completedAt: z.string().optional(),
      duration: z.number().min(0).optional(),
      batchSize: z.number().positive().optional(),
      concurrency: z.number().positive().optional(),
    })
    .optional(),
});

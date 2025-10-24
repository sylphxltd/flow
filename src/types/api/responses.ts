import { z } from 'zod';

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  /** Response success status */
  success: boolean;
  /** Response data */
  data?: T;
  /** Response message */
  message?: string;
  /** Response metadata */
  metadata?: {
    /** Response timestamp */
    timestamp: string;
    /** Request ID for tracing */
    requestId?: string;
    /** API version */
    version?: string;
    /** Response time in milliseconds */
    responseTime?: number;
    /** Pagination information */
    pagination?: PaginationInfo;
    /** Rate limiting information */
    rateLimit?: RateLimitInfo;
  };
  /** Error information */
  error?: ApiError;
}

/**
 * HTTP response wrapper
 */
export interface HttpResponse<T = unknown> {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** HTTP status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Response metadata */
  metadata?: {
    /** Response timestamp */
    timestamp: string;
    /** Request ID for tracing */
    requestId?: string;
    /** Response time in milliseconds */
    responseTime?: number;
    /** Response size in bytes */
    size?: number;
    /** Cached response indicator */
    fromCache?: boolean;
  };
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there's a next page */
  hasNext: boolean;
  /** Whether there's a previous page */
  hasPrev: boolean;
  /** Next page cursor (for cursor-based pagination) */
  nextCursor?: string;
  /** Previous page cursor (for cursor-based pagination) */
  prevCursor?: string;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  /** Maximum requests allowed */
  limit: number;
  /** Remaining requests */
  remaining: number;
  /** Reset timestamp (Unix timestamp) */
  resetAt: number;
  /** Reset time in ISO format */
  resetTime?: string;
  /** Retry after seconds */
  retryAfter?: number;
  /** Request window in seconds */
  window?: number;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const PaginationInfoSchema = z.object({
  page: z.number().min(1),
  limit: z.number().min(1).max(100),
  total: z.number().min(0),
  totalPages: z.number().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
  nextCursor: z.string().optional(),
  prevCursor: z.string().optional(),
});

export const RateLimitInfoSchema = z.object({
  limit: z.number().min(1),
  remaining: z.number().min(0),
  resetAt: z.number().min(0),
  resetTime: z.string().optional(),
  retryAfter: z.number().optional(),
  window: z.number().optional(),
});

export const ApiErrorSchema = z.object({
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
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  message: z.string().optional(),
  metadata: z.object({
    timestamp: z.string(),
    requestId: z.string().optional(),
    version: z.string().optional(),
    responseTime: z.number().optional(),
    pagination: PaginationInfoSchema.optional(),
    rateLimit: RateLimitInfoSchema.optional(),
  }).optional(),
  error: ApiErrorSchema.optional(),
});

export const HttpResponseSchema = z.object({
  data: z.unknown(),
  status: z.number(),
  statusText: z.string(),
  headers: z.record(z.string()),
  metadata: z.object({
    timestamp: z.string(),
    requestId: z.string().optional(),
    responseTime: z.number().optional(),
    size: z.number().optional(),
    fromCache: z.boolean().optional(),
  }).optional(),
});
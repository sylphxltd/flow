import { z } from 'zod';

// ============================================================================
// API ERROR INTERFACES
// ============================================================================

/**
 * API error information
 */
export interface ApiError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** HTTP status code */
  statusCode?: number;
  /** Error type for categorization */
  type:
    | 'validation'
    | 'authentication'
    | 'authorization'
    | 'not_found'
    | 'conflict'
    | 'rate_limit'
    | 'server_error'
    | 'network'
    | 'timeout';
  /** Detailed error description */
  description?: string;
  /** Field-specific errors (for validation errors) */
  fieldErrors?: Record<string, string[]>;
  /** Stack trace (development only) */
  stack?: string;
  /** Error context information */
  context?: Record<string, unknown>;
  /** Suggestions for resolution */
  suggestions?: string[];
}

/**
 * Enhanced error with additional context
 */
export interface EnhancedError extends Error {
  /** Error code */
  code: string;
  /** HTTP status code */
  statusCode?: number;
  /** Error type */
  type: ApiError['type'];
  /** Error context */
  context?: ErrorContext;
  /** Suggestions for resolution */
  suggestions?: string[];
  /** Original error that caused this error */
  originalError?: Error;
  /** Timestamp when error occurred */
  timestamp: string;
  /** Request ID for tracing */
  requestId?: string;
}

/**
 * Error context information
 */
export interface ErrorContext {
  /** User ID if available */
  userId?: string;
  /** Session ID if available */
  sessionId?: string;
  /** IP address if available */
  ipAddress?: string;
  /** User agent if available */
  userAgent?: string;
  /** Request path */
  path?: string;
  /** HTTP method */
  method?: string;
  /** Additional context data */
  data?: Record<string, unknown>;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const ErrorContextSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  path: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']).optional(),
  data: z.record(z.unknown()).optional(),
});

export const EnhancedErrorSchema = z.object({
  name: z.string(),
  message: z.string(),
  code: z.string(),
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
  context: ErrorContextSchema.optional(),
  suggestions: z.array(z.string()).optional(),
  originalError: z.instanceof(Error).optional(),
  timestamp: z.string(),
  requestId: z.string().optional(),
  stack: z.string().optional(),
});

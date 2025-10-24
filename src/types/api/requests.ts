import { z } from 'zod';

// ============================================================================
// API REQUEST INTERFACES
// ============================================================================

/**
 * HTTP request configuration
 */
export interface HttpRequestConfig {
  /** Request URL */
  url: string;
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: unknown;
  /** Query parameters */
  params?: Record<string, string | number | boolean>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts */
  retries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Whether to validate SSL certificates */
  validateSSL?: boolean;
  /** Request ID for tracing */
  requestId?: string;
  /** User agent */
  userAgent?: string;
  /** Authentication token */
  token?: string;
  /** API key */
  apiKey?: string;
  /** Request metadata */
  metadata?: {
    /** Source of the request */
    source?: string;
    /** Request priority */
    priority?: 'low' | 'normal' | 'high';
    /** Request tags */
    tags?: string[];
    /** Custom metadata */
    data?: Record<string, unknown>;
  };
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const HttpRequestConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  timeout: z.number().positive().optional(),
  retries: z.number().min(0).optional(),
  retryDelay: z.number().min(0).optional(),
  validateSSL: z.boolean().optional(),
  requestId: z.string().optional(),
  userAgent: z.string().optional(),
  token: z.string().optional(),
  apiKey: z.string().optional(),
  metadata: z.object({
    source: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high']).optional(),
    tags: z.array(z.string()).optional(),
    data: z.record(z.unknown()).optional(),
  }).optional(),
});
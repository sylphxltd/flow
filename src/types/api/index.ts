/**
 * API types barrel export
 * Organized API-related types and interfaces
 */

// Response types
export type {
  ApiResponse,
  HttpResponse,
  PaginationInfo,
  RateLimitInfo,
} from './responses.js';

export {
  PaginationInfoSchema,
  RateLimitInfoSchema,
  ApiResponseSchema,
  HttpResponseSchema,
} from './responses.js';

// Error types
export type {
  ApiError,
  EnhancedError,
  ErrorContext,
} from './errors.js';

export {
  ErrorContextSchema,
  EnhancedErrorSchema,
} from './errors.js';

// Request types
export type { HttpRequestConfig } from './requests.js';

export { HttpRequestConfigSchema } from './requests.js';

// Batch operation types
export type {
  BatchApiResult,
  BatchOperationResult,
} from './batch.js';

export {
  BatchOperationResultSchema,
  BatchApiResultSchema,
} from './batch.js';

// WebSocket types
export type {
  WebSocketMessage,
  WebSocketConnectionStatus,
} from './websockets.js';

export {
  WebSocketMessageSchema,
  WebSocketConnectionStatusSchema,
} from './websockets.js';

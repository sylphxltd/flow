/**
 * API types barrel export
 * Organized API-related types and interfaces
 */

// Batch operation types
export type {
  BatchApiResult,
  BatchOperationResult,
} from './batch.js';
export {
  BatchApiResultSchema,
  BatchOperationResultSchema,
} from './batch.js';

// Error types
export type {
  ApiError,
  EnhancedError,
  ErrorContext,
} from './errors.js';

export {
  EnhancedErrorSchema,
  ErrorContextSchema,
} from './errors.js';

// Request types
export type { HttpRequestConfig } from './requests.js';

export { HttpRequestConfigSchema } from './requests.js';
// Response types
export type {
  ApiResponse,
  HttpResponse,
  PaginationInfo,
  RateLimitInfo,
} from './responses.js';
export {
  ApiResponseSchema,
  HttpResponseSchema,
  PaginationInfoSchema,
  RateLimitInfoSchema,
} from './responses.js';

// WebSocket types
export type {
  WebSocketConnectionStatus,
  WebSocketMessage,
} from './websockets.js';

export {
  WebSocketConnectionStatusSchema,
  WebSocketMessageSchema,
} from './websockets.js';

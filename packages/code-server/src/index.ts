/**
 * @sylphx/code-server
 * tRPC server for multi-session AI streaming
 */

// ============================================================================
// tRPC Router & Context
// ============================================================================
export { appRouter } from './server/trpc/routers/index.js'
export { createContext, type Context } from './server/trpc/context.js'
export { getTRPCClient } from './server/trpc/client.js'

// ============================================================================
// Streaming Service
// ============================================================================
export { type StreamEvent } from './server/services/streaming.service.js'

// ============================================================================
// Version
// ============================================================================
export const version = '0.1.0'

/**
 * @sylphx/code-server
 * tRPC server for multi-session AI streaming
 */

// ============================================================================
// tRPC Router & Context
// ============================================================================
export { appRouter } from './trpc/routers/index.js'
export { createContext, type Context } from './trpc/context.js'
export { getTRPCClient } from './trpc/client.js'

// ============================================================================
// Streaming Service
// ============================================================================
export { type StreamEvent } from './services/streaming.service.js'

// ============================================================================
// Version
// ============================================================================
export const version = '0.1.0'

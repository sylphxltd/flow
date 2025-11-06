/**
 * @sylphx/code-server
 * Embeddable tRPC server for multi-session AI streaming
 */

// ============================================================================
// CodeServer Class (for embedding)
// ============================================================================
export { CodeServer, type ServerConfig } from './server.js';

// ============================================================================
// tRPC Router & Context (for in-process use)
// ============================================================================
export { appRouter, type AppRouter } from './trpc/routers/index.js';
export { createContext, type Context } from './trpc/context.js';
export { createAppContext, initializeAppContext, closeAppContext, type AppContext } from './context.js';

// ============================================================================
// Streaming Service
// ============================================================================
export { type StreamEvent } from './services/streaming.service.js';

// ============================================================================
// Version
// ============================================================================
export const version = '0.1.0';

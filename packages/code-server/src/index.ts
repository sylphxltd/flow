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

// ============================================================================
// Streaming Service
// ============================================================================
export { type StreamEvent } from './services/streaming.service.js';

// ============================================================================
// tRPC Links (for in-process communication)
// ============================================================================
export { inProcessLink, type InProcessLinkOptions } from './links/in-process-link.js';

// ============================================================================
// Version
// ============================================================================
export const version = '0.1.0';

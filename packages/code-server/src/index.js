/**
 * @sylphx/code-server
 * Embeddable tRPC server for multi-session AI streaming
 */
// ============================================================================
// CodeServer Class (for embedding)
// ============================================================================
export { CodeServer } from './server.js';
// ============================================================================
// tRPC Router & Context (for in-process use)
// ============================================================================
export { appRouter } from './trpc/routers/index.js';
export { createContext } from './trpc/context.js';
// ============================================================================
// Version
// ============================================================================
export const version = '0.1.0';
//# sourceMappingURL=index.js.map
/**
 * CodeServer
 * Embeddable server class for in-process or HTTP tRPC
 *
 * Design Philosophy:
 * - Default: In-process (zero overhead, direct function calls)
 * - Optional: HTTP server (Web GUI, remote connections)
 * - Inspired by graphql-yoga, @trpc/server
 * - Uses functional provider pattern via AppContext
 */
import { type AppRouter } from './trpc/routers/index.js';
import { type Context } from './trpc/context.js';
import { type AppContext } from './context.js';
import type { Server } from 'node:http';
export interface ServerConfig {
    /**
     * Database path (default: ~/.sylphx-flow/sessions.db)
     */
    dbPath?: string;
    /**
     * Port for optional HTTP server (default: 3000)
     */
    port?: number;
    /**
     * AI config path (default: ~/.sylphx-flow/ai-config.json)
     */
    aiConfigPath?: string;
    /**
     * Working directory for agent/rule managers (default: process.cwd())
     */
    cwd?: string;
}
/**
 * CodeServer - Embeddable tRPC server
 *
 * Usage:
 *
 * // In-process (TUI, fast):
 * const server = new CodeServer({ dbPath: '...' });
 * await server.initialize();
 * const router = server.getRouter();
 * const context = await server.getContext();
 *
 * // HTTP (Web GUI, remote):
 * const server = new CodeServer({ port: 3000 });
 * await server.initialize();
 * await server.startHTTP();
 */
export declare class CodeServer {
    private config;
    private httpServer?;
    private expressApp?;
    private initialized;
    private appContext?;
    constructor(config?: ServerConfig);
    /**
     * Initialize server resources (database, agent/rule managers)
     * Must be called before getRouter() or startHTTP()
     * Uses functional provider pattern via AppContext
     */
    initialize(): Promise<void>;
    /**
     * Get tRPC router for in-process use
     * Use with inProcessLink for zero-overhead communication
     */
    getRouter(): AppRouter;
    /**
     * Get context factory for in-process use
     * Binds AppContext to context creation
     */
    getContext(): () => Promise<Context>;
    /**
     * Start HTTP server for Web GUI or remote connections
     * Returns the HTTP server instance
     */
    startHTTP(port?: number): Promise<Server>;
    /**
     * Setup static file serving for Web UI
     */
    private setupStaticFiles;
    /**
     * Close HTTP server and cleanup resources
     */
    close(): Promise<void>;
    /**
     * Check if server is initialized
     */
    isInitialized(): boolean;
    /**
     * Check if HTTP server is running
     */
    isHTTPRunning(): boolean;
    /**
     * Get AppContext (for embedded mode only)
     * Allows direct access to services when running in-process
     */
    getAppContext(): AppContext;
}
//# sourceMappingURL=server.d.ts.map
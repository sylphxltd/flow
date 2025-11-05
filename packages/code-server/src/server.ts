/**
 * CodeServer
 * Embeddable server class for in-process or HTTP tRPC
 *
 * Design Philosophy:
 * - Default: In-process (zero overhead, direct function calls)
 * - Optional: HTTP server (Web GUI, remote connections)
 * - Inspired by graphql-yoga, @trpc/server
 */

import express, { type Express } from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter, type AppRouter } from './trpc/routers/index.js';
import { createContext, type Context } from './trpc/context.js';
import {
  initializeAgentManager,
  initializeRuleManager,
  getDatabase,
} from '@sylphx/code-core';
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
export class CodeServer {
  private config: Required<ServerConfig>;
  private httpServer?: Server;
  private expressApp?: Express;
  private initialized = false;

  constructor(config: ServerConfig = {}) {
    this.config = {
      dbPath: config.dbPath ?? '', // Empty string = use default from getDatabase()
      port: config.port ?? 3000,
      aiConfigPath: config.aiConfigPath ?? '', // Empty string = use default
      cwd: config.cwd ?? process.cwd(),
    };
  }

  /**
   * Initialize server resources (database, agent/rule managers)
   * Must be called before getRouter() or startHTTP()
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize database
    await getDatabase();

    // Initialize agent and rule managers (server-side singletons)
    await initializeAgentManager(this.config.cwd);
    await initializeRuleManager(this.config.cwd);

    this.initialized = true;
  }

  /**
   * Get tRPC router for in-process use
   * Use with inProcessLink for zero-overhead communication
   */
  getRouter(): AppRouter {
    if (!this.initialized) {
      throw new Error('Server not initialized. Call initialize() first.');
    }
    return appRouter;
  }

  /**
   * Get context factory for in-process use
   */
  getContext(): typeof createContext {
    if (!this.initialized) {
      throw new Error('Server not initialized. Call initialize() first.');
    }
    return createContext;
  }

  /**
   * Start HTTP server for Web GUI or remote connections
   * Returns the HTTP server instance
   */
  async startHTTP(port?: number): Promise<Server> {
    if (!this.initialized) {
      throw new Error('Server not initialized. Call initialize() first.');
    }

    const finalPort = port ?? this.config.port;

    // Create Express app if not already created
    if (!this.expressApp) {
      this.expressApp = express();

      // tRPC middleware with SSE support
      this.expressApp.use(
        '/trpc',
        createExpressMiddleware({
          router: appRouter,
          createContext,
        })
      );

      // Static files for Web UI
      await this.setupStaticFiles();
    }

    return new Promise((resolve, reject) => {
      this.httpServer = this.expressApp!.listen(finalPort, () => {
        console.log(`\n🚀 Sylphx Code Server`);
        console.log(`   HTTP Server: http://localhost:${finalPort}`);
        console.log(`   tRPC Endpoint: http://localhost:${finalPort}/trpc`);
        console.log(`\n📡 Accepting connections from:`);
        console.log(`   - code (TUI): in-process tRPC`);
        console.log(`   - code-web (GUI): HTTP/SSE tRPC`);
        console.log(`\n💾 All clients share same data source\n`);
        resolve(this.httpServer!);
      }).on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`ℹ️  Server already running on port ${finalPort}`);
          console.log(`   Clients can connect to: http://localhost:${finalPort}`);
          // Return null to indicate server already running
          resolve(null as any);
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Setup static file serving for Web UI
   */
  private async setupStaticFiles(): Promise<void> {
    if (!this.expressApp) return;

    try {
      const { existsSync } = await import('fs');
      const { resolve } = await import('path');

      if (existsSync('./src/web/dist')) {
        this.expressApp.use(express.static('./src/web/dist'));

        // SPA fallback - serve index.html for all non-API routes
        this.expressApp.use((req, res, next) => {
          // Skip if it's a tRPC request
          if (req.path.startsWith('/trpc')) {
            return next();
          }

          // Serve index.html for all other routes (SPA routing)
          res.sendFile(resolve('./src/web/dist/index.html'));
        });
      } else {
        // Development mode - no static files yet
        this.expressApp.get('/', (req, res) => {
          res.send(`
            <html>
              <body style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
                <h1>🚀 Sylphx Flow Web Server</h1>
                <p>Server is running, but Web UI is not built yet.</p>
                <p><strong>To build the Web UI:</strong></p>
                <pre>cd src/web && bun install && bun run build</pre>
                <p><strong>API Status:</strong> ✅ tRPC endpoints available at <code>/trpc</code></p>
              </body>
            </html>
          `);
        });
      }
    } catch (error) {
      console.error('Error setting up static files:', error);
    }
  }

  /**
   * Close HTTP server and cleanup resources
   */
  async close(): Promise<void> {
    if (this.httpServer) {
      return new Promise((resolve, reject) => {
        this.httpServer!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  /**
   * Check if server is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if HTTP server is running
   */
  isHTTPRunning(): boolean {
    return this.httpServer !== undefined && this.httpServer.listening;
  }
}

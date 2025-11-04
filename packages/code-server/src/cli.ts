#!/usr/bin/env bun
/**
 * code-server CLI
 * Background daemon server for multi-client access
 *
 * Clients:
 * - code (TUI) - in-process tRPC
 * - code-web (GUI) - HTTP/SSE tRPC
 *
 * All clients share same data source in real-time
 */

import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './trpc/routers/index.js';
import { createContext } from './trpc/context.js';
import { initializeAgentManager, initializeRuleManager, getDatabase } from '@sylphx/code-core';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

/**
 * Initialize server-side resources
 * Must be called before accepting any client connections
 */
async function initializeServer() {
  const cwd = process.cwd();

  // Initialize database
  await getDatabase();

  // Initialize agent and rule managers (server-side singletons)
  await initializeAgentManager(cwd);
  await initializeRuleManager(cwd);
}

export async function startWebServer() {
  // Initialize server resources first
  try {
    await initializeServer();
  } catch (error) {
    console.error('Failed to initialize server:', error);
    throw error;
  }
  // tRPC middleware with SSE support
  app.use('/trpc', createExpressMiddleware({
    router: appRouter,
    createContext,
  }));

  // Static files for Web UI
  try {
    const { existsSync } = await import('fs');
    const { resolve } = await import('path');

    if (existsSync('./src/web/dist')) {
      app.use(express.static('./src/web/dist'));

      // SPA fallback - serve index.html for all non-API routes
      app.use((req, res, next) => {
        // Skip if it's a tRPC request
        if (req.path.startsWith('/trpc')) {
          return next();
        }

        // Serve index.html for all other routes (SPA routing)
        res.sendFile(resolve('./src/web/dist/index.html'));
      });
    } else {
      // Development mode - no static files yet
      app.get('/', (req, res) => {
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

  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Sylphx Code Server (Background Daemon)`);
      console.log(`   HTTP Server: http://localhost:${PORT}`);
      console.log(`   tRPC Endpoint: http://localhost:${PORT}/trpc`);
      console.log(`\n📡 Accepting connections from:`);
      console.log(`   - code (TUI): in-process tRPC`);
      console.log(`   - code-web (GUI): HTTP/SSE tRPC`);
      console.log(`\n💾 All clients share same data source\n`);
      resolve(server);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`ℹ️  Server already running on port ${PORT}`);
        console.log(`   Clients can connect to: http://localhost:${PORT}`);
        resolve(null);
      } else {
        reject(err);
      }
    });
  });
}

// Start server when run as script
startWebServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

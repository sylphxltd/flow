#!/usr/bin/env bun
/**
 * code-server CLI
 * Standalone tRPC + Express server
 * HTTP + SSE server for Web GUI
 */

import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './trpc/routers/index.js';
import { createContext } from './trpc/context.js';

const app = express();
const PORT = 3000;

export async function startWebServer() {
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
      console.log(`🌐 Web server: http://localhost:${PORT}`);
      resolve(server);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log('ℹ️  Web server already running on port', PORT);
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

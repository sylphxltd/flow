#!/usr/bin/env bun
/**
 * code-server CLI
 * Standalone HTTP server for remote access
 *
 * Clients:
 * - code (TUI) - in-process tRPC (when embedded)
 * - code-web (GUI) - HTTP/SSE tRPC
 * - Remote TUI - HTTP/SSE tRPC (with --server-url flag)
 *
 * All clients share same data source in real-time
 */

import { CodeServer } from './server.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

/**
 * Start standalone HTTP server
 * Used for remote connections or Web GUI
 */
async function main() {
  const server = new CodeServer({ port: PORT });

  try {
    // Initialize server resources
    await server.initialize();

    // Start HTTP server
    await server.startHTTP();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server when run as script
main();

#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Runtime from 'effect/Runtime';

import { registerMemoryTools } from '../tools/memory-tools.js';
import { registerProjectStartupTool } from '../tools/project-startup-tool.js';
import { registerTimeTools } from '../tools/time-tools.js';

// ============================================================================
// CONFIGURATION AND SETUP
// ============================================================================

const DEFAULT_CONFIG = {
  name: 'sylphx_flow',
  version: '1.0.0',
  description:
    'Sylphx Flow MCP server providing coordination tools for AI agents. Persistent SQLite-based storage with namespace support for agent coordination and state management.',
};

// Logger utility
const Logger = {
  info: (message: string) => console.error(`[INFO] ${message}`),
  success: (message: string) => console.error(`[SUCCESS] ${message}`),
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`);
    if (error) {
      console.error(error);
    }
  },
};

const createServer = Effect.gen(function* () {
  Logger.info('Starting Sylphx Flow MCP Server...');
  Logger.info(`Description: ${DEFAULT_CONFIG.description.substring(0, 100)}...`);

  const server = new McpServer({
    name: DEFAULT_CONFIG.name,
    version: DEFAULT_CONFIG.version,
    description: DEFAULT_CONFIG.description,
  });

  // Register tools (already wrapped in tool files)
  registerMemoryTools(server);
  registerTimeTools(server);
  registerProjectStartupTool(server);

  return server;
});

const connectServer = (server: McpServer) => Effect.gen(function* () {
  const transport = new StdioServerTransport();
  yield* Effect.promise(() => server.connect(transport));
  Logger.success('MCP Server connected and ready');
  return server;
});

const handleShutdown = Effect.promise(() => {
  return new Promise<number>((resolve) => {
    const shutdown = () => {
      Logger.info('Shutting down MCP server...');
      process.removeAllListeners('SIGINT');
      process.removeAllListeners('SIGTERM');
      resolve(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
});

const program = Effect.gen(function* () {
  const server = yield* createServer;
  yield* connectServer(server);
  yield* handleShutdown;
}).pipe(
  Effect.catchAll((error) => {
    Logger.error('Failed to start MCP server', error);
    return Effect.succeed(1 as const);
  })
);

// Run the program
const runtime = Runtime.defaultRuntime;
Effect.runSync(program).then((code) => {
  process.exit(code);
});

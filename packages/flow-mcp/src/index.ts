#!/usr/bin/env bun
/**
 * Sylphx Flow MCP Server
 * Standalone MCP server for Claude Desktop and other MCP clients
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * Sylphx Flow MCP Server
 *
 * Standalone MCP server providing codebase, knowledge, and time tools.
 * Can be configured in Claude Desktop or other MCP-compatible clients.
 */

// Server configuration interface
export interface ServerConfig {
  disableTime?: boolean;
  disableKnowledge?: boolean;
  disableCodebase?: boolean;
}

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

const DEFAULT_CONFIG = {
  name: 'sylphx-flow-mcp',
  version: '0.1.0',
  description:
    'Sylphx Flow MCP server providing codebase search, knowledge management, and time utilities for AI agents.',
};

/**
 * Start the Sylphx Flow MCP Server
 */
export async function startMCPServer(config: ServerConfig = {}) {
  Logger.info('🚀 Starting Sylphx Flow MCP Server...');
  Logger.info(`📋 ${DEFAULT_CONFIG.description}`);

  const server = new McpServer({
    name: DEFAULT_CONFIG.name,
    version: DEFAULT_CONFIG.version,
    description: DEFAULT_CONFIG.description,
  });

  // TODO: Register tools from @sylphx/flow domains
  // This requires refactoring the domain tools to be MCP-compatible
  // or creating adapters that convert between AI SDK tools and MCP tools

  // For now, this is a placeholder structure showing the intended architecture:
  // 1. Import domain tools from @sylphx/flow
  // 2. Register them with the MCP server
  // 3. Start the stdio transport

  Logger.info('⚠️  MCP server structure created, tool registration pending');
  Logger.info('🔧 Next steps:');
  Logger.info('   1. Add @sylphx/flow as dependency');
  Logger.info('   2. Import and adapt domain tools (codebase, knowledge, time)');
  Logger.info('   3. Register tools with MCP server');

  // Connect to stdio transport
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    Logger.success('✓ MCP Server connected and ready');
    Logger.info('💡 Press Ctrl+C to stop the server');
    return server;
  } catch (error: unknown) {
    Logger.error('Failed to start MCP server', error);
    throw error;
  }
}

// Handle process signals
process.on('SIGINT', () => {
  Logger.info('\n🛑 Shutting down MCP server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  Logger.info('\n🛑 Shutting down MCP server...');
  process.exit(0);
});

// Execute when run as script
if (import.meta.main) {
  // Parse command line arguments for configuration
  const args = process.argv.slice(2);
  const config = {
    disableTime: args.includes('--disable-time'),
    disableKnowledge: args.includes('--disable-knowledge'),
    disableCodebase: args.includes('--disable-codebase'),
  };

  // Start the MCP server
  startMCPServer(config).catch((error) => {
    Logger.error('Failed to start MCP server', error);
    process.exit(1);
  });
}

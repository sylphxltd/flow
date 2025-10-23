#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerMemoryTools } from '../tools/memory-tools.js';
import { registerProjectStartupTool } from '../tools/project-startup-tool.js';
import { registerTimeTools } from '../tools/time-tools.js';
import {
  registerKnowledgeResources,
  registerKnowledgeTools,
} from '../resources/knowledge-resources.js';

// ============================================================================
// CONFIGURATION AND SETUP
// ============================================================================

const DEFAULT_CONFIG = {
  name: 'sylphx_flow',
  version: '1.0.0',
  description:
    'Sylphx Flow MCP server providing coordination tools for AI agents. Persistent SQLite-based storage with namespace support for agent coordination and state management.',
};

// Parse command line arguments
const args = process.argv.slice(2);
const DISABLE_RESOURCES = args.includes('--no-resources');

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

Logger.info('🚀 Starting Sylphx Flow MCP Server...');
Logger.info(`📋 Description: ${DEFAULT_CONFIG.description.substring(0, 100)}...`);

const server = new McpServer({
  name: DEFAULT_CONFIG.name,
  version: DEFAULT_CONFIG.version,
  description: DEFAULT_CONFIG.description,
});

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

// Register all tool categories
registerMemoryTools(server);
registerTimeTools(server);
registerProjectStartupTool(server);

// Register knowledge (resources OR tools, not both)
if (DISABLE_RESOURCES) {
  Logger.info('📚 Registering knowledge as MCP tools');
  registerKnowledgeTools(server);
} else {
  Logger.info('📚 Registering knowledge as MCP resources');
  registerKnowledgeResources(server);
}

// SERVER STARTUP
// ============================================================================

async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    Logger.success('✅ MCP Server connected and ready');
  } catch (error: unknown) {
    Logger.error('Failed to start MCP server', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  Logger.info('🛑 Shutting down MCP server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  Logger.info('🛑 Shutting down MCP server...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  Logger.error('Fatal error starting server', error);
  process.exit(1);
});

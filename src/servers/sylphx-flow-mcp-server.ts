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
  name: 'sylphx-flow',
  version: '1.0.0',
  description:
    'Sylphx Flow MCP server providing coordination tools for AI agents. Persistent SQLite-based storage with namespace support for agent coordination and state management.',
};

// Server configuration interface
interface ServerConfig {
  disableResources?: boolean;
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

// Main server function
export async function startSylphxFlowMCPServer(config: ServerConfig = {}) {
  console.log('🚀 Starting Sylphx Flow MCP Server...');
  console.log('📍 Database: .sylphx-flow/memory.db');

  Logger.info(`📋 Description: ${DEFAULT_CONFIG.description.substring(0, 100)}...`);

  const server = new McpServer({
    name: DEFAULT_CONFIG.name,
    version: DEFAULT_CONFIG.version,
    description: DEFAULT_CONFIG.description,
  });

  // Register all tool categories
  registerMemoryTools(server);
  registerTimeTools(server);
  registerProjectStartupTool(server);

  // Register knowledge (resources OR tools, not both)
  if (config.disableResources) {
    Logger.info('📚 Registering knowledge as MCP tools');
    registerKnowledgeTools(server);

    console.log('📚 Knowledge resources: Disabled (using tools instead)');
    console.log(
      '🔧 Available tools: memory_set, memory_get, memory_search, memory_list, memory_delete, memory_clear, memory_stats, knowledge_search, knowledge_get'
    );
  } else {
    Logger.info('📚 Registering knowledge as MCP resources');
    registerKnowledgeResources(server);

    console.log('📚 Knowledge resources: Enabled (as MCP resources)');
    console.log(
      '🔧 Available tools: memory_set, memory_get, memory_search, memory_list, memory_delete, memory_clear, memory_stats'
    );
  }

  // SERVER STARTUP
  // ============================================================================
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    Logger.success('✅ MCP Server connected and ready');

    console.log('💡 Press Ctrl+C to stop the server');
    return server;
  } catch (error: unknown) {
    Logger.error('Failed to start MCP server', error);
    throw error;
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

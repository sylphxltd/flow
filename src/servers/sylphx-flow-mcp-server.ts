import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerMemoryTools } from '../tools/memory-tools.js';
import { registerProjectStartupTool } from '../tools/project-startup-tool.js';
import { registerTimeTools } from '../tools/time-tools.js';
import { registerKnowledgeTools } from '../resources/knowledge-resources.js';
import { registerCodebaseSearchTool } from '../tools/codebase-search-tool.js';

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
  disableMemory?: boolean;
  disableTime?: boolean;
  disableProjectStartup?: boolean;
  disableKnowledge?: boolean;
  disableCodebaseSearch?: boolean;
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

// Parse command line arguments for backward compatibility
function parseArgs(): ServerConfig {
  const args = process.argv.slice(2);
  const config: ServerConfig = {};

  // Handle disable flags (new approach)
  if (args.includes('--disable-memory')) config.disableMemory = true;
  if (args.includes('--disable-time')) config.disableTime = true;
  if (args.includes('--disable-project-startup')) config.disableProjectStartup = true;
  if (args.includes('--disable-knowledge')) config.disableKnowledge = true;
  if (args.includes('--disable-codebase-search')) config.disableCodebaseSearch = true;

  // Handle enable flags (backward compatibility)
  if (args.includes('--enable-memory')) config.disableMemory = false;
  if (args.includes('--enable-time')) config.disableTime = false;
  if (args.includes('--enable-project-startup')) config.disableProjectStartup = false;
  if (args.includes('--enable-knowledge')) config.disableKnowledge = false;

  return config;
}

// Main server function
export async function startSylphxFlowMCPServer(config: ServerConfig = {}) {
  // If no config provided, try to parse from command line arguments
  if (Object.keys(config).length === 0) {
    config = parseArgs();
  }

  console.error('Debug: Final config =', config);
  console.log('🚀 Starting Sylphx Flow MCP Server...');
  console.log('📍 Database: .sylphx-flow/memory.db');

  Logger.info(`📋 Description: ${DEFAULT_CONFIG.description.substring(0, 100)}...`);

  const server = new McpServer({
    name: DEFAULT_CONFIG.name,
    version: DEFAULT_CONFIG.version,
    description: DEFAULT_CONFIG.description,
  });

  // Register all tool categories by default (whitelist approach)
  const enabledTools: string[] = [];

  // Memory tools (enabled by default, can be disabled)
  if (!config.disableMemory) {
    registerMemoryTools(server);
    enabledTools.push(
      'memory_set, memory_get, memory_search, memory_list, memory_delete, memory_clear, memory_stats'
    );
  }

  // Time tools (enabled by default, can be disabled)
  if (!config.disableTime) {
    registerTimeTools(server);
    enabledTools.push('time_get_current, time_format, time_parse');
  }

  // Project startup tools (enabled by default, can be disabled)
  if (!config.disableProjectStartup) {
    registerProjectStartupTool(server);
    enabledTools.push('project_startup');
  }

  // Knowledge tools (enabled by default, can be disabled)
  if (!config.disableKnowledge) {
    Logger.info('📚 Registering knowledge tools');
    registerKnowledgeTools(server);
    enabledTools.push('search_knowledge, get_knowledge');
    console.log('📚 Knowledge: Enabled');
  }

  // Codebase search tools (enabled by default, can be disabled)
  if (!config.disableCodebaseSearch) {
    Logger.info('🔍 Registering codebase search tools');
    registerCodebaseSearchTool(server);
    enabledTools.push('search_codebase, reindex_codebase');
    console.log('🔍 Codebase Search: Enabled');
  }

  // Display enabled tools
  if (enabledTools.length > 0) {
    console.log(`🔧 Enabled tools: ${enabledTools.join(', ')}`);
  } else {
    console.log('🔧 All tools disabled');
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

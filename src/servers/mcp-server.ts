import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerCodebaseTools } from '../tools/codebase-tools.js';
import { registerKnowledgeTools } from '../tools/knowledge-tools.js';
import { registerMemoryTools } from '../tools/memory-tools.js';
import { registerProjectStartupTool } from '../tools/project-startup-tool.js';
import { registerTimeTools } from '../tools/time-tools.js';
import { getDefaultEmbeddingProvider } from '../utils/embeddings.js';
import { secretUtils } from '../utils/secret-utils.js';
import { searchService } from '../utils/unified-search-service.js';

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
export interface ServerConfig {
  disableMemory?: boolean;
  disableTime?: boolean;
  disableProjectStartup?: boolean;
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

// Main server function
export async function startSylphxFlowMCPServer(config: ServerConfig = {}) {
  // Config should be provided by the caller - no command line parsing here
  // This is a library, not a standalone application

  console.log('🚀 Starting Sylphx Flow MCP Server...');
  console.log('📍 Database: .sylphx-flow/memory.db');

  // Initialize embedding provider for vector search
  console.log('🔍 Initializing embedding provider...');
  try {
    const embeddingProvider = await getDefaultEmbeddingProvider();
    console.log(`✓ Embedding provider initialized: ${embeddingProvider.name}`);

    // Initialize search service with embeddings
    await searchService.initialize();
    console.log('✓ Search service initialized with embeddings');
  } catch (error) {
    console.log('⚠️  Failed to initialize embeddings, using TF-IDF only:', error);
    await searchService.initialize();
  }

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

  // Codebase tools (enabled by default)
  if (!config.disableCodebase) {
    Logger.info('🔍 Registering codebase tools');
    registerCodebaseTools(server);
    enabledTools.push('codebase_search');
    console.log('🔍 Codebase Tools: Enabled');
  }

  // Knowledge tools (enabled by default)
  if (!config.disableKnowledge) {
    Logger.info('📚 Registering knowledge tools');
    registerKnowledgeTools(server);
    enabledTools.push('knowledge_search', 'knowledge_get');
    console.log('📚 Knowledge Tools: Enabled');
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
    Logger.success('✓ MCP Server connected and ready');

    console.log('💡 Press Ctrl+C to stop the server');
    return server;
  } catch (error: unknown) {
    Logger.error('Failed to start MCP server', error);
    throw error;
  }
}

// Note: Process signal handling should be managed by the main application
// This library focuses only on MCP server functionality

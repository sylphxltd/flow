import path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fs from 'fs/promises';

import { registerCodebaseTools } from '../domains/codebase/tools.js';
import { registerKnowledgeTools } from '../domains/knowledge/tools.js';
import { registerTimeTools } from '../domains/utilities/time/tools.js';
import { registerWorkspaceTools } from '../domains/workspace/tasks/tools.js';
import { getDefaultEmbeddingProvider } from '../services/search/embeddings.js';
import { searchService } from '../services/search/unified-search-service.js';
import { secretUtils } from '../utils/secret-utils.js';

// ============================================================================
// CONFIGURATION AND SETUP
// ============================================================================

const SYLPHX_FLOW_DIR = '.sylphx-flow';

/**
 * Initialize .sylphx-flow directory with proper .gitignore
 */
async function initializeSylphxFlowDirectory(cwd: string = process.cwd()): Promise<void> {
  const sylphxFlowPath = path.join(cwd, SYLPHX_FLOW_DIR);

  try {
    // Ensure .sylphx-flow directory exists
    await fs.mkdir(sylphxFlowPath, { recursive: true });

    // Create .gitignore inside .sylphx-flow directory
    const gitignorePath = path.join(sylphxFlowPath, '.gitignore');
    const gitignoreContent = `# Sylphx Flow Runtime Files
# SQLite databases
*.db
*.db-shm
*.db-wal

# Workspace management
workspace/
!workspace/README.md

# Search cache and indexes
search-cache/
*.hnsw
*.meta.json

# Temporary files
*.tmp
*.log
*.lock
*.pid

# MCP server artifacts
cache/
sessions/
coordination/
`;

    // Check if .gitignore already exists
    try {
      const existingContent = await fs.readFile(gitignorePath, 'utf8');
      if (existingContent.trim() === gitignoreContent.trim()) {
        // Same content, no need to update
        return;
      }
    } catch {
      // File doesn't exist, create it
    }

    await fs.writeFile(gitignorePath, gitignoreContent, 'utf8');
    Logger.info(`✓ Created ${path.join(SYLPHX_FLOW_DIR, '.gitignore')}`);
  } catch (error) {
    Logger.error('Failed to initialize .sylphx-flow directory', error);
    // Don't throw error, server can still function
  }
}

const DEFAULT_CONFIG = {
  name: 'sylphx-flow',
  version: '1.0.0',
  description:
    'Sylphx Flow MCP server providing coordination tools for AI agents. Persistent SQLite-based storage with namespace support for agent coordination and state management.',
};

// Server configuration interface
export interface ServerConfig {
  disableTime?: boolean;
  disableKnowledge?: boolean;
  disableCodebase?: boolean;
  disableWorkspace?: boolean;
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

  // Initialize .sylphx-flow directory with proper .gitignore
  await initializeSylphxFlowDirectory();

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

  // Time tools (enabled by default, can be disabled)
  if (!config.disableTime) {
    registerTimeTools(server);
    enabledTools.push('time_get_current, time_format, time_parse');
  }

  // Workspace tools (enabled by default, can be disabled)
  if (!config.disableWorkspace) {
    Logger.info('📁 Registering workspace tools (stateless)');
    registerWorkspaceTools(server);
    enabledTools.push(
      'workspace_create_task',
      'workspace_read_task',
      'workspace_update_task',
      'workspace_list_tasks',
      'workspace_complete_task'
    );
    console.log('📁 Workspace Tools: Enabled (5 stateless tools)');
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

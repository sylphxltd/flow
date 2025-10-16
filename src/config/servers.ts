import type { MCPServerConfigUnion } from '../types.js';

/**
 * Central MCP server registry for Sylphx Flow
 * This is the single source of truth for all available MCP servers
 */
export interface MCPServerDefinition {
  /** Internal identifier used in CLI commands */
  id: string;
  /** Display name for the server */
  name: string;
  /** Human-readable description */
  description: string;
  /** MCP server configuration */
  config: MCPServerConfigUnion;
  /** Required environment variables (if any) */
  requiredEnvVars?: string[];
  /** Server category for grouping */
  category: 'core' | 'external' | 'ai';
  /** Whether this server is included by default in init */
  defaultInInit?: boolean;
}

/**
 * Central registry of all available MCP servers
 * This replaces all hardcoded server lists throughout the codebase
 */
export const MCP_SERVER_REGISTRY: Record<string, MCPServerDefinition> = {
  'sylphx-flow': {
    id: 'sylphx-flow',
    name: 'sylphx_flow',
    description: 'Sylphx Flow MCP server for agent coordination and memory management',
    config: {
      type: 'local' as const,
      command: ['npx', '-y', 'github:sylphxltd/flow', 'mcp', 'start'] as string[],
    },
    category: 'core',
    defaultInInit: true,
  },

  'gpt-image': {
    id: 'gpt-image',
    name: 'gpt-image-1-mcp',
    description: 'GPT Image generation MCP server',
    config: {
      type: 'local' as const,
      command: ['npx', '@napolab/gpt-image-1-mcp'] as string[],
      environment: { OPENAI_API_KEY: '' },
    },
    requiredEnvVars: ['OPENAI_API_KEY'],
    category: 'ai',
    defaultInInit: true,
  },

  perplexity: {
    id: 'perplexity',
    name: 'perplexity-ask',
    description: 'Perplexity Ask MCP server for search and queries',
    config: {
      type: 'local' as const,
      command: ['npx', '-y', 'server-perplexity-ask'] as string[],
      environment: { PERPLEXITY_API_KEY: '' },
    },
    requiredEnvVars: ['PERPLEXITY_API_KEY'],
    category: 'ai',
    defaultInInit: true,
  },

  context7: {
    id: 'context7',
    name: 'context7',
    description: 'Context7 HTTP MCP server for documentation retrieval',
    config: {
      type: 'remote' as const,
      url: 'https://mcp.context7.com/mcp',
    },
    category: 'external',
    defaultInInit: true,
  },

  'gemini-search': {
    id: 'gemini-search',
    name: 'gemini-google-search',
    description: 'Gemini Google Search MCP server',
    config: {
      type: 'local' as const,
      command: ['npx', '-y', 'mcp-gemini-google-search'] as string[],
      environment: { GEMINI_API_KEY: '', GEMINI_MODEL: 'gemini-2.5-flash' },
    },
    requiredEnvVars: ['GEMINI_API_KEY'],
    category: 'ai',
    defaultInInit: true,
  },

  grep: {
    id: 'grep',
    name: 'grep',
    description: 'GitHub grep MCP server for searching GitHub repositories',
    config: {
      type: 'remote' as const,
      url: 'https://mcp.grep.app',
    },
    category: 'external',
    defaultInInit: false,
  },
};

/**
 * Type for valid MCP server IDs
 */
export type MCPServerID = keyof typeof MCP_SERVER_REGISTRY;

/**
 * Get all available server IDs
 */
export function getAllServerIDs(): MCPServerID[] {
  return Object.keys(MCP_SERVER_REGISTRY) as MCPServerID[];
}

/**
 * Get servers by category
 */
export function getServersByCategory(category: MCPServerDefinition['category']): MCPServerID[] {
  return Object.entries(MCP_SERVER_REGISTRY)
    .filter(([, server]) => server.category === category)
    .map(([id]) => id as MCPServerID);
}

/**
 * Get servers that are included by default in init
 */
export function getDefaultServers(): MCPServerID[] {
  return Object.entries(MCP_SERVER_REGISTRY)
    .filter(([, server]) => server.defaultInInit)
    .map(([id]) => id as MCPServerID);
}

/**
 * Get servers that require API keys
 */
export function getServersRequiringAPIKeys(): MCPServerID[] {
  return Object.entries(MCP_SERVER_REGISTRY)
    .filter(([, server]) => server.requiredEnvVars && server.requiredEnvVars.length > 0)
    .map(([id]) => id as MCPServerID);
}

/**
 * Validate server ID
 */
export function isValidServerID(id: string): id is MCPServerID {
  return id in MCP_SERVER_REGISTRY;
}

/**
 * Get server definition
 */
export function getServerDefinition(id: MCPServerID): MCPServerDefinition {
  const server = MCP_SERVER_REGISTRY[id];
  if (!server) {
    throw new Error(`Unknown MCP server: ${id}`);
  }
  return server;
}

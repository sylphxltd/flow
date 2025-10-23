import type { MCPServerConfigUnion } from '../types.js';

/**
 * Central MCP server registry for Sylphx Flow
 * This is the single source of truth for all available MCP servers
 */
export interface EnvVarConfig {
  /** Description of what this environment variable does */
  description: string;
  /** Whether this environment variable is required or optional */
  required: boolean;
  /** Default value (if any) */
  default?: string;
  /** Whether this environment variable contains sensitive data and should be stored as secret */
  secret?: boolean;
}

export interface MCPServerDefinition {
  /** Internal identifier used in CLI commands */
  id: string;
  /** Display name for the server */
  name: string;
  /** Human-readable description */
  description: string;
  /** MCP server configuration */
  config: MCPServerConfigUnion;
  /** Environment variables configuration */
  envVars?: Record<string, EnvVarConfig>;
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
    name: 'sylphx-flow',
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
    envVars: {
      OPENAI_API_KEY: {
        description: 'OpenAI API key for image generation',
        required: true,
        secret: true,
      },
    },
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
    envVars: {
      PERPLEXITY_API_KEY: {
        description: 'Perplexity API key for search and queries',
        required: true,
        secret: true,
      },
    },
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
    envVars: {
      CONTEXT7_API_KEY: {
        description: 'Context7 API key for enhanced documentation access',
        required: false,
        secret: true,
      },
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
    envVars: {
      GEMINI_API_KEY: {
        description: 'Google Gemini API key for search functionality',
        required: true,
        secret: true,
      },
      GEMINI_MODEL: {
        description: 'Gemini model to use for search',
        required: false,
        default: 'gemini-2.5-flash',
      },
    },
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
    defaultInInit: true,
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
    .filter(
      ([, server]) =>
        server.envVars && Object.values(server.envVars).some((envVar) => envVar.required)
    )
    .map(([id]) => id as MCPServerID);
}

/**
 * Get servers that have optional API keys
 */
export function getServersWithOptionalAPIKeys(): MCPServerID[] {
  return Object.entries(MCP_SERVER_REGISTRY)
    .filter(
      ([, server]) =>
        server.envVars && Object.values(server.envVars).some((envVar) => !envVar.required)
    )
    .map(([id]) => id as MCPServerID);
}

/**
 * Get all servers that have any API keys (required or optional)
 */
export function getServersWithAnyAPIKeys(): MCPServerID[] {
  return Object.entries(MCP_SERVER_REGISTRY)
    .filter(([, server]) => server.envVars && Object.keys(server.envVars).length > 0)
    .map(([id]) => id as MCPServerID);
}

/**
 * Get required environment variables for a server
 */
export function getRequiredEnvVars(serverId: MCPServerID): string[] {
  const server = MCP_SERVER_REGISTRY[serverId];
  if (!server?.envVars) {
    return [];
  }

  return Object.entries(server.envVars)
    .filter(([, config]) => config.required)
    .map(([name]) => name);
}

/**
 * Get optional environment variables for a server
 */
export function getOptionalEnvVars(serverId: MCPServerID): string[] {
  const server = MCP_SERVER_REGISTRY[serverId];
  if (!server?.envVars) {
    return [];
  }

  return Object.entries(server.envVars)
    .filter(([, config]) => !config.required)
    .map(([name]) => name);
}

/**
 * Get all environment variables for a server
 */
export function getAllEnvVars(serverId: MCPServerID): string[] {
  const server = MCP_SERVER_REGISTRY[serverId];
  if (!server?.envVars) {
    return [];
  }

  return Object.keys(server.envVars);
}

/**
 * Get secret environment variables for a server
 */
export function getSecretEnvVars(serverId: MCPServerID): string[] {
  const server = MCP_SERVER_REGISTRY[serverId];
  if (!server?.envVars) {
    return [];
  }

  return Object.entries(server.envVars)
    .filter(([, config]) => config.secret)
    .map(([name]) => name);
}

/**
 * Get non-secret environment variables for a server
 */
export function getNonSecretEnvVars(serverId: MCPServerID): string[] {
  const server = MCP_SERVER_REGISTRY[serverId];
  if (!server?.envVars) {
    return [];
  }

  return Object.entries(server.envVars)
    .filter(([, config]) => !config.secret)
    .map(([name]) => name);
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

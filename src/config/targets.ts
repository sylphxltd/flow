import type { TargetConfig } from '../types.js';

/**
 * Target definition for different development environments
 * Similar to MCP server registry but for agent targets
 */
export interface TargetDefinition {
  /** Internal identifier used in CLI commands */
  id: string;
  /** Display name for the target */
  name: string;
  /** Human-readable description */
  description: string;
  /** Target-specific configuration */
  config: TargetConfig;
  /** Target category for grouping */
  category: 'ide' | 'editor' | 'cli';
  /** Whether this target is the default when no target is specified */
  isDefault?: boolean;
  /** Whether this target is fully implemented */
  isImplemented?: boolean;
}

/**
 * Central registry of all available targets
 * This is the single source of truth for all supported targets
 */
export const TARGET_REGISTRY: Record<string, TargetDefinition> = {
  opencode: {
    id: 'opencode',
    name: 'OpenCode',
    description: 'OpenCode IDE with YAML front matter agents (.opencode/agent/*.md)',
    config: {
      agentDir: '.opencode/agent',
      agentExtension: '.md',
      agentFormat: 'yaml-frontmatter',
      stripYaml: false,
      flatten: false,
      configFile: 'opencode.jsonc',
      configSchema: 'https://opencode.ai/config.json',
      mcpConfigPath: 'mcp',
      rulesFile: 'AGENTS.md',
      installation: {
        createAgentDir: true,
        createConfigFile: true,
        supportedMcpServers: true,
      },
    },
    category: 'ide',
    isDefault: true,
    isImplemented: true,
  },

  cursor: {
    id: 'cursor',
    name: 'Cursor',
    description: 'Cursor AI editor with JSON agents (.cursor/rules/*.json)',
    config: {
      agentDir: '.cursor/rules',
      agentExtension: '.json',
      agentFormat: 'json',
      stripYaml: true,
      flatten: true,
      configFile: 'cursor.json',
      configSchema: null,
      mcpConfigPath: 'mcpServers',
      installation: {
        createAgentDir: true,
        createConfigFile: true,
        supportedMcpServers: false, // Not yet implemented
      },
    },
    category: 'ide',
    isImplemented: false, // Future implementation
  },

  vscode: {
    id: 'vscode',
    name: 'VS Code',
    description: 'Visual Studio Code with workspace agents (.vscode/agents/*.md)',
    config: {
      agentDir: '.vscode/agents',
      agentExtension: '.md',
      agentFormat: 'markdown',
      stripYaml: true,
      flatten: false,
      configFile: 'settings.json',
      configSchema: null,
      mcpConfigPath: 'mcp.servers',
      installation: {
        createAgentDir: true,
        createConfigFile: false, // Uses existing settings.json
        supportedMcpServers: false, // Not yet implemented
      },
    },
    category: 'ide',
    isImplemented: false, // Future implementation
  },

  cli: {
    id: 'cli',
    name: 'CLI',
    description: 'Command-line interface with YAML agents (.sylphx/agents/*.yaml)',
    config: {
      agentDir: '.sylphx/agents',
      agentExtension: '.yaml',
      agentFormat: 'yaml',
      stripYaml: false,
      flatten: false,
      configFile: 'sylphx.json',
      configSchema: null,
      mcpConfigPath: 'mcp',
      installation: {
        createAgentDir: true,
        createConfigFile: true,
        supportedMcpServers: true,
      },
    },
    category: 'cli',
    isImplemented: false, // Future implementation
  },

  'claude-code': {
    id: 'claude-code',
    name: 'Claude Code',
    description: 'Claude Code CLI with YAML front matter agents (.claude/agents/*.md)',
    config: {
      agentDir: '.claude/agents',
      agentExtension: '.md',
      agentFormat: 'yaml-frontmatter',
      stripYaml: false,
      flatten: false,
      configFile: '.mcp.json',
      configSchema: null,
      mcpConfigPath: 'mcpServers',
      rulesFile: 'CLAUDE.md',
      installation: {
        createAgentDir: true,
        createConfigFile: true,
        supportedMcpServers: true,
      },
    },
    category: 'cli',
    isImplemented: true,
  },
};

/**
 * Type for valid target IDs
 */
export type TargetID = keyof typeof TARGET_REGISTRY;

/**
 * Get all available target IDs
 */
export function getAllTargetIDs(): TargetID[] {
  return Object.keys(TARGET_REGISTRY) as TargetID[];
}

/**
 * Get implemented target IDs only
 */
export function getImplementedTargetIDs(): TargetID[] {
  return Object.entries(TARGET_REGISTRY)
    .filter(([, target]) => target.isImplemented)
    .map(([id]) => id as TargetID);
}

/**
 * Get targets by category
 */
export function getTargetsByCategory(category: TargetDefinition['category']): TargetID[] {
  return Object.entries(TARGET_REGISTRY)
    .filter(([, target]) => target.category === category)
    .map(([id]) => id as TargetID);
}

/**
 * Get the default target
 */
export function getDefaultTarget(): TargetID {
  const defaultTarget = Object.entries(TARGET_REGISTRY).find(([, target]) => target.isDefault);
  if (!defaultTarget) {
    throw new Error('No default target configured');
  }
  return defaultTarget[0] as TargetID;
}

/**
 * Validate target ID
 */
export function isValidTargetID(id: string): id is TargetID {
  return id in TARGET_REGISTRY;
}

/**
 * Get target definition
 */
export function getTargetDefinition(id: TargetID): TargetDefinition {
  const target = TARGET_REGISTRY[id];
  if (!target) {
    throw new Error(`Unknown target: ${id}`);
  }
  return target;
}

/**
 * Check if a target is implemented
 */
export function isTargetImplemented(id: TargetID): boolean {
  return TARGET_REGISTRY[id]?.isImplemented ?? false;
}

/**
 * Get targets that support MCP servers
 */
export function getTargetsWithMCPSupport(): TargetID[] {
  return Object.entries(TARGET_REGISTRY)
    .filter(([, target]) => target.config.installation.supportedMcpServers)
    .map(([id]) => id as TargetID);
}

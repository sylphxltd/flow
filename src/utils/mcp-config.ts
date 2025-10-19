import path from 'node:path';
import {
  type MCPServerDefinition,
  type MCPServerID,
  MCP_SERVER_REGISTRY,
  getAllServerIDs,
  getDefaultServers,
  getServerDefinition,
  getServersRequiringAPIKeys,
  isValidServerID,
} from '../config/servers.js';
import type { OpenCodeConfig } from '../types.js';
import { readJSONCFile, writeJSONCFile } from './jsonc.js';

// Re-export for backward compatibility
export type MCPServerType = MCPServerID;

/**
 * Get MCP server definitions (backward compatibility)
 * @deprecated Use MCP_SERVER_REGISTRY from '../config/servers.js' instead
 */
export const MCP_SERVERS: Record<string, MCPServerDefinition> = MCP_SERVER_REGISTRY;

/**
 * Get the opencode.jsonc file path
 */
function getOpenCodeConfigPath(cwd: string): string {
  return path.join(cwd, 'opencode.jsonc');
}

/**
 * Read the current opencode.jsonc configuration
 */
async function readOpenCodeConfig(cwd: string): Promise<OpenCodeConfig> {
  const configPath = getOpenCodeConfigPath(cwd);

  try {
    const { existsSync } = await import('node:fs');
    if (!existsSync(configPath)) {
      return {};
    }

    return await readJSONCFile(configPath);
  } catch (error) {
    console.warn(
      `Warning: Could not read opencode.jsonc: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return {};
  }
}

/**
 * Write the opencode.jsonc configuration
 */
async function writeOpenCodeConfig(cwd: string, config: OpenCodeConfig): Promise<void> {
  const configPath = getOpenCodeConfigPath(cwd);
  const schema = 'https://opencode.ai/config.json';

  await writeJSONCFile(configPath, config, schema);
}

/**
 * Add MCP servers to the opencode.jsonc configuration
 */
export async function addMCPServers(cwd: string, serverTypes: MCPServerType[]): Promise<void> {
  const config = await readOpenCodeConfig(cwd);

  // Initialize mcp section if it doesn't exist
  if (!config.mcp) {
    config.mcp = {};
  }

  let addedCount = 0;

  // Add each requested server
  for (const serverType of serverTypes) {
    const server = MCP_SERVERS[serverType];
    if (!server) {
      console.warn(`Warning: Unknown MCP server type: ${serverType}`);
      continue;
    }

    if (config.mcp[server.name]) {
      console.log(`ℹ️  MCP server already exists: ${server.name}`);
    } else {
      config.mcp[server.name] = server.config;
      console.log(`📦 Added MCP server: ${server.name} (${server.description})`);
      addedCount++;
    }
  }

  // Write the updated configuration
  await writeOpenCodeConfig(cwd, config);
  console.log(`✅ Updated opencode.jsonc with ${addedCount} new MCP server(s)`);
}

/**
 * Remove MCP servers from the opencode.jsonc configuration
 */
export async function removeMCPServers(cwd: string, serverTypes: MCPServerType[]): Promise<void> {
  const config = await readOpenCodeConfig(cwd);

  if (!config.mcp) {
    console.log('ℹ️  No MCP servers configured');
    return;
  }

  let removedCount = 0;

  // Remove each requested server
  for (const serverType of serverTypes) {
    const server = MCP_SERVERS[serverType];
    if (!server) {
      console.warn(`Warning: Unknown MCP server type: ${serverType}`);
      continue;
    }

    if (config.mcp[server.name]) {
      delete config.mcp[server.name];
      console.log(`🗑️  Removed MCP server: ${server.name}`);
      removedCount++;
    } else {
      console.log(`ℹ️  MCP server not found: ${server.name}`);
    }
  }

  // Remove mcp section if it's empty
  if (Object.keys(config.mcp).length === 0) {
    config.mcp = undefined;
  }

  // Write the updated configuration
  await writeOpenCodeConfig(cwd, config);
  console.log(`✅ Updated opencode.jsonc (removed ${removedCount} MCP server(s))`);
}

/**
 * List currently configured MCP servers
 */
export async function listMCPServers(cwd: string): Promise<void> {
  const config = await readOpenCodeConfig(cwd);

  if (!config.mcp || Object.keys(config.mcp).length === 0) {
    console.log('ℹ️  No MCP servers configured');
    return;
  }

  console.log('📋 Currently configured MCP servers:');
  console.log('');

  for (const [name, serverConfig] of Object.entries(config.mcp)) {
    let configInfo = '';
    if (serverConfig.type === 'local') {
      configInfo = serverConfig.command.join(' ');
    } else if (serverConfig.type === 'remote') {
      configInfo = `HTTP: ${serverConfig.url}`;
    }

    console.log(`  • ${name}: ${configInfo}`);

    // Find the server type for additional info
    const serverInfo = Object.values(MCP_SERVERS).find((s) => s.name === name);
    if (serverInfo) {
      console.log(`    ${serverInfo.description}`);
    }
    console.log('');
  }
}

/**
 * Parse MCP server types from command line arguments
 */
export function parseMCPServerTypes(args: string[]): MCPServerType[] {
  const servers: MCPServerType[] = [];

  for (const arg of args) {
    if (isValidServerID(arg)) {
      servers.push(arg);
    } else {
      console.warn(
        `Warning: Unknown MCP server '${arg}'. Available: ${getAllServerIDs().join(', ')}`
      );
    }
  }

  return servers;
}

/**
 * Get all available server IDs (for backward compatibility)
 * @deprecated Use getAllServerIDs from '../config/servers.js' instead
 */
export function getAllAvailableServers(): MCPServerType[] {
  return getAllServerIDs();
}

/**
 * Get default servers for init (for backward compatibility)
 * @deprecated Use getDefaultServers from '../config/servers.js' instead
 */
export function getDefaultServersForInit(): MCPServerType[] {
  return getDefaultServers();
}

/**
 * Prompt user for API keys interactively
 */
export async function promptForAPIKeys(
  serverTypes: MCPServerType[]
): Promise<Record<string, string>> {
  const { createInterface } = await import('node:readline');
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const apiKeys: Record<string, string> = {};

  for (const serverType of serverTypes) {
    const server = MCP_SERVERS[serverType];
    if (!server?.requiredEnvVars?.length) {
      continue;
    }

    console.log(`\n🔑 Configuring API keys for ${server.description}:`);

    for (const envVar of server.requiredEnvVars) {
      const question = `Enter ${envVar} (or press Enter to skip): `;

      const answer = await new Promise<string>((resolve) => {
        rl.question(question, (input) => {
          resolve(input.trim());
        });
      });

      if (answer) {
        apiKeys[envVar] = answer;
        console.log(`✅ Set ${envVar}`);
      } else {
        console.log(
          `⚠️  Skipped ${envVar} - you can configure it later with 'mcp config ${serverType}'`
        );
      }
    }
  }

  rl.close();
  return apiKeys;
}

/**
 * Configure API keys for a specific MCP server
 */
export async function configureMCPServer(cwd: string, serverType: MCPServerType): Promise<void> {
  const server = MCP_SERVERS[serverType];
  if (!server) {
    console.error(`❌ Unknown MCP server: ${serverType}`);
    return;
  }

  if (!server.requiredEnvVars?.length) {
    console.log(`ℹ️  ${server.name} does not require any API keys`);
    return;
  }

  console.log(`🔧 Configuring ${server.description}...`);

  const apiKeys = await promptForAPIKeys([serverType]);

  if (Object.keys(apiKeys).length === 0) {
    console.log('❌ No API keys provided');
    return;
  }

  // Read current config
  const config = await readOpenCodeConfig(cwd);

  // Initialize mcp section if it doesn't exist
  if (!config.mcp) {
    config.mcp = {};
  }

  // Update server config with API keys (only for local servers)
  const currentConfig = config.mcp[server.name];
  if (currentConfig && currentConfig.type === 'local') {
    // Update existing local config
    config.mcp[server.name] = {
      ...currentConfig,
      environment: {
        ...(currentConfig.environment || {}),
        ...apiKeys,
      },
    };
  } else {
    // Create new config with API keys
    const baseConfig = server.config;
    if (baseConfig.type === 'local') {
      config.mcp[server.name] = {
        ...baseConfig,
        environment: {
          ...(baseConfig.environment || {}),
          ...apiKeys,
        },
      };
    } else {
      // HTTP server - just add the base config
      config.mcp[server.name] = baseConfig;
    }
  }

  // Write updated configuration
  await writeOpenCodeConfig(cwd, config);
  console.log(`✅ Updated ${server.name} with API keys`);
}

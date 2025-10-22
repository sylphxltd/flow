import path from 'node:path';
import {
  type MCPServerID,
  MCP_SERVER_REGISTRY,
  getAllEnvVars,
  getAllServerIDs,
  getDefaultServers,
  getOptionalEnvVars,
  getRequiredEnvVars,
  getServerDefinition,
  getServersRequiringAPIKeys,
  isValidServerID,
} from '../config/servers.js';
import {
  IMPLEMENTED_TARGETS,
  getImplementedTargetIDs,
  getTarget,
  getTargetsWithMCPSupport as getTargetsWithMCPSupportFromRegistry,
} from '../config/targets.js';
import type { MCPServerConfigUnion } from '../types.js';

/**
 * Target-specific MCP configuration utilities
 */

/**
 * Add MCP servers to a target's configuration
 */
export async function addMCPServersToTarget(
  cwd: string,
  targetId: string,
  serverTypes: MCPServerID[]
): Promise<void> {
  const target = getTarget(targetId);

  if (!target) {
    throw new Error(`Target not found: ${targetId}`);
  }

  if (!target.config.installation.supportedMcpServers) {
    throw new Error(`Target ${targetId} does not support MCP servers`);
  }

  // Read current configuration
  const config = await target.readConfig(cwd);

  // Initialize MCP section if it doesn't exist
  const mcpConfigPath = target.config.mcpConfigPath;
  const mcpSection = getNestedProperty(config, mcpConfigPath) || {};
  setNestedProperty(config, mcpConfigPath, mcpSection);

  let addedCount = 0;

  // Add each requested server
  for (const serverType of serverTypes) {
    const server = MCP_SERVER_REGISTRY[serverType];
    if (!server) {
      console.warn(`Warning: Unknown MCP server type: ${serverType}`);
      continue;
    }

    if (mcpSection[server.name]) {
      console.log(`ℹ️  MCP server already exists: ${server.name}`);
    } else {
      const transformedConfig = target.transformMCPConfig(server.config);
      mcpSection[server.name] = transformedConfig;
      console.log(`📦 Added MCP server: ${server.name} (${server.description})`);
      addedCount++;
    }
  }

  // Write the updated configuration
  await target.writeConfig(cwd, config);
  console.log(`✅ Updated ${target.config.configFile} with ${addedCount} new MCP server(s)`);
}

/**
 * Remove MCP servers from a target's configuration
 */
export async function removeMCPServersFromTarget(
  cwd: string,
  targetId: string,
  serverTypes: MCPServerID[]
): Promise<void> {
  const target = getTarget(targetId);

  if (!target) {
    throw new Error(`Target not found: ${targetId}`);
  }

  // Read current configuration
  const config = await target.readConfig(cwd);

  // Get MCP section
  const mcpConfigPath = target.config.mcpConfigPath;
  const mcpSection = getNestedProperty(config, mcpConfigPath);

  if (!mcpSection) {
    console.log('ℹ️  No MCP servers configured');
    return;
  }

  let removedCount = 0;

  // Remove each requested server
  for (const serverType of serverTypes) {
    const server = MCP_SERVER_REGISTRY[serverType];
    if (!server) {
      console.warn(`Warning: Unknown MCP server type: ${serverType}`);
      continue;
    }

    if (mcpSection[server.name]) {
      delete mcpSection[server.name];
      console.log(`🗑️  Removed MCP server: ${server.name}`);
      removedCount++;
    } else {
      console.log(`ℹ️  MCP server not found: ${server.name}`);
    }
  }

  // Remove MCP section if it's empty
  if (Object.keys(mcpSection).length === 0) {
    deleteNestedProperty(config, mcpConfigPath);
  } else {
    setNestedProperty(config, mcpConfigPath, mcpSection);
  }

  // Write the updated configuration
  await target.writeConfig(cwd, config);
  console.log(`✅ Updated ${target.config.configFile} (removed ${removedCount} MCP server(s))`);
}

/**
 * List currently configured MCP servers for a target
 */
export async function listMCPServersForTarget(cwd: string, targetId: string): Promise<void> {
  const target = getTarget(targetId);

  if (!target) {
    throw new Error(`Target not found: ${targetId}`);
  }

  // Read current configuration
  const config = await target.readConfig(cwd);

  // Get MCP section
  const mcpConfigPath = target.config.mcpConfigPath;
  const mcpSection = getNestedProperty(config, mcpConfigPath);

  if (!mcpSection || Object.keys(mcpSection).length === 0) {
    console.log('ℹ️  No MCP servers configured');
    return;
  }

  console.log(`📋 Currently configured MCP servers for ${target.name}:`);
  console.log('');

  for (const [name, serverConfig] of Object.entries(mcpSection)) {
    let configInfo = '';
    if (serverConfig && typeof serverConfig === 'object' && 'type' in serverConfig) {
      if (serverConfig.type === 'local') {
        configInfo = (serverConfig as any).command?.join(' ') || 'Unknown command';
      } else if (serverConfig.type === 'remote') {
        configInfo = `HTTP: ${(serverConfig as any).url}`;
      }
    }

    console.log(`  • ${name}: ${configInfo}`);

    // Find the server type for additional info
    const serverInfo = Object.values(MCP_SERVER_REGISTRY).find((s) => s.name === name);
    if (serverInfo) {
      console.log(`    ${serverInfo.description}`);
    }
    console.log('');
  }
}

/**
 * Configure MCP server for a target
 */
export async function configureMCPServerForTarget(
  cwd: string,
  targetId: string,
  serverType: MCPServerID
): Promise<boolean> {
  const target = getTarget(targetId);

  if (!target) {
    throw new Error(`Target not found: ${targetId}`);
  }

  const server = MCP_SERVER_REGISTRY[serverType];
  if (!server) {
    console.error(`❌ Unknown MCP server: ${serverType}`);
    return false;
  }

  // For servers that don't require API keys
  const requiredEnvVars = getRequiredEnvVars(serverType);
  const optionalEnvVars = getOptionalEnvVars(serverType);

  if (requiredEnvVars.length === 0 && optionalEnvVars.length === 0) {
    console.log(`ℹ️  ${server.description} does not require any API keys`);
    return true;
  }

  // For now, just return true for servers that require configuration
  // In a real implementation, you would prompt for API keys here
  console.log(`ℹ️  ${server.description} requires configuration`);
  return true;
}

/**
 * Configure API keys for a specific MCP server in a target
 * @returns Promise<boolean> - true if API keys were provided, false otherwise
 */
export function getTargetHelpText(targetId: string): string {
  const target = getTarget(targetId);
  return target ? target.getHelpText() : '';
}

/**
 * Get all available targets help text
 */
export function getAllTargetsHelpText(): string {
  const targets = IMPLEMENTED_TARGETS();
  return targets.map((target) => target.getHelpText()).join('\n\n');
}

/**
 * Validate target and return target ID
 */
export function validateTarget(targetId: string): string {
  const target = getTarget(targetId);
  if (!target) {
    throw new Error(
      `Unknown target: ${targetId}. Available targets: ${getImplementedTargetIDs().join(', ')}`
    );
  }
  if (!target.isImplemented) {
    throw new Error(
      `Target '${targetId}' is not implemented. Available targets: ${getImplementedTargetIDs().join(', ')}`
    );
  }
  return targetId;
}

/**
 * Check if target supports MCP servers
 */
export function targetSupportsMCPServers(targetId: string): boolean {
  const target = getTarget(targetId);
  return target?.config.installation.supportedMcpServers ?? false;
}

/**
 * Get targets that support MCP servers
 */
export function getTargetsWithMCPSupport(): string[] {
  return getTargetsWithMCPSupportFromRegistry();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get nested property from object using dot notation
 */
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set nested property in object using dot notation
 */
function setNestedProperty(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * Delete nested property from object using dot notation
 */
function deleteNestedProperty(obj: any, path: string): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => current?.[key], obj);
  if (target) {
    delete target[lastKey];
  }
}

/**
 * Prompt user for API keys interactively
 * (Copied from mcp-config.ts to avoid circular dependencies)
 */
async function promptForAPIKeys(serverTypes: MCPServerID[]): Promise<Record<string, string>> {
  const { createInterface } = await import('node:readline');
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const apiKeys: Record<string, string> = {};

  for (const serverType of serverTypes) {
    const server = MCP_SERVER_REGISTRY[serverType];
    const allEnvVars = getAllEnvVars(serverType);

    if (!allEnvVars.length) {
      continue;
    }

    console.log(`\n🔑 Configuring API keys for ${server.description}:`);

    for (const envVar of allEnvVars) {
      const envConfig = server.envVars?.[envVar];
      if (!envConfig) continue;

      const isRequired = envConfig.required;
      const promptText = isRequired
        ? `Enter ${envVar} (${envConfig.description}) (required): `
        : `Enter ${envVar} (${envConfig.description}) (optional, press Enter to skip): `;

      const answer = await new Promise<string>((resolve) => {
        rl.question(promptText, (input) => {
          resolve(input.trim());
        });
      });

      if (answer) {
        apiKeys[envVar] = answer;
        console.log(`✅ Set ${envVar}`);
      } else if (isRequired) {
        console.log(`⚠️  Skipped required ${envVar} - server may not function properly`);
      } else {
        console.log(`ℹ️  Skipped optional ${envVar}`);
      }
    }
  }

  rl.close();
  return apiKeys;
}

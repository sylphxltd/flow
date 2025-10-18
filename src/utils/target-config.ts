import path from 'node:path';
import {
  type MCPServerID,
  MCP_SERVER_REGISTRY,
  getAllServerIDs,
  getDefaultServers,
  getServerDefinition,
  getServersRequiringAPIKeys,
  isValidServerID,
} from '../config/servers.js';
import { targetManager } from '../core/target-manager.js';
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
  const target = targetManager.getTargetDefinition(targetId as any);
  const transformer = await targetManager.getTransformer(targetId as any);

  if (!transformer) {
    throw new Error(`No transformer available for target: ${targetId}`);
  }

  if (!target.config.installation.supportedMcpServers) {
    throw new Error(`Target ${targetId} does not support MCP servers`);
  }

  // Read current configuration
  const config = await transformer.readConfig(cwd);

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
      const transformedConfig = transformer.transformMCPConfig(server.config);
      mcpSection[server.name] = transformedConfig;
      console.log(`📦 Added MCP server: ${server.name} (${server.description})`);
      addedCount++;
    }
  }

  // Write the updated configuration
  await transformer.writeConfig(cwd, config);
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
  const target = targetManager.getTargetDefinition(targetId as any);
  const transformer = await targetManager.getTransformer(targetId as any);

  if (!transformer) {
    throw new Error(`No transformer available for target: ${targetId}`);
  }

  // Read current configuration
  const config = await transformer.readConfig(cwd);

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
  await transformer.writeConfig(cwd, config);
  console.log(`✅ Updated ${target.config.configFile} (removed ${removedCount} MCP server(s))`);
}

/**
 * List currently configured MCP servers for a target
 */
export async function listMCPServersForTarget(cwd: string, targetId: string): Promise<void> {
  const target = targetManager.getTargetDefinition(targetId as any);
  const transformer = await targetManager.getTransformer(targetId as any);

  if (!transformer) {
    throw new Error(`No transformer available for target: ${targetId}`);
  }

  // Read current configuration
  const config = await transformer.readConfig(cwd);

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
 * Configure API keys for a specific MCP server in a target
 * @returns Promise<boolean> - true if API keys were provided, false otherwise
 */
export async function configureMCPServerForTarget(
  cwd: string,
  targetId: string,
  serverType: MCPServerID
): Promise<boolean> {
  const target = targetManager.getTargetDefinition(targetId as any);
  const transformer = await targetManager.getTransformer(targetId as any);

  if (!transformer) {
    throw new Error(`No transformer available for target: ${targetId}`);
  }

  const server = MCP_SERVER_REGISTRY[serverType];
  if (!server) {
    console.error(`❌ Unknown MCP server: ${serverType}`);
    return false;
  }

  if (!server.requiredEnvVars?.length) {
    console.log(`ℹ️  ${server.name} does not require any API keys`);
    return true; // No keys needed, so consider it successful
  }

  console.log(`🔧 Configuring ${server.description} for ${target.name}...`);

  const apiKeys = await promptForAPIKeys([serverType]);

  if (Object.keys(apiKeys).length === 0) {
    console.log('❌ No API keys provided');
    return false;
  }

  // Read current config
  const config = await transformer.readConfig(cwd);

  // Get MCP section
  const mcpConfigPath = target.config.mcpConfigPath;
  const mcpSection = getNestedProperty(config, mcpConfigPath) || {};

  // Update server config with API keys (only for local servers)
  const currentConfig = mcpSection[server.name];
  if (currentConfig && currentConfig.type === 'local') {
    // Update existing local config
    mcpSection[server.name] = {
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
      const transformedConfig = transformer.transformMCPConfig(baseConfig);
      mcpSection[server.name] = {
        ...transformedConfig,
        environment: {
          ...(baseConfig.environment || {}),
          ...apiKeys,
        },
      };
    } else {
      // HTTP server - just add the base config
      const transformedConfig = transformer.transformMCPConfig(baseConfig);
      mcpSection[server.name] = transformedConfig;
    }
  }

  // Update config with new MCP section
  setNestedProperty(config, mcpConfigPath, mcpSection);

  // Write updated configuration
  await transformer.writeConfig(cwd, config);
  console.log(`✅ Updated ${server.name} with API keys for ${target.name}`);
  return true;
}

/**
 * Get target-specific help text
 */
export async function getTargetHelpText(targetId: string): Promise<string> {
  return await targetManager.getTargetHelpText(targetId as any);
}

/**
 * Get all available targets help text
 */
export function getAllTargetsHelpText(): string {
  return targetManager.getTargetsHelpText();
}

/**
 * Validate target and return target ID
 */
export function validateTarget(targetId: string): string {
  return targetManager.validateTarget(targetId);
}

/**
 * Check if target supports MCP servers
 */
export function targetSupportsMCPServers(targetId: string): boolean {
  return targetManager.supportsMCPServers(targetId as any);
}

/**
 * Get targets that support MCP servers
 */
export function getTargetsWithMCPSupport(): string[] {
  return targetManager.getTargetsWithMCPSupport();
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
    if (!server?.requiredEnvVars?.length) continue;

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

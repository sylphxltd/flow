import path from 'node:path';
import {
  type MCPServerID,
  MCP_SERVER_REGISTRY,
  getAllEnvVars,
  getAllServerIDs,
  getDefaultServers,
  getOptionalEnvVars,
  getRequiredEnvVars,
  getSecretEnvVars,
  getServerDefinition,
  getServersRequiringAPIKeys,
  isValidServerID,
} from '../config/servers.js';
import { targetManager } from '../core/target-manager.js';
import type { MCPServerConfigUnion } from '../types.js';
import { secretUtils } from './secret-utils.js';

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
  const target = targetManager.getTarget(targetId);

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
      let transformedConfig = target.transformMCPConfig(server.config, server.id);

      // Apply target-specific configuration for sylphx-flow
      if (server.id === 'sylphx-flow' && target.mcpServerConfig?.['sylphx-flow']) {
        const targetConfig = target.mcpServerConfig['sylphx-flow'];
        const args = [];

        if (targetConfig.enableMemory) args.push('--enable-memory');
        if (targetConfig.enableTime) args.push('--enable-time');
        if (targetConfig.enableProjectStartup) args.push('--enable-project-startup');
        if (targetConfig.enableKnowledge) args.push('--enable-knowledge');
        if (targetConfig.knowledgeAsTools) args.push('--knowledge-as-tools');

        // Update the command to include the configuration
        if (transformedConfig.type === 'local') {
          transformedConfig.command = [...transformedConfig.command, ...args];
        } else if (transformedConfig.type === 'stdio') {
          transformedConfig.args = [...(transformedConfig.args || []), ...args];
        }
      }

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
  const target = targetManager.getTarget(targetId);

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
  const target = targetManager.getTarget(targetId);

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
 * Configure API keys for a specific MCP server in a target
 * @returns Promise<boolean> - true if API keys were provided, false otherwise
 */
export async function configureMCPServerForTarget(
  cwd: string,
  targetId: string,
  serverType: MCPServerID
): Promise<boolean> {
  const target = targetManager.getTarget(targetId);

  if (!target) {
    throw new Error(`Target not found: ${targetId}`);
  }

  const server = MCP_SERVER_REGISTRY[serverType];
  if (!server) {
    console.error(`❌ Unknown MCP server: ${serverType}`);
    return false;
  }

  const requiredEnvVars = getRequiredEnvVars(serverType);
  const optionalEnvVars = getOptionalEnvVars(serverType);

  if (requiredEnvVars.length === 0 && optionalEnvVars.length === 0) {
    console.log(`ℹ️  ${server.name} does not require any API keys`);
    return true; // No keys needed, so consider it successful
  }

  console.log(`🔧 Configuring ${server.description} for ${target.name}...`);

  // Check if server already exists
  const config = await target.readConfig(cwd);
  const mcpConfigPath = target.config.mcpConfigPath;
  const mcpSection = getNestedProperty(config, mcpConfigPath);
  const isServerInstalled = !!mcpSection?.[server.name];

  // Check if existing server has valid keys (only required keys matter for validity)
  let hasExistingValidKeys = false;
  if (isServerInstalled && requiredEnvVars.length) {
    const serverConfig = mcpSection[server.name];
    hasExistingValidKeys = requiredEnvVars.every((envVar) => {
      const envValue = serverConfig.environment?.[envVar];
      return envValue && envValue.trim() !== '';
    });
  } else if (isServerInstalled && requiredEnvVars.length === 0) {
    // Server has no required keys, so it's always valid
    hasExistingValidKeys = true;
  }

  // First, check environment variables for existing API keys
  const envApiKeys: Record<string, string> = {};
  const allEnvVars = getAllEnvVars(serverType);

  for (const envVar of allEnvVars) {
    const envValue = process.env[envVar];
    if (envValue && envValue.trim() !== '') {
      envApiKeys[envVar] = envValue.trim();
    }
  }

  // If we have all required keys from environment, use them
  const hasAllRequiredEnvKeys = requiredEnvVars.every(
    (envVar) => envApiKeys[envVar] && envApiKeys[envVar].trim() !== ''
  );

  let apiKeys: Record<string, string>;
  if (hasAllRequiredEnvKeys) {
    console.log(`✅ Found required API keys in environment variables`);
    apiKeys = { ...envApiKeys };
  } else {
    // Prompt for missing keys
    apiKeys = await promptForAPIKeys([serverType], envApiKeys);
  }

  // Check if all required environment variables are provided
  const hasAllRequiredKeys = requiredEnvVars.every(
    (envVar) => apiKeys[envVar] && apiKeys[envVar].trim() !== ''
  );

  if (!hasAllRequiredKeys) {
    // User didn't provide all required keys
    if (isServerInstalled && !hasExistingValidKeys) {
      // Case 1: Already installed + no keys + user doesn't provide → DELETE
      console.log(`🗑️  Removing ${server.name} (no API keys provided)`);
      delete mcpSection[server.name];

      // Remove MCP section if it's empty
      if (Object.keys(mcpSection).length === 0) {
        deleteNestedProperty(config, mcpConfigPath);
      } else {
        setNestedProperty(config, mcpConfigPath, mcpSection);
      }

      await target.writeConfig(cwd, config);
      return false;
    }
    if (isServerInstalled && hasExistingValidKeys) {
      // Case 2: Already installed + has keys + user doesn't provide → KEEP
      console.log(`✅ Keeping ${server.name} (existing API keys are valid)`);
      return true;
    }
    // Case 4: Not installed + required keys + user doesn't provide → SKIP
    console.log(`⚠️  Skipping ${server.name} (required API keys not provided)`);
    return false;
  }

  // Get MCP section for update (ensure it exists)
  const mcpSectionForUpdate = mcpSection || {};

  // Separate secret and non-secret API keys based on server configuration
  const secretEnvVars = getSecretEnvVars(server.id);
  const secretApiKeys: Record<string, string> = {};
  const nonSecretApiKeys: Record<string, string> = {};

  for (const [key, value] of Object.entries(apiKeys)) {
    if (secretEnvVars.includes(key)) {
      secretApiKeys[key] = value;
    } else {
      nonSecretApiKeys[key] = value;
    }
  }

  // Convert secret API keys to file references if target supports it
  let processedSecretApiKeys = secretApiKeys;
  const targetConfig = targetManager.getTarget(targetId);
  if (
    targetConfig &&
    targetConfig.config.installation.supportedMcpServers &&
    targetConfig.config.installation.useSecretFiles !== false &&
    Object.keys(secretApiKeys).length > 0
  ) {
    processedSecretApiKeys = await secretUtils.convertSecretsToFileReferences(cwd, secretApiKeys);
    await secretUtils.addToGitignore(cwd);
  }

  // Combine processed secret keys with non-secret keys
  const processedApiKeys = { ...nonSecretApiKeys, ...processedSecretApiKeys };

  // Update server config with API keys (only for local servers)
  const currentConfig = mcpSectionForUpdate[server.name];
  if (currentConfig && currentConfig.type === 'local') {
    // Update existing local config
    mcpSectionForUpdate[server.name] = {
      ...currentConfig,
      environment: {
        ...(currentConfig.environment || {}),
        ...processedApiKeys,
      },
    };
  } else {
    // Create new config with API keys
    const baseConfig = server.config;
    if (baseConfig.type === 'local') {
      const transformedConfig = target.transformMCPConfig(baseConfig, server.id);
      mcpSectionForUpdate[server.name] = {
        ...transformedConfig,
        environment: {
          ...(baseConfig.environment || {}),
          ...processedApiKeys,
        },
      };
    } else {
      // HTTP server - just add the base config
      const transformedConfig = target.transformMCPConfig(baseConfig, server.id);
      mcpSectionForUpdate[server.name] = transformedConfig;
    }
  }

  // Update config with new MCP section
  setNestedProperty(config, mcpConfigPath, mcpSectionForUpdate);

  // Write updated configuration
  await target.writeConfig(cwd, config);
  console.log(`✅ Updated ${server.name} with API keys for ${target.name}`);
  return true;
}

/**
 * Get target-specific help text
 */
export function getTargetHelpText(targetId: string): string {
  const target = targetManager.getTarget(targetId);
  return target ? target.getHelpText() : '';
}

/**
 * Get all available targets help text
 */
export function getAllTargetsHelpText(): string {
  const targets = targetManager.getImplementedTargets();
  return targets.map((target) => target.getHelpText()).join('\n\n');
}

/**
 * Validate target and return target ID
 */
export function validateTarget(targetId: string): string {
  const target = targetManager.getTarget(targetId);
  if (!target) {
    throw new Error(
      `Unknown target: ${targetId}. Available targets: ${targetManager.getImplementedTargetIDs().join(', ')}`
    );
  }
  if (!target.isImplemented) {
    throw new Error(
      `Target '${targetId}' is not implemented. Available targets: ${targetManager.getImplementedTargetIDs().join(', ')}`
    );
  }
  return targetId;
}

/**
 * Check if target supports MCP servers
 */
export function targetSupportsMCPServers(targetId: string): boolean {
  const target = targetManager.getTarget(targetId);
  return target?.config.installation.supportedMcpServers ?? false;
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
 */
async function promptForAPIKeys(
  serverTypes: MCPServerID[],
  existingKeys: Record<string, string> = {}
): Promise<Record<string, string>> {
  const { createInterface } = await import('node:readline');
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const apiKeys: Record<string, string> = { ...existingKeys };

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
      const hasDefault = envConfig.default !== undefined;

      let promptText: string;
      if (isRequired) {
        if (hasDefault) {
          promptText = `Enter ${envVar} (${envConfig.description}) (required, default: ${envConfig.default}): `;
        } else {
          promptText = `Enter ${envVar} (${envConfig.description}) (required): `;
        }
      } else if (hasDefault) {
        promptText = `Enter ${envVar} (${envConfig.description}) (optional, default: ${envConfig.default}, press Enter to use default): `;
      } else {
        promptText = `Enter ${envVar} (${envConfig.description}) (optional, press Enter to skip): `;
      }

      const answer = await new Promise<string>((resolve) => {
        rl.question(promptText, (input) => {
          resolve(input.trim());
        });
      });

      let finalValue: string | undefined;
      let actionText: string;

      if (answer) {
        finalValue = answer;
        actionText = `Set ${envVar}`;
      } else if (hasDefault) {
        finalValue = envConfig.default;
        actionText = `Using default for ${envVar}`;
      } else if (isRequired) {
        console.log(`⚠️  Skipped required ${envVar} - server may not function properly`);
        continue;
      } else {
        console.log(`ℹ️  Skipped optional ${envVar}`);
        continue;
      }

      if (finalValue) {
        apiKeys[envVar] = finalValue;
        console.log(`✅ ${actionText}`);
      }
    }
  }

  rl.close();
  return apiKeys;
}

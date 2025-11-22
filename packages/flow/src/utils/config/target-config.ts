import { createInterface } from 'node:readline';
import {
  getAllEnvVars,
  getOptionalEnvVars,
  getRequiredEnvVars,
  getSecretEnvVars,
  MCP_SERVER_REGISTRY,
  type MCPServerID,
} from '../config/servers.js';
import { targetManager } from '../core/target-manager.js';
import { resolveConfig } from '../services/mcp-service.js';
import { deleteNestedProperty, getNestedProperty, setNestedProperty } from './object-utils.js';
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
  const targetOption = targetManager.getTarget(targetId);

  if (targetOption._tag === 'None') {
    throw new Error(`Target not found: ${targetId}`);
  }

  const target = targetOption.value;

  if (!target.setupMCP) {
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
      const _transformedConfig = target.transformMCPConfig(server.config, server.id);

      // Apply dynamic command and args generation (only for CLI servers)
      let resolvedCommand: unknown;
      let resolvedArgs: unknown;

      if (server.config.command || server.config.args) {
        resolvedCommand = server.config.command
          ? await resolveConfig(server.config.command)
          : undefined;
        resolvedArgs = server.config.args ? await resolveConfig(server.config.args) : [];
      }

      // Update the config with resolved values - target will handle format
      const updatedConfig = {
        ...server.config,
        command: resolvedCommand,
        args: resolvedArgs,
      };

      // Let target handle the transformation
      const finalConfig = target.transformMCPConfig(updatedConfig, server.id);

      mcpSection[server.name] = finalConfig;
      console.log(`📦 Added MCP server: ${server.name} (${server.description})`);
      addedCount++;
    }
  }

  // Write the updated configuration
  await target.writeConfig(cwd, config);
  console.log(`✓ Updated ${target.config.configFile} with ${addedCount} new MCP server(s)`);
}

/**
 * Remove MCP servers from a target's configuration
 */
export async function removeMCPServersFromTarget(
  cwd: string,
  targetId: string,
  serverTypes: MCPServerID[]
): Promise<void> {
  const targetOption = targetManager.getTarget(targetId);

  if (targetOption._tag === 'None') {
    throw new Error(`Target not found: ${targetId}`);
  }

  const target = targetOption.value;

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
  console.log(`✓ Updated ${target.config.configFile} (removed ${removedCount} MCP server(s))`);
}

/**
 * List currently configured MCP servers for a target
 */
export async function listMCPServersForTarget(cwd: string, targetId: string): Promise<void> {
  const targetOption = targetManager.getTarget(targetId);

  if (targetOption._tag === 'None') {
    throw new Error(`Target not found: ${targetId}`);
  }

  const target = targetOption.value;

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
  const targetOption = targetManager.getTarget(targetId);

  if (targetOption._tag === 'None') {
    throw new Error(`Target not found: ${targetId}`);
  }

  const target = targetOption.value;

  const server = MCP_SERVER_REGISTRY[serverType];
  if (!server) {
    console.error(`✗ Unknown MCP server: ${serverType}`);
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
      const envValue = serverConfig.env?.[envVar] || serverConfig.environment?.[envVar];
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

  // Also extract existing keys from MCP config
  const existingConfigKeys: Record<string, string> = {};
  if (isServerInstalled && mcpSection[server.name]) {
    const serverConfig = mcpSection[server.name];
    for (const envVar of allEnvVars) {
      const configValue = serverConfig.env?.[envVar] || serverConfig.environment?.[envVar];
      if (configValue && configValue.trim() !== '') {
        existingConfigKeys[envVar] = configValue.trim();
      }
    }
  }

  // Merge existing keys: env vars take precedence over config keys
  const existingKeys = { ...existingConfigKeys, ...envApiKeys };

  // If we have all required keys from environment, use them
  const _hasAllRequiredEnvKeys = requiredEnvVars.every(
    (envVar) => envApiKeys[envVar] && envApiKeys[envVar].trim() !== ''
  );

  // mcp config is always for configuring - show UI with existing values
  console.log(
    '✓ Found existing API keys, you can update them or press Enter to keep current values'
  );
  const apiKeys = await promptForAPIKeys([serverType], existingKeys);

  // Check if all required environment variables are provided
  const hasAllRequiredKeys = requiredEnvVars.every(
    (envVar) => apiKeys[envVar] && apiKeys[envVar].trim() !== ''
  );

  // Check if user made any changes to existing keys
  const userMadeChanges = allEnvVars.some((envVar) => {
    const newValue = apiKeys[envVar];
    const existingValue = existingKeys[envVar];
    return newValue !== existingValue;
  });

  // If server is installed with valid keys and user didn't change anything, keep it
  if (isServerInstalled && hasExistingValidKeys && !userMadeChanges) {
    console.log(`✓ Keeping ${server.name} (existing API keys are valid)`);
    return true;
  }

  // For servers with required keys, validate them
  if (requiredEnvVars.length > 0 && !hasAllRequiredKeys) {
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
      console.log(`✓ Keeping ${server.name} (existing API keys are valid)`);
      return true;
    }
    // Case 4: Not installed + required keys + user doesn't provide → SKIP
    console.log(`⚠️  Skipping ${server.name} (required API keys not provided)`);
    return false;
  }

  // For servers with only optional envVars (like sylphx-flow), always proceed to save
  // if the user provided any values or if the server is being configured
  if (requiredEnvVars.length === 0 && optionalEnvVars.length > 0) {
    const hasUserInput = Object.keys(apiKeys).some((key) => {
      const envValue = apiKeys[key];
      const existingValue = envApiKeys[key];
      return envValue && envValue !== existingValue;
    });

    if (hasUserInput || !isServerInstalled) {
      console.log(`🔧 Updating ${server.name} configuration...`);
      // Proceed to save/update the configuration
    } else {
      console.log(`✓ No changes needed for ${server.name}`);
      return true;
    }
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
  const targetConfigOption = targetManager.getTarget(targetId);

  if (
    targetConfigOption._tag === 'Some' &&
    targetConfigOption.value.setupMCP &&
    targetConfigOption.value.config.installation.useSecretFiles !== false &&
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
  console.log(`✓ Updated ${server.name} with API keys for ${target.name}`);
  return true;
}

/**
 * Get target-specific help text
 */
export function getTargetHelpText(targetId: string): string {
  const targetOption = targetManager.getTarget(targetId);
  if (targetOption._tag === 'Some') {
    return targetOption.value.getHelpText();
  }
  return '';
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
  const targetOption = targetManager.getTarget(targetId);

  if (targetOption._tag === 'None') {
    throw new Error(
      `Unknown target: ${targetId}. Available targets: ${targetManager.getImplementedTargetIDs().join(', ')}`
    );
  }

  const target = targetOption.value;
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
  const targetOption = targetManager.getTarget(targetId);
  if (targetOption._tag === 'None') {
    return false;
  }
  return !!targetOption.value.setupMCP;
}

/**
 * Get targets that support MCP servers
 */
export function getTargetsWithMCPSupport(): string[] {
  const targets = targetManager.getTargetsWithMCPSupport();
  return targets.map((target) => target.id);
}

/**
 * Prompt user for API keys interactively
 */
async function promptForAPIKeys(
  serverTypes: MCPServerID[],
  existingKeys: Record<string, string> = {}
): Promise<Record<string, string>> {
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
      if (!envConfig) {
        continue;
      }

      const isRequired = envConfig.required;
      const hasDefault = envConfig.default !== undefined;
      const existingValue = existingKeys[envVar];
      const displayExisting = existingValue
        ? ` (current: ${existingValue.substring(0, 9)}${existingValue.length > 9 ? '...' : ''})`
        : '';

      let promptText: string;
      if (isRequired) {
        if (hasDefault) {
          promptText = `Enter ${envVar} (${envConfig.description}) (required, default: ${envConfig.default}${displayExisting}): `;
        } else {
          promptText = `Enter ${envVar} (${envConfig.description}) (required${displayExisting}): `;
        }
      } else if (hasDefault) {
        promptText = `Enter ${envVar} (${envConfig.description}) (optional, default: ${envConfig.default}${displayExisting}, press Enter to keep current): `;
      } else {
        promptText = `Enter ${envVar} (${envConfig.description}) (optional${displayExisting}, press Enter to keep current): `;
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
        actionText = `Updated ${envVar}`;
      } else if (existingValue) {
        finalValue = existingValue;
        actionText = `Kept existing ${envVar}`;
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
        console.log(`✓ ${actionText}`);
      }
    }
  }

  rl.close();
  return apiKeys;
}

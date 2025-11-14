import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { MCP_SERVER_REGISTRY, type MCPServerID } from '../config/servers.js';
import type { TargetConfigurationData } from '../types/target-config.types.js';
import type { Target } from '../types.js';
import { isCLICommandConfig, type Resolvable } from '../types.js';

export interface ValidationResult {
  isValid: boolean;
  missingRequired: string[];
  invalidValues: string[];
}

export interface InstallOptions {
  skipValidation?: boolean;
  dryRun?: boolean;
}

/**
 * MCPService Interface
 * Service for managing MCP server installation and configuration
 */
export interface MCPService {
  readonly getAllServerIds: () => MCPServerID[];
  readonly getAvailableServers: () => Promise<MCPServerID[]>;
  readonly getInstalledServerIds: () => Promise<MCPServerID[]>;
  readonly getRequiringConfiguration: (serverIds: MCPServerID[]) => MCPServerID[];
  readonly validateServer: (
    serverId: MCPServerID,
    envValues: Record<string, string>
  ) => ValidationResult;
  readonly configureServer: (
    serverId: MCPServerID,
    collectedEnv?: Record<string, string>
  ) => Promise<Record<string, string>>;
  readonly installServers: (
    serverIds: MCPServerID[],
    serverConfigs?: Record<MCPServerID, Record<string, string>>
  ) => Promise<void>;
  readonly readConfig: () => Promise<TargetConfigurationData>;
  readonly writeConfig: (configData: TargetConfigurationData) => Promise<void>;
}

/**
 * MCPService Dependencies
 */
export interface MCPServiceDeps {
  readonly target: Target;
}

/**
 * Helper function to resolve static or dynamic configuration values
 */
function resolveConfig<T>(config: Resolvable<T>): Promise<T> {
  if (typeof config === 'function') {
    const result = (config as () => T | Promise<T>)();
    return Promise.resolve(result);
  }
  return Promise.resolve(config);
}

/**
 * Helper function to resolve static or dynamic configuration values with parameters
 */
export function resolveConfigWithParams<T, P>(
  config: T | ((params: P) => Promise<T>) | ((params: P) => T),
  params: P
): Promise<T> {
  if (typeof config === 'function') {
    const result = (config as (params: P) => T | Promise<T>)(params);
    return Promise.resolve(result);
  }
  return Promise.resolve(config);
}

export { resolveConfig };

/**
 * Create MCP Service (Factory Function)
 * Handles MCP server installation and configuration
 */
export const createMCPService = (deps: MCPServiceDeps): MCPService => {
  /**
   * Get all available server IDs from registry
   */
  const getAllServerIds = (): MCPServerID[] => {
    return Object.keys(MCP_SERVER_REGISTRY) as MCPServerID[];
  };

  /**
   * Get servers that are not yet installed
   */
  const getAvailableServers = async (): Promise<MCPServerID[]> => {
    const existingServerIds = await getInstalledServerIds();
    return getAllServerIds().filter((id) => !existingServerIds.includes(id));
  };

  /**
   * Get currently installed server IDs
   */
  const getInstalledServerIds = async (): Promise<MCPServerID[]> => {
    try {
      const configData = await deps.target.readConfig(process.cwd());
      const mcpConfigPath = deps.target.config.mcpConfigPath;
      const existingMcpSection = getNestedProperty(configData, mcpConfigPath) || {};
      const existingServerNames = Object.keys(existingMcpSection);

      return Object.values(MCP_SERVER_REGISTRY)
        .filter((server) => existingServerNames.includes(server.name))
        .map((server) => server.id);
    } catch (_error) {
      return [];
    }
  };

  /**
   * Get servers that require configuration
   */
  const getRequiringConfiguration = (serverIds: MCPServerID[]): MCPServerID[] => {
    return serverIds.filter((id) => {
      const server = MCP_SERVER_REGISTRY[id];
      return !!server.envVars;
    });
  };

  /**
   * Validate server configuration
   */
  const validateServer = (
    serverId: MCPServerID,
    envValues: Record<string, string>
  ): ValidationResult => {
    const server = MCP_SERVER_REGISTRY[serverId];
    if (!server?.envVars) {
      return { isValid: true, missingRequired: [], invalidValues: [] };
    }

    const missingRequired: string[] = [];
    const invalidValues: string[] = [];

    for (const [key, config] of Object.entries(server.envVars)) {
      const value = envValues[key] || process.env[key] || '';

      if (config.required && (!value || value === '')) {
        missingRequired.push(key);
      }

      // Don't validate dependencies here - configureServer already handles them
      // by skipping fields with missing dependencies
    }

    return {
      isValid: missingRequired.length === 0 && invalidValues.length === 0,
      missingRequired,
      invalidValues,
    };
  };

  /**
   * Configure server through interactive prompts
   */
  const configureServer = async (
    serverId: MCPServerID,
    collectedEnv: Record<string, string> = {}
  ): Promise<Record<string, string>> => {
    const server = MCP_SERVER_REGISTRY[serverId];
    const values: Record<string, string> = {};

    if (!server.envVars) {
      return values;
    }

    console.log('');
    console.log(chalk.cyan(`▸ ${server.name}`));
    console.log(chalk.gray(`  ${server.description}`));
    console.log('');

    for (const [key, config] of Object.entries(server.envVars)) {
      if (config.dependsOn) {
        const missingDeps = config.dependsOn.filter(
          (dep) => !(collectedEnv[dep] || process.env[dep])
        );
        if (missingDeps.length > 0) {
          continue;
        }
      }

      // Check if value already exists in collectedEnv or process.env
      const existingValue = collectedEnv[key] || process.env[key];
      let value: string;

      if (existingValue && existingValue.trim() !== '') {
        value = existingValue;
      } else if (config.fetchChoices) {
        const spinner = ora('Fetching options...').start();

        for (const [envKey, envValue] of Object.entries(collectedEnv)) {
          if (envValue) {
            process.env[envKey] = envValue;
          }
        }

        try {
          const choices = await config.fetchChoices();
          spinner.stop();

          const answer = await inquirer.prompt({
            type: 'list',
            name: 'value',
            message: `${key}${config.required ? ' *' : ''}`,
            choices,
            default: config.default || choices[0],
          });
          value = answer.value;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          spinner.fail(chalk.red(`Failed to fetch options: ${errorMsg}`));

          const answer = await inquirer.prompt({
            type: 'input',
            name: 'value',
            message: `${key}${config.required ? ' *' : ''}`,
            default: config.default,
          });
          value = answer.value;
        }
      } else if (key === 'GEMINI_MODEL') {
        const answer = await inquirer.prompt({
          type: 'list',
          name: 'model',
          message: `${key}${config.required ? ' *' : ''}`,
          choices: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
          default: config.default || 'gemini-2.5-flash',
        });
        value = answer.model;
      } else {
        const answer = await inquirer.prompt({
          type: config.secret ? 'password' : 'input',
          name: 'value',
          message: `${key}${config.required ? ' *' : ''}`,
          default: config.default,
          mask: config.secret ? '•' : undefined,
        });
        value = answer.value;
      }

      if (value) {
        values[key] = value;
        collectedEnv[key] = value;
      }
    }

    console.log(chalk.green('✓ Configured'));
    console.log('');

    return values;
  };

  /**
   * Install MCP servers to config file
   * Note: Configuration should be done separately before calling this
   */
  const installServers = async (
    serverIds: MCPServerID[],
    serverConfigs: Record<MCPServerID, Record<string, string>> = {}
  ): Promise<void> => {
    if (serverIds.length === 0) {
      return;
    }

    try {
      // Read current config
      const configData = await deps.target.readConfig(process.cwd());
      const mcpConfigPath = deps.target.config.mcpConfigPath;
      const existingMcpSection = getNestedProperty(configData, mcpConfigPath) || {};
      const mcpSection = { ...existingMcpSection };

      // Add/update each server
      for (const serverId of serverIds) {
        const server = MCP_SERVER_REGISTRY[serverId];
        const configuredValues = serverConfigs[serverId] || {};

        // Prepare config with environment variables and dynamic command
        let configToTransform = { ...server.config };

        // Resolve potentially dynamic command and args (only for CLI servers)
        let resolvedCommand: unknown;
        let resolvedArgs: unknown;

        if (isCLICommandConfig(server.config)) {
          resolvedCommand = server.config.command
            ? await resolveConfig(server.config.command)
            : undefined;
          resolvedArgs = server.config.args ? await resolveConfig(server.config.args) : [];
        }

        // Update the config with resolved values (only for CLI servers)
        if (isCLICommandConfig(server.config)) {
          configToTransform = {
            ...server.config,
            command: resolvedCommand,
            args: resolvedArgs,
          };
        }

        // If server has env vars and we have configured values, merge them
        if (Object.keys(configuredValues).length > 0) {
          const serverConfigEnv =
            server.config.type === 'local'
              ? server.config.environment
              : server.config.type === 'stdio'
                ? server.config.env
                : {};
          const updatedEnv = { ...serverConfigEnv };

          for (const [key, value] of Object.entries(configuredValues)) {
            if (value && value.trim() !== '') {
              updatedEnv[key] = value;
            }
          }

          if (configToTransform.type === 'local') {
            configToTransform.environment = updatedEnv;
          } else if (configToTransform.type === 'stdio') {
            configToTransform.env = updatedEnv;
          }
        }

        // Transform config for target-specific format
        const transformedConfig = deps.target.transformMCPConfig(configToTransform, serverId);

        mcpSection[server.name] = transformedConfig;
      }

      // Write updated config
      setNestedProperty(configData, mcpConfigPath, mcpSection);
      await deps.target.writeConfig(process.cwd(), configData);

      // Approve MCP servers if the target supports it
      if (deps.target.approveMCPServers) {
        const serverNames = serverIds.map((id) => MCP_SERVER_REGISTRY[id].name);
        await deps.target.approveMCPServers(process.cwd(), serverNames);
      }
    } catch (error) {
      throw new Error(
        `Failed to install MCP servers: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  /**
   * Read target configuration
   */
  const readConfig = async (): Promise<TargetConfigurationData> => {
    try {
      return (await deps.target.readConfig(process.cwd())) as TargetConfigurationData;
    } catch (_error) {
      return { settings: {} };
    }
  };

  /**
   * Write target configuration
   */
  const writeConfig = async (configData: TargetConfigurationData): Promise<void> => {
    await deps.target.writeConfig(process.cwd(), configData);
  };

  /**
   * Get nested property from object using dot notation path
   * Pure function - does not mutate input
   */
  const getNestedProperty = (obj: TargetConfigurationData, path: string): unknown => {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (typeof current === 'object' && current !== null) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  };

  /**
   * Set nested property in object using dot notation path
   * SIDE EFFECT: Mutates the input object
   * NOTE: This is intentional for config file updates
   */
  const setNestedProperty = (obj: TargetConfigurationData, path: string, value: unknown): void => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    if (!lastKey) {
      return;
    }

    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  };

  // Return service interface
  return {
    getAllServerIds,
    getAvailableServers,
    getInstalledServerIds,
    getRequiringConfiguration,
    validateServer,
    configureServer,
    installServers,
    readConfig,
    writeConfig,
  };
};

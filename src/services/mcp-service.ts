import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { type MCPServerID, MCP_SERVER_REGISTRY } from '../config/servers.js';
import { targetManager } from '../core/target-manager.js';
import type { Target } from '../types.js';
import type { TargetConfigurationData } from '../types/target-config.types.js';

export interface ValidationResult {
  isValid: boolean;
  missingRequired: string[];
  invalidValues: string[];
}

export interface InstallOptions {
  skipValidation?: boolean;
  dryRun?: boolean;
}

export class MCPService {
  private target: Target;

  constructor(targetId: string) {
    const target = targetManager.getTarget(targetId);
    if (!target) {
      throw new Error(`Target not found: ${targetId}`);
    }
    this.target = target;
  }

  getAllServerIds(): MCPServerID[] {
    return Object.keys(MCP_SERVER_REGISTRY) as MCPServerID[];
  }

  async getAvailableServers(): Promise<MCPServerID[]> {
    const existingServerIds = await this.getInstalledServerIds();
    return this.getAllServerIds().filter((id) => !existingServerIds.includes(id));
  }

  async getInstalledServerIds(): Promise<MCPServerID[]> {
    try {
      const configData = await this.target.readConfig(process.cwd());
      const mcpConfigPath = this.target.config.mcpConfigPath;
      const existingMcpSection = this.getNestedProperty(configData, mcpConfigPath) || {};
      const existingServerNames = Object.keys(existingMcpSection);

      return Object.values(MCP_SERVER_REGISTRY)
        .filter((server) => existingServerNames.includes(server.name))
        .map((server) => server.id);
    } catch (error) {
      return [];
    }
  }

  getRequiringConfiguration(serverIds: MCPServerID[]): MCPServerID[] {
    return serverIds.filter((id) => {
      const server = MCP_SERVER_REGISTRY[id];
      return !!server.envVars;
    });
  }

  validateServer(serverId: MCPServerID, envValues: Record<string, string>): ValidationResult {
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
        continue;
      }

      // Don't validate dependencies here - configureServer already handles them
      // by skipping fields with missing dependencies
    }

    return {
      isValid: missingRequired.length === 0 && invalidValues.length === 0,
      missingRequired,
      invalidValues,
    };
  }

  async configureServer(
    serverId: MCPServerID,
    collectedEnv: Record<string, string> = {}
  ): Promise<Record<string, string>> {
    const server = MCP_SERVER_REGISTRY[serverId];
    const values: Record<string, string> = {};

    if (!server.envVars) return values;

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
  }

  /**
   * Install MCP servers to config file
   * Note: Configuration should be done separately before calling this
   */
  async installServers(
    serverIds: MCPServerID[],
    serverConfigs: Record<MCPServerID, Record<string, string>> = {}
  ): Promise<void> {
    if (serverIds.length === 0) {
      return;
    }

    try {
      // Read current config
      const configData = await this.target.readConfig(process.cwd());
      const mcpConfigPath = this.target.config.mcpConfigPath;
      const existingMcpSection = this.getNestedProperty(configData, mcpConfigPath) || {};
      const mcpSection = { ...existingMcpSection };

      // Add/update each server
      for (const serverId of serverIds) {
        const server = MCP_SERVER_REGISTRY[serverId];
        const configuredValues = serverConfigs[serverId] || {};

        // Prepare config with environment variables
        let configToTransform = { ...server.config };

        // If server has env vars and we have configured values, merge them
        if (Object.keys(configuredValues).length > 0) {
          const serverConfigEnv = server.config.type === 'local' ? server.config.environment : {};
          const updatedEnv = { ...serverConfigEnv };

          for (const [key, value] of Object.entries(configuredValues)) {
            if (value && value.trim() !== '') {
              updatedEnv[key] = value;
            }
          }

          configToTransform = {
            ...server.config,
            environment: updatedEnv,
          };
        }

        // Transform config for target-specific format
        const transformedConfig = this.target.transformMCPConfig(configToTransform, serverId);
        mcpSection[server.name] = transformedConfig;
      }

      // Write updated config
      this.setNestedProperty(configData, mcpConfigPath, mcpSection);
      await this.target.writeConfig(process.cwd(), configData);

      // Approve MCP servers if the target supports it
      if (this.target.approveMCPServers) {
        const serverNames = selectedServers.map((id) => this.getServerById(id).name);
        await this.target.approveMCPServers(process.cwd(), serverNames);
      }
    } catch (error) {
      throw new Error(`Failed to install MCP servers: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async readConfig(): Promise<TargetConfigurationData> {
    try {
      return (await this.target.readConfig(process.cwd())) as TargetConfigurationData;
    } catch (error) {
      return { settings: {} };
    }
  }

  async writeConfig(configData: TargetConfigurationData): Promise<void> {
    await this.target.writeConfig(process.cwd(), configData);
  }

  private getNestedProperty(obj: TargetConfigurationData, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (typeof current === 'object' && current !== null) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  private setNestedProperty(obj: TargetConfigurationData, path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}

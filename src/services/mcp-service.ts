import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { MCP_SERVER_REGISTRY, type MCPServerID } from '../config/servers.js';
import { targetManager } from '../core/target-manager.js';
import type { Target } from '../types.js';

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

  getAvailableServers(): MCPServerID[] {
    const existingServerIds = this.getInstalledServerIds();
    return this.getAllServerIds().filter((id) => !existingServerIds.includes(id));
  }

  getInstalledServerIds(): MCPServerID[] {
    try {
      const configData = this.target.readConfig(process.cwd());
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
    console.log(chalk.gray(server.description));
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

    return values;
  }

  async installServers(serverIds: MCPServerID[], options: InstallOptions = {}): Promise<void> {
    if (serverIds.length === 0) {
      console.log(chalk.green('✓ No servers to install'));
      return;
    }

    console.log('');
    console.log(chalk.gray(`Installing: ${serverIds.join(', ')}`));

    const serversNeedingConfig = this.getRequiringConfiguration(serverIds);
    const serverConfigs: Array<{ id: MCPServerID; values: Record<string, string> }> = [];

    if (serversNeedingConfig.length > 0) {
      const collectedEnv: Record<string, string> = {};
      for (const serverId of serversNeedingConfig) {
        const values = await this.configureServer(serverId, collectedEnv);
        serverConfigs.push({ id: serverId, values });
      }
    }

    if (!options.skipValidation) {
      const invalidServers: Array<{ id: MCPServerID; name: string; validation: ValidationResult }> =
        [];

      for (const { id: serverId, values } of serverConfigs) {
        const validation = this.validateServer(serverId, values);
        if (!validation.isValid) {
          const server = MCP_SERVER_REGISTRY[serverId];
          invalidServers.push({ id: serverId, name: server.name, validation });
        }
      }

      if (invalidServers.length > 0) {
        console.log(chalk.yellow('⚠ Skipping servers with invalid configuration:'));
        invalidServers.forEach(({ name, validation }) => {
          const issues = [...validation.missingRequired, ...validation.invalidValues];
          console.log(chalk.gray(`  • ${name}: ${issues.join(', ')}`));
        });

        const validServerConfigs = serverConfigs.filter(
          ({ id: serverId }) => !invalidServers.some((s) => s.id === serverId)
        );
        serverConfigs.length = 0;
        serverConfigs.push(...validServerConfigs);
      }
    }

    if (options.dryRun) {
      console.log(chalk.yellow('\n  Dry run - configuration prepared but not saved'));
      return;
    }

    const spinner = ora('Saving configuration...').start();

    try {
      const configData = this.target.readConfig(process.cwd());
      const mcpConfigPath = this.target.config.mcpConfigPath;
      const existingMcpSection = this.getNestedProperty(configData, mcpConfigPath) || {};
      const mcpSection = { ...existingMcpSection };

      for (const { id: serverId, values } of serverConfigs) {
        const server = MCP_SERVER_REGISTRY[serverId];
        const serverConfigEnv = server.config.type === 'local' ? server.config.environment : {};

        const updatedEnv = { ...serverConfigEnv };
        for (const [key, value] of Object.entries(values)) {
          if (value && value.trim() !== '') {
            updatedEnv[key] = value;
          }
        }

        mcpSection[server.name] = {
          ...server.config,
          environment: updatedEnv,
        };
      }

      const serversNotNeedingConfig = serverIds.filter((s) => !serversNeedingConfig.includes(s));
      for (const serverId of serversNotNeedingConfig) {
        const server = MCP_SERVER_REGISTRY[serverId];
        mcpSection[server.name] = server.config;
      }

      this.setNestedProperty(configData, mcpConfigPath, mcpSection);
      this.target.writeConfig(process.cwd(), configData);

      spinner.succeed(
        chalk.green(`✓ ${serverIds.length} server${serverIds.length > 1 ? 's' : ''} installed`)
      );
    } catch (error) {
      spinner.fail(chalk.red('Failed to save configuration'));
      throw error;
    }
  }

  readConfig(): any {
    try {
      return this.target.readConfig(process.cwd());
    } catch (error) {
      return {};
    }
  }

  writeConfig(configData: any): void {
    this.target.writeConfig(process.cwd(), configData);
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}

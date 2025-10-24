import chalk from 'chalk';
import inquirer from 'inquirer';
import type { MCPServerID } from '../config/servers.js';
import {
  MCP_SERVER_REGISTRY,
  getAllEnvVars,
  getAllServerIDs,
  getRequiredEnvVars,
  getSecretEnvVars,
} from '../config/servers.js';
import { targetManager } from '../core/target-manager.js';
import {
  deleteNestedProperty,
  getNestedProperty,
  setNestedProperty,
} from '../utils/target-config.js';

interface MCPConfigOptions {
  serverId?: MCPServerID;
  existingValues: Record<string, string>;
  targetId: string;
  cwd: string;
}

interface ServerConfiguration {
  id: MCPServerID;
  name: string;
  description: string;
  fields: ConfigField[];
}

interface ConfigField {
  name: string;
  description: string;
  required: boolean;
  secret: boolean;
  defaultValue?: string;
  currentValue?: string;
  options?: string[];
}

export class MCPConfigurator {
  private targetId: string;
  private cwd: string;
  private serverId?: MCPServerID;
  private existingValues: Record<string, string>;

  constructor(options: MCPConfigOptions) {
    this.targetId = options.targetId;
    this.cwd = options.cwd;
    this.serverId = options.serverId;
    this.existingValues = options.existingValues;
  }

  async configure(): Promise<{ values: Record<string, string>; serverId?: MCPServerID }> {
    console.clear();
    console.log(chalk.cyan.bold('⚙️ MCP Configuration'));
    console.log(chalk.gray('─'.repeat(50)));

    // Step 1: Select server if not provided
    if (!this.serverId) {
      this.serverId = await this.selectServer();
    }

    const server = MCP_SERVER_REGISTRY[this.serverId];
    if (!server) {
      throw new Error(`Server not found: ${this.serverId}`);
    }

    console.log(chalk.blue(`\n▸ ${server.name}`));
    console.log(chalk.gray(`  ${server.description}`));

    // Step 2: Configure server if it has environment variables
    if (server.envVars && Object.keys(server.envVars).length > 0) {
      const values = await this.configureServer(server);
      return { values, serverId: this.serverId };
    } else {
      console.log(chalk.gray('\n✓ No configuration required for this server'));
      return { values: {}, serverId: this.serverId };
    }
  }

  private async selectServer(): Promise<MCPServerID> {
    const availableServers = getAllServerIDs().map((id) => {
      const server = MCP_SERVER_REGISTRY[id];
      return {
        name: `${server?.name || id} - ${server?.description || 'Unknown server'}`,
        value: id,
        short: server?.name || id,
      };
    });

    const { serverId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'serverId',
        message: 'Select MCP server to configure:',
        choices: availableServers,
        pageSize: 15,
      },
    ]);

    return serverId as MCPServerID;
  }

  private async configureServer(server: any): Promise<Record<string, string>> {
    const fields = this.buildConfigFields(server);
    const values: Record<string, string> = {};

    console.log(chalk.cyan('\n▸ Configuration'));
    console.log(chalk.gray('─'.repeat(30)));

    for (const field of fields) {
      const value = await this.configureField(field);
      values[field.name] = value;
    }

    return values;
  }

  private buildConfigFields(server: any): ConfigField[] {
    const fields: ConfigField[] = [];

    if (server.envVars) {
      Object.entries(server.envVars).forEach(([key, config]: [string, any]) => {
        let options: string[] | undefined;

        if (key === 'EMBEDDING_MODEL') {
          options = ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'];
        } else if (key === 'GEMINI_MODEL') {
          options = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        }

        fields.push({
          name: key,
          description: config.description,
          required: config.required,
          secret: config.secret || false,
          defaultValue: config.default,
          currentValue: this.existingValues[key],
          options,
        });
      });
    }

    return fields;
  }

  private async configureField(field: ConfigField): Promise<string> {
    const currentValue = field.currentValue || field.defaultValue || '';
    const isRequired = field.required && !currentValue;

    if (field.options) {
      // Use select input for options
      const { value } = await inquirer.prompt([
        {
          type: 'list',
          name: 'value',
          message: `${field.name}${field.required ? chalk.red('*') : ''}:`,
          choices: field.options,
          default: currentValue || field.options[0],
          when: () => true,
        },
      ]);

      console.log(chalk.gray(`   ${field.description}`));
      return value;
    } else if (field.secret) {
      // Use password input for secrets
      const { value } = await inquirer.prompt([
        {
          type: 'password',
          name: 'value',
          message: `${field.name}${field.required ? chalk.red('*') : ''}:`,
          default: currentValue,
          when: () => true,
          validate: (input) => {
            if (field.required && !input.trim()) {
              return `${field.name} is required`;
            }
            return true;
          },
        },
      ]);

      console.log(chalk.gray(`   ${field.description}`));
      return value;
    } else {
      // Use regular input for regular fields
      const { value } = await inquirer.prompt([
        {
          type: 'input',
          name: 'value',
          message: `${field.name}${field.required ? chalk.red('*') : ''}:`,
          default: currentValue,
          when: () => true,
          validate: (input) => {
            if (field.required && !input.trim()) {
              return `${field.name} is required`;
            }
            return true;
          },
        },
      ]);

      console.log(chalk.gray(`   ${field.description}`));
      return value;
    }
  }
}

export async function configureMCP(
  serverId: MCPServerID | undefined,
  existingValues: Record<string, string>,
  targetId: string,
  cwd: string
): Promise<{ values: Record<string, string>; serverId?: MCPServerID }> {
  const configurator = new MCPConfigurator({
    serverId,
    existingValues,
    targetId,
    cwd,
  });

  const result = await configurator.configure();

  // Save configuration
  if (result.serverId) {
    const target = targetManager.getTarget(targetId);
    if (!target) {
      throw new Error(`Target not found: ${targetId}`);
    }

    const config = await target.readConfig(cwd);
    const mcpConfigPath = target.config.mcpConfigPath;
    const mcpSection = getNestedProperty(config, mcpConfigPath) || {};

    const server = MCP_SERVER_REGISTRY[result.serverId];
    const serverConfig_env = server.config.type === 'local' ? server.config.environment : {};

    const updatedEnv = { ...serverConfig_env };
    for (const [key, value] of Object.entries(result.values)) {
      if (value && value.trim() !== '') {
        updatedEnv[key] = value;
      }
    }

    mcpSection[server.name] = {
      ...server.config,
      environment: updatedEnv,
    };

    setNestedProperty(config, mcpConfigPath, mcpSection);
    await target.writeConfig(cwd, config);
  }

  return result;
}

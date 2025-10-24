import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import {
  getAllServerIDs,
  getServersRequiringAPIKeys,
  MCP_SERVER_REGISTRY,
  type MCPServerID,
} from '../config/servers.js';
import { targetManager } from '../core/target-manager.js';
import type { CommandConfig, CommandHandler, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import {
  addMCPServersToTarget,
  listMCPServersForTarget,
  targetSupportsMCPServers,
  getNestedProperty,
  setNestedProperty,
} from '../utils/target-config.js';

// MCP start handler (unchanged - doesn't need UI)
const mcpStartHandler: CommandHandler = async (options: CommandOptions) => {
  const config = {
    disableMemory: options.disableMemory === true,
    disableTime: options.disableTime === true,
    disableProjectStartup: options.disableProjectStartup === true,
    disableKnowledge: options.disableKnowledge === true,
    disableCodebaseSearch: options.disableCodebaseSearch === true,
  };

  if (options.preset) {
    switch (options.preset) {
      case 'opencode':
        Object.assign(config, {
          disableMemory: true,
          disableTime: false,
          disableProjectStartup: true,
          disableKnowledge: false,
          disableCodebaseSearch: false,
        });
        break;
      case 'claude-code':
        Object.assign(config, {
          disableMemory: true,
          disableTime: false,
          disableProjectStartup: false,
          disableKnowledge: false,
          disableCodebaseSearch: false,
        });
        break;
      case 'minimal':
        Object.assign(config, {
          disableMemory: true,
          disableTime: true,
          disableProjectStartup: true,
          disableKnowledge: true,
          disableCodebaseSearch: true,
        });
        break;
      default:
        throw new CLIError(
          `Unknown preset: ${options.preset}. Available: opencode, claude-code, minimal`,
          'INVALID_PRESET'
        );
    }
  }

  const { startSylphxFlowMCPServer } = await import('../servers/sylphx-flow-mcp-server.js');
  await startSylphxFlowMCPServer(config);
  process.stdin.resume();
};

// MCP install handler
const mcpInstallHandler: CommandHandler = async (options: {
  servers?: string[];
  all?: boolean;
  dryRun?: boolean;
  target?: string;
}) => {
  const targetId = await targetManager.resolveTarget({ target: options.target });

  if (!targetSupportsMCPServers(targetId)) {
    throw new CLIError(`Target ${targetId} does not support MCP servers`, 'UNSUPPORTED_TARGET');
  }

  console.log('');
  console.log(chalk.cyan.bold('▸ Install MCP Tools'));
  console.log(chalk.gray(`  Target: ${targetId}`));

  const servers = options.servers || [];

  if (options.all) {
    const allServers = getAllServerIDs();

    if (options.dryRun) {
      console.log(chalk.yellow('\n  Dry run - would install:'));
      allServers.forEach((s) => console.log(chalk.gray(`    • ${s}`)));
      return;
    }

    const serversNeedingKeys = getServersRequiringAPIKeys();
    const serversWithKeys: string[] = [];
    const serversWithoutKeys: string[] = [];

    if (serversNeedingKeys.length > 0) {
      console.log(chalk.cyan('\n▸ Configure Servers'));

      for (const serverType of serversNeedingKeys) {
        const server = MCP_SERVER_REGISTRY[serverType];
        console.log(chalk.cyan(`\n  ${server.name}`));

        if (!server.envVars) {
          serversWithKeys.push(serverType);
          continue;
        }

        const values: Record<string, string> = {};

        for (const [key, config] of Object.entries(server.envVars)) {
          const answer = await inquirer.prompt([
            {
              type: config.secret ? 'password' : 'input',
              name: 'value',
              message: `${key}${config.required ? ' *' : ''}`,
              default: config.default,
              mask: config.secret ? '•' : undefined,
            },
          ]);

          if (answer.value) {
            values[key] = answer.value;
          }
        }

        const hasAllRequired = Object.entries(server.envVars)
          .filter(([, cfg]) => cfg.required)
          .every(([key]) => values[key]);

        if (hasAllRequired) {
          serversWithKeys.push(serverType);
        } else {
          serversWithoutKeys.push(serverType);
        }
      }
    }

    const serversNotNeedingKeys = allServers.filter((s) => !serversNeedingKeys.includes(s));
    const serversToInstall = [...serversNotNeedingKeys, ...serversWithKeys];

    if (serversToInstall.length > 0) {
      const spinner = ora('Installing MCP tools...').start();
      await addMCPServersToTarget(process.cwd(), targetId, serversToInstall as any);
      spinner.succeed(chalk.green(`Installed: ${serversToInstall.join(', ')}`));
    }

    if (serversWithoutKeys.length > 0) {
      console.log(chalk.yellow(`\n⚠ Skipped: ${serversWithoutKeys.join(', ')}`));
      console.log(chalk.gray('  Configure later with: sylphx-flow mcp config <server>'));
    }

    console.log('');
    return;
  }

  if (servers.length === 0) {
    throw new CLIError('Please specify MCP tools to install or use --all', 'NO_SERVERS_SPECIFIED');
  }

  // Validate servers
  const validServers: string[] = [];
  for (const server of servers) {
    if (getAllServerIDs().includes(server as any)) {
      validServers.push(server);
    } else {
      console.log(chalk.yellow(`⚠ Unknown server: ${server}`));
    }
  }

  if (validServers.length === 0) {
    throw new CLIError(
      `Invalid MCP tools. Available: ${getAllServerIDs().join(', ')}`,
      'INVALID_MCP_SERVERS'
    );
  }

  if (options.dryRun) {
    console.log(chalk.yellow('\n  Dry run - would install:'));
    validServers.forEach((s) => console.log(chalk.gray(`    • ${s}`)));
    console.log('');
    return;
  }

  const spinner = ora('Installing MCP tools...').start();
  await addMCPServersToTarget(process.cwd(), targetId, validServers as any);
  spinner.succeed(chalk.green(`Installed: ${validServers.join(', ')}`));
  console.log('');
};

// MCP list handler
const mcpListHandler: CommandHandler = async (options) => {
  const targetId = await targetManager.resolveTarget({ target: options?.target });

  console.log('');
  console.log(chalk.cyan.bold('▸ Configured MCP Tools'));
  console.log(chalk.gray(`  Target: ${targetId}`));
  console.log('');

  await listMCPServersForTarget(process.cwd(), targetId);
  console.log('');
};

// MCP config handler
const mcpConfigHandler: CommandHandler = async (options) => {
  const server = options.server as string;
  const targetId = await targetManager.resolveTarget({ target: options.target });

  if (!targetSupportsMCPServers(targetId)) {
    throw new CLIError(`Target ${targetId} does not support MCP servers`, 'UNSUPPORTED_TARGET');
  }

  console.log('');
  console.log(chalk.cyan.bold('▸ Configure MCP Server'));
  console.log(chalk.gray(`  Target: ${targetId}`));

  // If no server specified, show selection
  let selectedServerId: MCPServerID;

  if (!server) {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'server',
        message: 'Select server to configure:',
        choices: getAllServerIDs().map((id) => {
          const srv = MCP_SERVER_REGISTRY[id];
          return {
            name: `${srv.name} - ${srv.description}`,
            value: id,
          };
        }),
      },
    ]);
    selectedServerId = answer.server;
  } else {
    if (!getAllServerIDs().includes(server as any)) {
      throw new CLIError(
        `Invalid MCP server: ${server}. Available: ${getAllServerIDs().join(', ')}`,
        'INVALID_MCP_SERVER'
      );
    }
    selectedServerId = server as MCPServerID;
  }

  const serverDef = MCP_SERVER_REGISTRY[selectedServerId];

  console.log(chalk.cyan(`\n▸ ${serverDef.name}`));
  console.log(chalk.gray(`  ${serverDef.description}`));

  if (!serverDef.envVars) {
    console.log(chalk.gray('\n  No configuration needed'));
    console.log('');
    return;
  }

  // Get current values
  const target = targetManager.getTarget(targetId);
  if (!target) {
    throw new Error(`Target not found: ${targetId}`);
  }

  const config = await target.readConfig(process.cwd());
  const mcpConfigPath = target.config.mcpConfigPath;
  const mcpSection = getNestedProperty(config, mcpConfigPath) || {};
  const existingConfig = mcpSection[serverDef.name];
  const existingEnv = existingConfig?.environment || {};

  // Prompt for values
  const values: Record<string, string> = {};

  for (const [key, envConfig] of Object.entries(serverDef.envVars)) {
    const currentValue = existingEnv[key] || process.env[key];

    // Model selection
    if (key === 'EMBEDDING_MODEL') {
      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'value',
          message: `${key}${envConfig.required ? ' *' : ''}`,
          choices: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
          default: currentValue || envConfig.default || 'text-embedding-3-small',
        },
      ]);
      values[key] = answer.value;
    } else if (key === 'GEMINI_MODEL') {
      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'value',
          message: `${key}${envConfig.required ? ' *' : ''}`,
          choices: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
          default: currentValue || envConfig.default || 'gemini-2.5-flash',
        },
      ]);
      values[key] = answer.value;
    } else {
      // Regular input
      const answer = await inquirer.prompt([
        {
          type: envConfig.secret ? 'password' : 'input',
          name: 'value',
          message: `${key}${envConfig.required ? ' *' : ''}${currentValue ? ' (press Enter to keep current)' : ''}`,
          default: !envConfig.secret && currentValue ? currentValue : envConfig.default,
          mask: envConfig.secret ? '•' : undefined,
        },
      ]);

      if (answer.value) {
        values[key] = answer.value;
      } else if (currentValue) {
        values[key] = currentValue;
      }
    }
  }

  // Save configuration
  const spinner = ora('Saving configuration...').start();

  const serverConfig_env = serverDef.config.type === 'local' ? serverDef.config.environment : {};
  const updatedEnv = { ...serverConfig_env };

  for (const [key, value] of Object.entries(values)) {
    if (value && value.trim() !== '') {
      updatedEnv[key] = value;
    }
  }

  mcpSection[serverDef.name] = {
    ...serverDef.config,
    environment: updatedEnv,
  };

  setNestedProperty(config, mcpConfigPath, mcpSection);
  await target.writeConfig(process.cwd(), config);

  spinner.succeed(chalk.green('Configuration saved'));
  console.log('');
};

export const mcpCommand: CommandConfig = {
  name: 'mcp',
  description: 'Manage MCP (Model Context Protocol) tools and servers',
  options: [
    {
      flags: '--target <type>',
      description: `Target platform (${targetManager.getImplementedTargets().join(', ')}, default: auto-detect)`,
    },
  ],
  subcommands: [
    {
      name: 'start',
      description: 'Start the Sylphx Flow MCP server',
      options: [
        {
          flags: '--preset <type>',
          description: 'Use preset configuration (opencode, claude-code, minimal)',
        },
        { flags: '--disable-memory', description: 'Disable memory tools' },
        { flags: '--disable-time', description: 'Disable time tools' },
        { flags: '--disable-project-startup', description: 'Disable project startup tools' },
        { flags: '--disable-knowledge', description: 'Disable knowledge tools' },
        { flags: '--disable-codebase-search', description: 'Disable codebase search tools' },
      ],
      handler: mcpStartHandler,
    },
    {
      name: 'install',
      description: 'Install MCP tools for the target platform',
      arguments: [
        {
          name: 'servers',
          description: `MCP tools to install (${getAllServerIDs().join(', ')})`,
          required: false,
        },
      ],
      options: [
        { flags: '--all', description: 'Install all available MCP tools' },
        { flags: '--dry-run', description: 'Show what would be done without making changes' },
      ],
      handler: mcpInstallHandler,
    },
    {
      name: 'list',
      description: 'List configured MCP tools for the target platform',
      options: [],
      handler: mcpListHandler,
    },
    {
      name: 'config',
      description: 'Configure API keys for MCP tools',
      arguments: [
        {
          name: 'server',
          description: `MCP server to configure (${getServersRequiringAPIKeys().join(', ')}) - optional`,
          required: false,
        },
      ],
      options: [],
      handler: mcpConfigHandler,
    },
  ],
};

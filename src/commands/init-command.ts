import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import {
  getDefaultServers,
  getServersRequiringAPIKeys,
  getServersWithOptionalAPIKeys,
  MCP_SERVER_REGISTRY,
  type MCPServerID,
} from '../config/servers.js';
import { installAgents, installRules } from '../core/init.js';
import { targetManager } from '../core/target-manager.js';
import type { CommandConfig, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { secretUtils } from '../utils/secret-utils.js';
import {
  targetSupportsMCPServers,
  validateTarget,
  getNestedProperty,
  setNestedProperty,
} from '../utils/target-config.js';

async function validateInitOptions(options: CommandOptions): Promise<void> {
  const targetId = await targetManager.resolveTarget({ target: options.target });
  options.target = targetId;

  try {
    validateTarget(targetId);
  } catch (error) {
    if (error instanceof Error) {
      throw new CLIError(error.message, 'UNSUPPORTED_TARGET');
    }
    throw error;
  }

  if (options.merge) {
    throw new CLIError('The --merge option is not supported with init command.', 'INVALID_OPTION');
  }
}

async function configureMCPServer(
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
    let value: string;

    if (config.fetchChoices) {
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

export const initCommand: CommandConfig = {
  name: 'init',
  description: 'Initialize project with Sylphx Flow development agents and MCP tools',
  options: [
    {
      flags: '--target <type>',
      description: `Force specific target (${targetManager.getImplementedTargetIDs().join(', ')}, default: opencode)`,
    },
    { flags: '--verbose', description: 'Show detailed output' },
    { flags: '--dry-run', description: 'Show what would be done without making changes' },
    { flags: '--clear', description: 'Clear obsolete items before processing' },
    { flags: '--no-mcp', description: 'Skip MCP tools installation' },
  ],
  handler: async (options: CommandOptions) => {
    let targetId = options.target;

    console.log('');
    console.log(chalk.cyan.bold('▸ Sylphx Flow Setup'));

    // Target selection
    if (!targetId) {
      const availableTargets = targetManager.getImplementedTargetIDs();

      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'target',
          message: 'Select target platform:',
          choices: availableTargets.map((id) => {
            const target = targetManager.getTarget(id);
            return {
              name: target?.name || id,
              value: id,
            };
          }),
          default: 'opencode',
        },
      ]);

      targetId = answer.target;
      options.target = targetId;
    }

    await validateInitOptions(options);

    if (!targetId) {
      throw new Error('Target ID not set');
    }

    // Dry run
    if (options.dryRun) {
      console.log(chalk.yellow('\n  Dry run mode - no changes will be made'));

      if (options.mcp !== false && targetSupportsMCPServers(targetId)) {
        const defaultServers = getDefaultServers();
        console.log(chalk.cyan('\n▸ MCP Tools'));
        defaultServers.forEach((s) => console.log(chalk.gray(`  • ${s}`)));
      }

      console.log(chalk.cyan('\n▸ Agents'));
      console.log(chalk.gray('  • Development agents'));

      console.log(chalk.cyan('\n▸ Rules'));
      console.log(chalk.gray('  • Custom rules'));

      console.log(chalk.green('\n✓ Dry run complete\n'));
      return;
    }

    // Get target and check existing config
    const target = targetManager.getTarget(targetId);
    if (!target) {
      throw new Error(`Target not found: ${targetId}`);
    }

    let configData: any;
    try {
      configData = await target.readConfig(process.cwd());
    } catch (error) {
      configData = {};
    }

    const mcpConfigPath = target.config.mcpConfigPath;
    const existingMcpSection = getNestedProperty(configData, mcpConfigPath) || {};

    // Find existing server IDs
    const existingServerNames = Object.keys(existingMcpSection);
    const existingServerIds = Object.values(MCP_SERVER_REGISTRY)
      .filter((server) => existingServerNames.includes(server.name))
      .map((server) => server.id);

    // Process MCP servers
    const serverConfigs: Array<{ id: MCPServerID; values: Record<string, string> }> = [];

    if (options.mcp !== false && targetSupportsMCPServers(targetId)) {
      const allServerIds = Object.keys(MCP_SERVER_REGISTRY) as MCPServerID[];
      const availableServers = allServerIds.filter((id) => !existingServerIds.includes(id));

      console.log('');
      console.log(chalk.cyan.bold('▸ MCP Tools'));

      let newServers: MCPServerID[];

      if (availableServers.length === 0) {
        console.log('');
        console.log(chalk.green('✓ All tools already installed'));
        newServers = [];
      } else {
        const selectableServers = availableServers.filter(
          (id) => !MCP_SERVER_REGISTRY[id].required
        );
        const requiredServers = availableServers.filter((id) => MCP_SERVER_REGISTRY[id].required);

        if (selectableServers.length === 0) {
          console.log('');
          console.log(chalk.gray('Installing required tools...'));
          newServers = requiredServers;
        } else {
          const { selectedServers } = await inquirer.prompt({
            type: 'checkbox',
            name: 'selectedServers',
            message: 'Select tools to install',
            choices: selectableServers.map((id) => {
              const server = MCP_SERVER_REGISTRY[id];
              return {
                name: `${server.name} - ${server.description}`,
                value: id,
                checked: server.defaultInInit === true,
              };
            }),
          });

          newServers = [...requiredServers, ...selectedServers] as MCPServerID[];
        }
      }

      if (newServers.length > 0) {
        console.log('');
        console.log(chalk.gray(`Installing: ${newServers.join(', ')}`));

        const serversNeedingKeys = getServersRequiringAPIKeys();
        const serversWithOptionalKeys = getServersWithOptionalAPIKeys();
        const allNeedingConfig = [...serversNeedingKeys, ...serversWithOptionalKeys];
        const newServersNeedingConfig = allNeedingConfig.filter((s) => newServers.includes(s));

        if (newServersNeedingConfig.length > 0) {
          const collectedEnv: Record<string, string> = {};
          for (const serverId of newServersNeedingConfig) {
            const values = await configureMCPServer(serverId, collectedEnv);
            serverConfigs.push({ id: serverId, values });
          }
        }

        const spinner = ora('Saving configuration...').start();

        const mcpSection = { ...existingMcpSection };

        // Add new configured servers
        for (const { id: serverId, values } of serverConfigs) {
          const server = MCP_SERVER_REGISTRY[serverId];
          const serverConfig_env = server.config.type === 'local' ? server.config.environment : {};

          const updatedEnv = { ...serverConfig_env };
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

        // Add new servers that don't need config
        const newServersNotNeedingConfig = newServers.filter((s) => !allNeedingConfig.includes(s));
        for (const serverId of newServersNotNeedingConfig) {
          const server = MCP_SERVER_REGISTRY[serverId];
          mcpSection[server.name] = server.config;
        }

        setNestedProperty(configData, mcpConfigPath, mcpSection);
        await target.writeConfig(process.cwd(), configData);

        spinner.succeed(
          chalk.green(`✓ ${newServers.length} tool${newServers.length > 1 ? 's' : ''} installed`)
        );
      }
    }

    if (targetId === 'opencode') {
      await secretUtils.ensureSecretsDir(process.cwd());
      await secretUtils.addToGitignore(process.cwd());
    }

    console.log('');
    const agentSpinner = ora('Installing agents...').start();
    await installAgents(options);
    agentSpinner.succeed(chalk.green('✓ Agents installed'));

    console.log('');
    const rulesSpinner = ora('Installing rules...').start();
    await installRules(options);
    rulesSpinner.succeed(chalk.green('✓ Rules installed'));

    console.log('');
    console.log(chalk.green.bold('✓ Setup complete!'));
    console.log('');
    console.log(chalk.green.bold('✓ Setup complete!'));
    console.log(chalk.gray('  Start coding with Sylphx Flow'));
    console.log('');
  },
};

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

async function configureMCPServer(serverId: MCPServerID): Promise<Record<string, string>> {
  const server = MCP_SERVER_REGISTRY[serverId];
  const values: Record<string, string> = {};

  if (!server.envVars) return values;

  console.log(chalk.cyan(`\n▸ ${server.name}`));
  console.log(chalk.gray(`  ${server.description}\n`));

  for (const [key, config] of Object.entries(server.envVars)) {
    let value: string;

    if (key === 'EMBEDDING_MODEL') {
      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'model',
          message: `${key}${config.required ? ' *' : ''}`,
          choices: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
          default: config.default || 'text-embedding-3-small',
        },
      ]);
      value = answer.model;
    } else if (key === 'GEMINI_MODEL') {
      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'model',
          message: `${key}${config.required ? ' *' : ''}`,
          choices: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
          default: config.default || 'gemini-2.5-flash',
        },
      ]);
      value = answer.model;
    } else {
      const answer = await inquirer.prompt([
        {
          type: config.secret ? 'password' : 'input',
          name: 'value',
          message: `${key}${config.required ? ' *' : ''}`,
          default: config.default,
          mask: config.secret ? '•' : undefined,
        },
      ]);
      value = answer.value;
    }

    if (value) {
      values[key] = value;
    }
  }

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

    const configData = await target.readConfig(process.cwd());
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
      const defaultServers = getDefaultServers();
      const newServers = defaultServers.filter((s) => !existingServerIds.includes(s));

      if (newServers.length === 0) {
        console.log(chalk.cyan('\n▸ MCP Tools'));
        console.log(chalk.green('  ✓ All servers installed'));
        console.log(chalk.gray(`  Servers: ${existingServerIds.join(', ')}\n`));
      } else {
        console.log(chalk.cyan.bold('\n▸ MCP Tools'));

        if (existingServerIds.length > 0) {
          console.log(chalk.gray(`  Existing: ${existingServerIds.join(', ')}`));
          console.log(chalk.cyan(`  New: ${newServers.join(', ')}\n`));
        } else {
          console.log(chalk.gray(`  Installing: ${defaultServers.join(', ')}\n`));
        }

        // Configure only NEW servers
        const serversNeedingKeys = getServersRequiringAPIKeys();
        const serversWithOptionalKeys = getServersWithOptionalAPIKeys();
        const allNeedingConfig = [...serversNeedingKeys, ...serversWithOptionalKeys];
        const newServersNeedingConfig = allNeedingConfig.filter((s) => newServers.includes(s));

        if (newServersNeedingConfig.length > 0) {
          console.log(chalk.cyan.bold('▸ Configure New Servers'));

          for (const serverId of newServersNeedingConfig) {
            const values = await configureMCPServer(serverId);
            serverConfigs.push({ id: serverId, values });
          }
        }

        // Save configurations
        const spinner = ora('Saving MCP configuration...').start();

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

        spinner.succeed(chalk.green('MCP tools configured'));
      }
    }

    // Setup secrets directory
    if (targetId === 'opencode') {
      await secretUtils.ensureSecretsDir(process.cwd());
      await secretUtils.addToGitignore(process.cwd());
    }

    // Install agents
    const agentSpinner = ora('Installing agents...').start();
    await installAgents(options);
    agentSpinner.succeed(chalk.green('Agents installed'));

    // Install rules
    const rulesSpinner = ora('Installing rules...').start();
    await installRules(options);
    rulesSpinner.succeed(chalk.green('Rules installed'));

    // Complete
    console.log('');
    console.log(chalk.green.bold('✓ Setup complete!'));
    console.log(chalk.gray('  Start coding with Sylphx Flow'));
    console.log('');
  },
};

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { MCP_SERVER_REGISTRY, type MCPServerID } from '../config/servers.js';
import { installAgents, installRules } from '../core/init.js';
import { targetManager } from '../core/target-manager.js';
import type { CommandConfig, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { secretUtils } from '../utils/secret-utils.js';
import { targetSupportsMCPServers, validateTarget } from '../utils/target-config.js';
import { MCPService } from '../services/mcp-service.js';

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
        const mcpService = new MCPService(targetId);
        const availableServers = mcpService.getAvailableServers();
        console.log(chalk.cyan('\n▸ MCP Tools'));
        availableServers.forEach((s) =>
          console.log(chalk.gray(`  • ${MCP_SERVER_REGISTRY[s].name}`))
        );
      }

      console.log(chalk.cyan('\n▸ Agents'));
      console.log(chalk.gray('  • Development agents'));

      console.log(chalk.cyan('\n▸ Rules'));
      console.log(chalk.gray('  • Custom rules'));

      console.log(chalk.green('\n✓ Dry run complete\n'));
      return;
    }

    // Process MCP servers
    if (options.mcp !== false && targetSupportsMCPServers(targetId)) {
      const mcpService = new MCPService(targetId);
      const availableServers = mcpService.getAvailableServers();

      console.log('');
      console.log(chalk.cyan.bold('▸ MCP Tools'));

      let newServers: MCPServerID[];

      if (availableServers.length === 0) {
        console.log('');
        console.log(chalk.green('✓ All tools already installed'));
        newServers = [];
      } else {
        // Show required servers info first
        const requiredServers = availableServers.filter((id) => MCP_SERVER_REGISTRY[id].required);
        const optionalServers = availableServers.filter((id) => !MCP_SERVER_REGISTRY[id].required);

        if (requiredServers.length > 0) {
          console.log('');
          console.log(chalk.gray('Required tools (will be installed automatically):'));
          requiredServers.forEach((id) => {
            const server = MCP_SERVER_REGISTRY[id];
            console.log(chalk.gray(`  ✓ ${server.name} - ${server.description}`));
          });
        }

        if (optionalServers.length > 0) {
          console.log('');
          const { selectedServers } = await inquirer.prompt({
            type: 'checkbox',
            name: 'selectedServers',
            message: 'Select optional tools to install',
            choices: optionalServers.map((id) => {
              const server = MCP_SERVER_REGISTRY[id];
              return {
                name: `${server.name} - ${server.description}`,
                value: id,
                checked: server.defaultInInit === true,
              };
            }),
          });

          newServers = [...requiredServers, ...selectedServers] as MCPServerID[];
        } else {
          newServers = requiredServers;
        }
      }

      if (newServers.length > 0) {
        await mcpService.installServers(newServers);
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

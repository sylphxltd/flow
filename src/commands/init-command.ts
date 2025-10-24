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
        for (const s of availableServers) {
          console.log(chalk.gray(`  • ${MCP_SERVER_REGISTRY[s].name}`));
        }
      }

      console.log(chalk.cyan('\n▸ Agents'));
      console.log(chalk.gray('  • Development agents'));

      console.log(chalk.cyan('\n▸ Rules'));
      console.log(chalk.gray('  • Custom rules'));

      console.log(chalk.green('\n✓ Dry run complete\n'));
      return;
    }

    // Process MCP servers with simple inquirer UI
    if (options.mcp !== false && targetSupportsMCPServers(targetId)) {
      const mcpService = new MCPService(targetId);
      const availableServers = mcpService.getAvailableServers();

      if (availableServers.length === 0) {
        console.log('');
        console.log(chalk.cyan.bold('▸ MCP Tools'));
        console.log('');
        console.log(chalk.green('✓ All tools already installed'));
      } else {
        console.log('');
        console.log(chalk.cyan.bold('▸ Configure MCP Tools'));
        console.log('');

        // Show server selection
        const serverSelectionAnswer = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'selectedServers',
            message: 'Select MCP tools to install:',
            choices: availableServers.map((id) => {
              const server = MCP_SERVER_REGISTRY[id];
              return {
                name: `${server.name} - ${server.description}`,
                value: id,
                checked: server.required || server.defaultInInit || false,
                disabled: server.required ? '(required)' : false,
              };
            }),
          },
        ]);

        const selectedServers = serverSelectionAnswer.selectedServers as MCPServerID[];

        if (selectedServers.length > 0) {
          // Configure each selected server that needs configuration
          const serversNeedingConfig = selectedServers.filter((id) => {
            const server = MCP_SERVER_REGISTRY[id];
            return server.envVars && Object.keys(server.envVars).length > 0;
          });

          if (serversNeedingConfig.length > 0) {
            console.log(chalk.cyan('\n▸ Configure selected MCP tools'));
            
            for (const serverId of serversNeedingConfig) {
              const serverDef = MCP_SERVER_REGISTRY[serverId];
              console.log(chalk.cyan(`\n▸ ${serverDef.name}`));
              console.log(chalk.gray(`  ${serverDef.description}`));
              
              // Use MCPService to configure the server
              await mcpService.configureServer(serverId);
            }
          }

          // Install all selected servers
          const spinner = ora('Installing MCP servers...').start();
          try {
            await mcpService.installServers(selectedServers);
            spinner.succeed(chalk.green(`✓ ${selectedServers.length} MCP server(s) installed`));
          } catch (error) {
            spinner.fail(chalk.red('Failed to install MCP servers'));
            throw error;
          }
        }
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
    console.log(chalk.gray('  Start coding with Sylphx Flow'));
    console.log('');
  },
};

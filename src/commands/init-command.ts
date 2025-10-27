import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { type MCPServerID, MCP_SERVER_REGISTRY } from '../config/servers.js';
import { installAgents, installRules } from '../core/init.js';
import { targetManager } from '../core/target-manager.js';
import { MCPService } from '../services/mcp-service.js';
import type { CommandConfig, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { projectSettings } from '../utils/settings.js';
import { secretUtils } from '../utils/secret-utils.js';
import { targetSupportsMCPServers, validateTarget } from '../utils/target-config.js';

function validateInitOptions(options: CommandOptions): Promise<void> {
  // Don't resolve target again - it's already been determined either from:
  // 1. Command line option (--target)
  // 2. User selection (promptForTargetSelection)
  const targetId = options.target;

  if (!targetId) {
    throw new Error('Target ID is required');
  }

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
      targetId = await targetManager.promptForTargetSelection();
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
        const availableServers = await mcpService.getAvailableServers();
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
      const allServers = mcpService.getAllServerIds();
      const installedServers = await mcpService.getInstalledServerIds();

      console.log('');
      console.log(chalk.cyan.bold('▸ Configure MCP Tools'));
      console.log('');

      // Show server selection (show all servers, mark installed ones as checked)
      const serverSelectionAnswer = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedServers',
          message: 'Select MCP tools to install:',
          choices: allServers.map((id) => {
            const server = MCP_SERVER_REGISTRY[id];
            const isInstalled = installedServers.includes(id);
            return {
              name: `${server.name} - ${server.description}`,
              value: id,
              checked: server.required || isInstalled || server.defaultInInit || false,
              disabled: server.required ? '(required)' : false,
            };
          }),
        },
      ]);

      let selectedServers = serverSelectionAnswer.selectedServers as MCPServerID[];

      // Ensure all required servers are included
      const requiredServers = allServers.filter((id) => MCP_SERVER_REGISTRY[id].required);
      selectedServers = [...new Set([...requiredServers, ...selectedServers])];

      if (selectedServers.length > 0) {
        // Configure each selected server that needs configuration
        const serversNeedingConfig = selectedServers.filter((id) => {
          const server = MCP_SERVER_REGISTRY[id];
          return server.envVars && Object.keys(server.envVars).length > 0;
        });

        const serverConfigsMap: Record<MCPServerID, Record<string, string>> = {};

        if (serversNeedingConfig.length > 0) {
          console.log('');
          console.log(chalk.cyan.bold('▸ Configure selected MCP tools'));

          const collectedEnv: Record<string, string> = {};
          for (const serverId of serversNeedingConfig) {
            // configureServer will print the server name and description
            const configValues = await mcpService.configureServer(serverId, collectedEnv);
            serverConfigsMap[serverId] = configValues;
          }
        }

        // Install all selected servers
        const spinner = ora('Installing MCP servers...').start();
        try {
          await mcpService.installServers(selectedServers, serverConfigsMap);
          spinner.succeed('MCP servers installed');
        } catch (error) {
          spinner.fail(chalk.red('Failed to install MCP servers'));
          throw error;
        }
      }
    }

    if (targetId === 'opencode') {
      await secretUtils.ensureSecretsDir(process.cwd());
      await secretUtils.addToGitignore(process.cwd());
    }

    console.log('');
    const agentSpinner = ora('Installing agents...').start();
    await installAgents({ ...options, quiet: true });
    agentSpinner.succeed('Agents installed');

    console.log('');
    const rulesSpinner = ora('Installing rules...').start();
    await installRules({ ...options, quiet: true });
    rulesSpinner.succeed('Rules installed');

    console.log('');
    console.log(chalk.green.bold('✓ Setup complete!'));
    console.log(chalk.gray('  Start coding with Sylphx Flow'));
    console.log('');

    // Save the selected target as project default
    try {
      await projectSettings.setDefaultTarget(targetId);
      console.log(
        chalk.gray(
          `  Default target set to: ${targetManager.getTarget(targetId)?.name || targetId}`
        )
      );
    } catch (error) {
      // Don't fail the entire setup if we can't save settings
      console.warn(
        chalk.yellow(
          `  Warning: Could not save default target: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
    console.log('');
  },
};

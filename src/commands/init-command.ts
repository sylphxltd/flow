import boxen from 'boxen';
import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { type MCPServerID, MCP_SERVER_REGISTRY } from '../config/servers.js';
import { installAgents, installRules } from '../core/init.js';
import { targetManager } from '../core/target-manager.js';
import { MCPService } from '../services/mcp-service.js';
import type { CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { secretUtils } from '../utils/secret-utils.js';
import { projectSettings } from '../utils/settings.js';
import { targetSupportsMCPServers, validateTarget } from '../utils/target-config.js';

// Create the init command
export const initCommand = new Command('init')
  .description('Initialize project with Sylphx Flow development agents and MCP tools')
  .option(
    '--target <type>',
    `Force specific target (${targetManager.getImplementedTargetIDs().join(', ')}, default: auto-detect)`
  )
  .option('--verbose', 'Show detailed output')
  .option('--dry-run', 'Show what would be done without making changes')
  .option('--clear', 'Clear obsolete items before processing')
  .option('--no-mcp', 'Skip MCP tools installation')
  .action(async (options) => {
    let targetId = options.target;

    console.log(
      '\n' +
        boxen(chalk.bold.cyan('⚡ Sylphx Flow Setup'), {
          padding: { top: 0, bottom: 0, left: 2, right: 2 },
          margin: 0,
          borderStyle: 'round',
          borderColor: 'cyan',
        }) +
        '\n',
    );

    // Target selection
    if (!targetId) {
      targetId = await targetManager.promptForTargetSelection();
      options.target = targetId;
    }

    // Validate target
    if (targetId) {
      try {
        validateTarget(targetId);
      } catch (error) {
        if (error instanceof Error) {
          throw new CLIError(error.message, 'UNSUPPORTED_TARGET');
        }
        throw error;
      }

      if (options.merge) {
        throw new CLIError(
          'The --merge option is not supported with init command.',
          'INVALID_OPTION'
        );
      }
    }

    if (!targetId) {
      throw new Error('Target ID not set');
    }

    // Dry run
    if (options.dryRun) {
      console.log(
        boxen(
          chalk.yellow('⚠ Dry Run Mode') +
            chalk.dim('\nNo changes will be made to your project'),
          {
            padding: 1,
            margin: { top: 0, bottom: 1, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: 'yellow',
          },
        ),
      );

      if (options.mcp !== false && targetSupportsMCPServers(targetId)) {
        const mcpService = new MCPService(targetId);
        const availableServers = await mcpService.getAvailableServers();
        console.log(chalk.cyan.bold('MCP Tools:'));
        for (const s of availableServers) {
          console.log(chalk.dim(`  ✓ ${MCP_SERVER_REGISTRY[s].name}`));
        }
      }

      console.log(chalk.cyan.bold('\nAgents:'));
      console.log(chalk.dim('  ✓ Development agents'));

      console.log(chalk.cyan.bold('\nRules:'));
      console.log(chalk.dim('  ✓ Custom rules'));

      console.log(
        '\n' +
          boxen(chalk.green.bold('✓ Dry run complete'), {
            padding: { top: 0, bottom: 0, left: 2, right: 2 },
            margin: 0,
            borderStyle: 'round',
            borderColor: 'green',
          }) +
          '\n',
      );
      return;
    }

    // Process MCP servers with simple inquirer UI
    if (options.mcp !== false && targetSupportsMCPServers(targetId)) {
      const mcpService = new MCPService(targetId);
      const allServers = mcpService.getAllServerIds();
      const installedServers = await mcpService.getInstalledServerIds();

      console.log(chalk.cyan.bold('━━━ Configure MCP Tools ━━━\n'));

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
          console.log(chalk.cyan.bold('\n━━━ Server Configuration ━━━\n'));

          const collectedEnv: Record<string, string> = {};
          for (const serverId of serversNeedingConfig) {
            // configureServer will print the server name and description
            const configValues = await mcpService.configureServer(serverId, collectedEnv);
            serverConfigsMap[serverId] = configValues;
          }
        }

        // Install all selected servers
        const spinner = ora({
          text: `Installing ${selectedServers.length} MCP server${selectedServers.length > 1 ? 's' : ''}`,
          color: 'cyan',
        }).start();
        try {
          await mcpService.installServers(selectedServers, serverConfigsMap);
          spinner.succeed(
            chalk.green(
              `Installed ${chalk.cyan(selectedServers.length)} MCP server${selectedServers.length > 1 ? 's' : ''}`,
            ),
          );
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

    console.log(chalk.cyan.bold('\n━━━ Installing Core Components ━━━\n'));

    const agentSpinner = ora({ text: 'Installing agents', color: 'cyan' }).start();
    await installAgents({ ...options, quiet: true });
    agentSpinner.succeed(chalk.green('Agents installed'));

    const rulesSpinner = ora({ text: 'Installing rules', color: 'cyan' }).start();
    await installRules({ ...options, quiet: true });
    rulesSpinner.succeed(chalk.green('Rules installed'));

    // Save the selected target as project default
    const targetInfo: string[] = [];
    try {
      await projectSettings.setDefaultTarget(targetId);
      const targetName = targetManager.getTarget(targetId)?.name || targetId;
      targetInfo.push(`Target: ${targetName}`);
    } catch (error) {
      // Don't fail the entire setup if we can't save settings
      console.warn(
        chalk.yellow(
          `⚠ Warning: Could not save default target: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }

    // Setup target-specific configuration
    const target = targetManager.getTarget(targetId);
    if (target?.setup) {
      const setupResult = await target.setup(process.cwd());

      if (setupResult.success) {
        targetInfo.push('Claude Code hooks configured');
      } else {
        console.warn(chalk.yellow(`⚠ Warning: ${setupResult.message}`));
      }
    }

    // Success summary
    console.log(
      '\n' +
        boxen(
          chalk.green.bold('✓ Setup complete!') +
            '\n\n' +
            chalk.dim(targetInfo.join('\n')) +
            '\n\n' +
            chalk.cyan('Ready to code with Sylphx Flow'),
          {
            padding: 1,
            margin: 0,
            borderStyle: 'round',
            borderColor: 'green',
          },
        ) +
        '\n',
    );
  });

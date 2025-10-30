import boxen from 'boxen';
import chalk from 'chalk';
import { Command } from 'commander';
import gradient from 'gradient-string';
import ora from 'ora';
import { targetManager } from '../core/target-manager.js';
import type { CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { projectSettings } from '../utils/settings.js';
import { validateTarget } from '../utils/target-config.js';

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

    // Create ASCII art title
    const title = `
███████╗██╗   ██╗██╗     ██████╗ ██╗  ██╗██╗  ██╗    ███████╗██╗      ██████╗ ██╗    ██╗
██╔════╝╚██╗ ██╔╝██║     ██╔══██╗██║  ██║╚██╗██╔╝    ██╔════╝██║     ██╔═══██╗██║    ██║
███████╗ ╚████╔╝ ██║     ██████╔╝███████║ ╚███╔╝     █████╗  ██║     ██║   ██║██║ █╗ ██║
╚════██║  ╚██╔╝  ██║     ██╔═══╝ ██╔══██║ ██╔██╗     ██╔══╝  ██║     ██║   ██║██║███╗██║
███████║   ██║   ███████╗██║     ██║  ██║██╔╝ ██╗    ██║     ███████╗╚██████╔╝╚███╔███╔╝
╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝    ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝
`;

    console.log(gradient(['cyan', 'blue'])(title));
    console.log(chalk.dim.cyan('                          Project Initialization\n'));

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

    // Get target instance
    const target = targetManager.getTarget(targetId);
    if (!target) {
      throw new Error(`Target not found: ${targetId}`);
    }

    // Setup MCP servers if target supports it
    if (target.setupMCP) {
      await target.setupMCP(process.cwd(), options);
    }

    console.log(chalk.cyan.bold('\n━━━ Installing Core Components ━━━\n'));

    // Install agents if target supports it
    if (target.setupAgents) {
      const agentSpinner = ora({ text: 'Installing agents', color: 'cyan' }).start();
      await target.setupAgents(process.cwd(), { ...options, quiet: true });
      agentSpinner.succeed(chalk.green('Agents installed'));
    }

    // Install output styles if target supports it
    if (target.setupOutputStyles) {
      const outputStylesSpinner = ora({ text: 'Installing output styles', color: 'cyan' }).start();
      await target.setupOutputStyles(process.cwd(), { ...options, quiet: true });
      outputStylesSpinner.succeed(chalk.green('Output styles installed'));
    }

    // Install rules if target supports it
    if (target.setupRules) {
      const rulesSpinner = ora({ text: 'Installing rules', color: 'cyan' }).start();
      await target.setupRules(process.cwd(), { ...options, quiet: true });
      rulesSpinner.succeed(chalk.green('Rules installed'));
    }

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
    if (target.setup) {
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

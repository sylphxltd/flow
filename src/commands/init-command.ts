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
  .option('--no-agents', 'Skip agents installation')
  .option('--no-rules', 'Skip rules installation')
  .option('--no-output-styles', 'Skip output styles installation')
  .option('--no-hooks', 'Skip hooks setup')
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

      const target = targetManager.getTarget(targetId);
      if (!target) {
        throw new Error(`Target not found: ${targetId}`);
      }

      if (options.mcp !== false && target.setupMCP) {
        console.log(chalk.cyan.bold('MCP Tools:'));
        console.log(chalk.dim('  ✓ MCP servers will be configured'));
      }

      if (options.agents !== false && target.setupAgents) {
        console.log(chalk.cyan.bold('\nAgents:'));
        console.log(chalk.dim('  ✓ Development agents will be installed'));
      }

      if (options.outputStyles !== false && target.setupOutputStyles) {
        console.log(chalk.cyan.bold('\nOutput Styles:'));
        console.log(chalk.dim('  ✓ Output styles will be installed'));
      }

      if (options.rules !== false && target.setupRules) {
        console.log(chalk.cyan.bold('\nRules:'));
        console.log(chalk.dim('  ✓ Custom rules will be installed'));
      }

      if (options.hooks !== false && target.setupHooks) {
        console.log(chalk.cyan.bold('\nHooks:'));
        console.log(chalk.dim('  ✓ Hooks will be configured'));
      }

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

    // Setup MCP servers if target supports it and MCP is enabled
    // Note: No spinner here because MCP setup is interactive (user prompts)
    if (target.setupMCP && options.mcp !== false) {
      try {
        const result = await target.setupMCP(process.cwd(), options);
        if (result.count > 0) {
          console.log(chalk.green(`✔ Installed ${chalk.cyan(result.count)} MCP server${result.count !== 1 ? 's' : ''}`));
        } else {
          console.log(chalk.dim('ℹ No MCP servers selected'));
        }
      } catch (error) {
        console.error(chalk.red('✖ Failed to setup MCP servers'));
        throw error;
      }
    }

    console.log(chalk.cyan.bold('\n━━━ Installing Core Components ━━━\n'));

    // Install agents if target supports it and agents are not skipped
    if (target.setupAgents && options.agents !== false) {
      const agentSpinner = ora({ text: 'Installing agents', color: 'cyan' }).start();
      try {
        const result = await target.setupAgents(process.cwd(), { ...options, quiet: true });
        agentSpinner.succeed(chalk.green(`Installed ${chalk.cyan(result.count)} agent${result.count !== 1 ? 's' : ''}`));
      } catch (error) {
        agentSpinner.fail(chalk.red('Failed to install agents'));
        throw error;
      }
    }

    // Install output styles if target supports it and output styles are not skipped
    if (target.setupOutputStyles && options.outputStyles !== false) {
      const outputStylesSpinner = ora({ text: 'Installing output styles', color: 'cyan' }).start();
      try {
        const result = await target.setupOutputStyles(process.cwd(), { ...options, quiet: true });
        if (result.count > 0) {
          outputStylesSpinner.succeed(chalk.green(`Installed ${chalk.cyan(result.count)} output style${result.count !== 1 ? 's' : ''}`));
        } else {
          outputStylesSpinner.info(chalk.dim('No output styles to install'));
        }
      } catch (error) {
        outputStylesSpinner.fail(chalk.red('Failed to install output styles'));
        throw error;
      }
    }

    // Install rules if target supports it and rules are not skipped
    if (target.setupRules && options.rules !== false) {
      const rulesSpinner = ora({ text: 'Installing rules', color: 'cyan' }).start();
      try {
        const result = await target.setupRules(process.cwd(), { ...options, quiet: true });
        rulesSpinner.succeed(chalk.green(`Installed ${chalk.cyan(result.count)} rule${result.count !== 1 ? 's' : ''}`));
      } catch (error) {
        rulesSpinner.fail(chalk.red('Failed to install rules'));
        throw error;
      }
    }

    // Setup hooks if target supports it and hooks are not skipped
    if (target.setupHooks && options.hooks !== false) {
      const hooksSpinner = ora({ text: 'Setting up hooks', color: 'cyan' }).start();
      try {
        const result = await target.setupHooks(process.cwd(), { ...options, quiet: true });
        if (result.count > 0) {
          hooksSpinner.succeed(chalk.green(`Configured ${chalk.cyan(result.count)} hook${result.count !== 1 ? 's' : ''}`));
        } else {
          hooksSpinner.info(chalk.dim('No hooks to configure'));
        }
      } catch (error) {
        // Don't fail entire setup if hooks fail
        hooksSpinner.warn(chalk.yellow('Could not setup hooks'));
        console.warn(chalk.dim(`  ${error instanceof Error ? error.message : String(error)}`));
      }
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

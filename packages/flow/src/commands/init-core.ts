/**
 * Core initialization logic - extracted for reuse without UI coupling
 * Used by both flow command (integrated) and legacy init command (standalone)
 */

import chalk from 'chalk';
import ora from 'ora';
import { targetManager } from '../core/target-manager.js';
import { CLIError } from '../utils/error-handler.js';
import { projectSettings } from '../utils/settings.js';
import { validateTarget } from '../utils/target-config.js';
import { ConfigService } from '../services/config-service.js';

export interface InitOptions {
  target?: string;
  verbose?: boolean;
  dryRun?: boolean;
  clear?: boolean;
  mcp?: boolean;
  agents?: boolean;
  rules?: boolean;
  outputStyles?: boolean;
  slashCommands?: boolean;
  hooks?: boolean;
  quiet?: boolean; // Suppress all output for programmatic use
}

export interface ComponentInstallResult {
  targetId: string;
  targetName: string;
  installed: {
    mcp?: number;
    agents?: number;
    outputStyles?: number;
    rules?: number;
    slashCommands?: number;
    hooks?: number;
  };
}

/**
 * Select and validate target - PURE LOGIC, no UI
 * @returns targetId
 */
export async function selectAndValidateTarget(options: InitOptions): Promise<string> {
  let targetId = options.target;

  // Target selection (with UI prompt if needed)
  if (!targetId) {
    targetId = await targetManager.promptForTargetSelection();
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
  }

  if (!targetId) {
    throw new Error('Target ID not set');
  }

  return targetId;
}

/**
 * Preview what will be installed in dry run mode
 */
export async function previewDryRun(targetId: string, options: InitOptions): Promise<void> {
  const targetOption = targetManager.getTarget(targetId);
  if (targetOption._tag === 'None') {
    throw new Error(`Target not found: ${targetId}`);
  }

  const target = targetOption.value;

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

  if (options.slashCommands !== false && target.setupSlashCommands) {
    console.log(chalk.cyan.bold('\nSlash Commands:'));
    console.log(chalk.dim('  ✓ Slash commands will be installed'));
  }

  if (options.hooks !== false && target.setupHooks) {
    console.log(chalk.cyan.bold('\nHooks:'));
    console.log(chalk.dim('  ✓ Hooks will be configured'));
  }
}

/**
 * Install all components - CORE LOGIC with minimal UI
 */
export async function installComponents(
  targetId: string,
  options: InitOptions
): Promise<ComponentInstallResult> {
  const targetOption = targetManager.getTarget(targetId);
  if (targetOption._tag === 'None') {
    throw new Error(`Target not found: ${targetId}`);
  }

  const target = targetOption.value;
  const quiet = options.quiet || false;
  const result: ComponentInstallResult = {
    targetId,
    targetName: target.name,
    installed: {},
  };

  // Setup MCP servers if target supports it and MCP is enabled
  // Note: No spinner here because MCP setup is interactive (user prompts)
  if (target.setupMCP && options.mcp !== false) {
    try {
      const mcpResult = await target.setupMCP(process.cwd(), options);
      result.installed.mcp = mcpResult.count;

      if (!quiet) {
        if (mcpResult.count > 0) {
          console.log(
            chalk.green(
              `✔ Installed ${chalk.cyan(mcpResult.count)} MCP server${mcpResult.count !== 1 ? 's' : ''}`
            )
          );
        } else {
          console.log(chalk.dim('ℹ No MCP servers selected'));
        }
      }
    } catch (error) {
      // If user cancels MCP setup (Ctrl+C), continue with other components
      if (error instanceof Error && error.name === 'ExitPromptError') {
        if (!quiet) {
          console.log(chalk.yellow('\n⚠️  MCP setup cancelled, continuing with other components\n'));
        }
      } else {
        if (!quiet) {
          console.error(chalk.red('✖ Failed to setup MCP servers'));
        }
        throw error;
      }
    }
  }

  // Install agents if target supports it and agents are not skipped
  if (target.setupAgents && options.agents !== false) {
    const agentSpinner = quiet ? null : ora({ text: 'Installing agents', color: 'cyan' }).start();
    try {
      const agentResult = await target.setupAgents(process.cwd(), { ...options, quiet: true, force: options.clear });
      result.installed.agents = agentResult.count;

      if (agentSpinner) {
        agentSpinner.succeed(
          chalk.green(`Installed ${chalk.cyan(agentResult.count)} agent${agentResult.count !== 1 ? 's' : ''}`)
        );
      }
    } catch (error) {
      if (agentSpinner) {
        agentSpinner.fail(chalk.red('Failed to install agents'));
      }
      throw error;
    }
  }

  // Install output styles if target supports it and output styles are not skipped
  if (target.setupOutputStyles && options.outputStyles !== false) {
    const stylesSpinner = quiet ? null : ora({ text: 'Installing output styles', color: 'cyan' }).start();
    try {
      const stylesResult = await target.setupOutputStyles(process.cwd(), { ...options, quiet: true, force: options.clear });
      result.installed.outputStyles = stylesResult.count;

      if (stylesSpinner) {
        if (stylesResult.count > 0) {
          stylesSpinner.succeed(
            chalk.green(
              `Installed ${chalk.cyan(stylesResult.count)} output style${stylesResult.count !== 1 ? 's' : ''}`
            )
          );
        } else if (stylesResult.message) {
          stylesSpinner.info(chalk.dim(stylesResult.message));
        } else {
          stylesSpinner.info(chalk.dim('No output styles to install'));
        }
      }
    } catch (error) {
      if (stylesSpinner) {
        stylesSpinner.fail(chalk.red('Failed to install output styles'));
      }
      throw error;
    }
  }

  // Install rules if target supports it and rules are not skipped
  if (target.setupRules && options.rules !== false) {
    const rulesSpinner = quiet ? null : ora({ text: 'Installing rules', color: 'cyan' }).start();
    try {
      const rulesResult = await target.setupRules(process.cwd(), { ...options, quiet: true, force: options.clear });
      result.installed.rules = rulesResult.count;

      if (rulesSpinner) {
        if (rulesResult.count > 0) {
          rulesSpinner.succeed(
            chalk.green(
              `Installed ${chalk.cyan(rulesResult.count)} rule${rulesResult.count !== 1 ? 's' : ''}`
            )
          );
        } else if (rulesResult.message) {
          rulesSpinner.info(chalk.dim(rulesResult.message));
        } else {
          rulesSpinner.info(chalk.dim('No rules to install'));
        }
      }
    } catch (error) {
      if (rulesSpinner) {
        rulesSpinner.fail(chalk.red('Failed to install rules'));
      }
      throw error;
    }
  }

  // Install slash commands if target supports it and slash commands are not skipped
  if (target.setupSlashCommands && options.slashCommands !== false) {
    const commandsSpinner = quiet ? null : ora({
      text: 'Installing slash commands',
      color: 'cyan',
    }).start();
    try {
      const commandsResult = await target.setupSlashCommands(process.cwd(), { ...options, quiet: true, force: options.clear });
      result.installed.slashCommands = commandsResult.count;

      if (commandsSpinner) {
        if (commandsResult.count > 0) {
          commandsSpinner.succeed(
            chalk.green(
              `Installed ${chalk.cyan(commandsResult.count)} slash command${commandsResult.count !== 1 ? 's' : ''}`
            )
          );
        } else if (commandsResult.message) {
          commandsSpinner.info(chalk.dim(commandsResult.message));
        } else {
          commandsSpinner.info(chalk.dim('No slash commands to install'));
        }
      }
    } catch (error) {
      if (commandsSpinner) {
        commandsSpinner.fail(chalk.red('Failed to install slash commands'));
      }
      throw error;
    }
  }

  // Setup hooks if target supports it and hooks are not skipped
  if (target.setupHooks && options.hooks !== false) {
    const hooksSpinner = quiet ? null : ora({ text: 'Setting up hooks', color: 'cyan' }).start();
    try {
      const hooksResult = await target.setupHooks(process.cwd(), { ...options, quiet: true });
      result.installed.hooks = hooksResult.count;

      if (hooksSpinner) {
        if (hooksResult.count > 0) {
          const message = hooksResult.message
            ? `Configured ${chalk.cyan(hooksResult.count)} hook${hooksResult.count !== 1 ? 's' : ''} - ${hooksResult.message}`
            : `Configured ${chalk.cyan(hooksResult.count)} hook${hooksResult.count !== 1 ? 's' : ''}`;
          hooksSpinner.succeed(chalk.green(message));
        } else {
          hooksSpinner.info(chalk.dim(hooksResult.message || 'No hooks to configure'));
        }
      }
    } catch (error) {
      // Don't fail entire setup if hooks fail
      if (hooksSpinner) {
        hooksSpinner.warn(chalk.yellow('Could not setup hooks'));
        console.warn(chalk.dim(`  ${error instanceof Error ? error.message : String(error)}`));
      }
    }
  }

  // Save the selected target as project default
  try {
    await projectSettings.setDefaultTarget(targetId);

    // Save to new ConfigService for proper layered configuration
    await ConfigService.saveProjectSettings({
      target: targetId,
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    // Don't fail the entire setup if we can't save settings
    if (!quiet) {
      console.warn(
        chalk.yellow(
          `⚠ Warning: Could not save default target: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  return result;
}

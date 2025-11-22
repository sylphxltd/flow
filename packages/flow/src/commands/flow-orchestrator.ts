/**
 * Flow Orchestrator - Simplified flow management
 * Separates concerns and reduces complexity
 */

import chalk from 'chalk';
import type { FlowOptions } from './flow/types.js';
import { StateDetector, type ProjectState } from '../core/state-detector.js';
import { UpgradeManager } from '../core/upgrade-manager.js';
import { targetManager } from '../core/target-manager.js';

/**
 * Step 1: Check for available upgrades
 */
export async function checkUpgrades(
  state: ProjectState,
  options: FlowOptions
): Promise<void> {
  if (options.initOnly || options.runOnly) return;

  // Check Flow upgrade
  if (await UpgradeManager.isUpgradeAvailable()) {
    console.log(
      chalk.yellow(
        `📦 Sylphx Flow update available: ${state.version} → ${state.latestVersion}\n`
      )
    );
    const { default: inquirer } = await import('inquirer');
    const { upgrade } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'upgrade',
        message: 'Upgrade Sylphx Flow now?',
        default: true,
      },
    ]);
    if (upgrade) {
      options.upgrade = true;
    }
  }

  // Check target upgrade (if target exists and outdated)
  if (state.target && state.targetVersion && state.targetLatestVersion &&
      state.targetVersion !== state.targetLatestVersion) {
    // Simple version comparison
    const isOutdated = compareVersions(state.targetVersion, state.targetLatestVersion) < 0;

    if (isOutdated) {
      console.log(
        chalk.yellow(
          `📦 ${state.target} update available: ${state.targetVersion} → ${state.targetLatestVersion}\n`
        )
      );
      const { default: inquirer } = await import('inquirer');
      const { upgradeTarget } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'upgradeTarget',
          message: `Upgrade ${state.target} now?`,
          default: true,
        },
      ]);
      if (upgradeTarget) {
        options.upgradeTarget = true;
      }
    }
  }
}

/**
 * Compare two version strings
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 !== p2) {
      return p1 - p2;
    }
  }
  return 0;
}

/**
 * Step 2: Check component integrity and prompt for repair
 */
export async function checkComponentIntegrity(
  state: ProjectState,
  options: FlowOptions
): Promise<void> {
  // Skip if not initialized or cleaning or init-only
  if (!state.initialized || options.clean || options.initOnly) return;

  // Skip in quick mode
  if (options.quick) return;

  // Find missing components (target-aware)
  const missing: string[] = [];

  // Agents are always required
  if (!state.components.agents.installed) missing.push('agents');

  // For OpenCode: check rules (separate AGENTS.md file)
  // For Claude Code: rules are included in agent files, so skip this check
  if (state.target === 'opencode' && !state.components.rules.installed) {
    missing.push('rules');
  }

  // Hooks are optional - don't check
  // Claude Code can have hooks in .claude/hooks/*.js but they're optional
  // OpenCode doesn't have separate hooks

  // MCP is optional now - many users don't use MCP
  // if (!state.components.mcp.installed) missing.push('mcp');

  // Output styles:
  // - Claude Code: included in agent files, so skip check
  // - OpenCode: included in AGENTS.md, so skip check

  // Slash commands are optional
  // if (!state.components.slashCommands.installed) missing.push('slash commands');

  // If no missing components, we're good
  if (missing.length === 0) return;

  // Prompt user to repair
  console.log(chalk.yellow(`\n⚠️  Missing components detected: ${missing.join(', ')}\n`));
  const { default: inquirer } = await import('inquirer');
  const { repair } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'repair',
      message: 'Install missing components now?',
      default: true,
    },
  ]);

  if (repair) {
    // Set repair mode - will trigger component installation without full re-init
    options.repair = true;
    console.log(chalk.cyan('\n🔧 Repairing components...\n'));
  } else {
    console.log(chalk.dim('Skipping repair. Components may not work correctly.\n'));
  }
}

/**
 * Step 2.5: Check sync status (new templates available)
 * Only checks for missing templates, ignores unknown files
 */
export async function checkSyncStatus(
  state: ProjectState,
  options: FlowOptions
): Promise<void> {
  // Skip if not initialized, syncing, or init-only
  if (!state.initialized || options.sync || options.initOnly) return;

  // Skip in quick mode
  if (options.quick) return;

  // Need target to check sync status
  if (!state.target) return;

  try {
    const { buildSyncManifest } = await import('../utils/sync-utils.js');
    const target = targetManager.getTarget(state.target);

    if (target._tag === 'None') return;

    const manifest = await buildSyncManifest(process.cwd(), target.value);

    // Count missing templates (new templates not installed locally)
    const missingCount =
      manifest.agents.missing.length +
      manifest.slashCommands.missing.length +
      manifest.rules.missing.length;

    // Only prompt if there are missing templates
    if (missingCount > 0) {
      const missing: string[] = [];

      if (manifest.agents.missing.length > 0) {
        missing.push(`${manifest.agents.missing.length} agent${manifest.agents.missing.length > 1 ? 's' : ''}`);
      }
      if (manifest.slashCommands.missing.length > 0) {
        missing.push(`${manifest.slashCommands.missing.length} command${manifest.slashCommands.missing.length > 1 ? 's' : ''}`);
      }
      if (manifest.rules.missing.length > 0) {
        missing.push(`${manifest.rules.missing.length} rule${manifest.rules.missing.length > 1 ? 's' : ''}`);
      }

      console.log(chalk.yellow(`\n📦 New templates available: ${missing.join(', ')}\n`));
      console.log(chalk.dim(`   Run ${chalk.cyan('sylphx-flow --sync')} to install new templates\n`));
    }
  } catch (error) {
    // Silently ignore sync check errors - don't block execution
  }
}

/**
 * Step 3: Handle target selection
 * Returns the selected target ID
 */
export async function selectTarget(
  state: ProjectState,
  options: FlowOptions
): Promise<string | undefined> {
  // Force target selection when cleaning
  if (options.clean) {
    const targetId = await targetManager.promptForTargetSelection();
    console.log(chalk.green(`✅ Selected target: ${targetId}`));
    return targetId;
  }

  // Use existing target or option
  return options.target || state.target;
}

/**
 * Step 3: Initialize project
 */
export async function initializeProject(
  targetId: string | undefined,
  options: FlowOptions
): Promise<void> {
  if (options.runOnly && !options.clean) return;

  console.log(chalk.cyan.bold('━ Initializing Project\n'));

  const { runInit } = await import('./init-command.js');

  const initOptions = {
    target: targetId,
    verbose: options.verbose,
    dryRun: options.dryRun,
    clear: options.clean || false,
    mcp: options.mcp !== false,
    agents: options.agents !== false,
    rules: options.rules !== false,
    outputStyles: options.outputStyles !== false,
    slashCommands: options.slashCommands !== false,
    hooks: options.hooks !== false,
    helpOption: () => {},
  };

  try {
    await runInit(initOptions);

    if (!options.dryRun) {
      console.log(chalk.green.bold('\n✓ Initialization complete\n'));
    } else {
      console.log(chalk.dim('\n✓ Dry run complete - skipping execution\n'));
    }
  } catch (error) {
    console.error(chalk.red.bold('\n✗ Initialization failed:'), error);
    throw error;
  }
}

/**
 * Step 4: Launch target
 */
export async function launchTarget(
  targetId: string | undefined,
  prompt: string | undefined,
  options: FlowOptions,
  state: ProjectState
): Promise<void> {
  if (options.initOnly) return;

  // Resolve target
  const resolvedTarget = await targetManager.resolveTarget({
    target: targetId || state.target,
    allowSelection: false,
  });

  console.log(chalk.cyan.bold(`━ Launching ${resolvedTarget}\n`));

  // Check if target supports command execution
  const { getTargetsWithCommandSupport } = await import('../config/targets.js');
  const supportedTargets = getTargetsWithCommandSupport().map(t => t.id);

  if (!supportedTargets.includes(resolvedTarget)) {
    console.log(chalk.red.bold('✗ Unsupported target platform\n'));
    console.log(
      chalk.yellow(`Target '${resolvedTarget}' does not support agent execution.`)
    );
    console.log(chalk.cyan(`Supported platforms: ${supportedTargets.join(', ')}\n`));
    throw new Error(`Unsupported target: ${resolvedTarget}`);
  }

  // Handle Claude Code specific setup
  if (resolvedTarget === 'claude-code') {
    await setupClaudeCode(options);
  }

  // Execute command
  await executeCommand(resolvedTarget, prompt, options);
}

/**
 * Setup Claude Code (provider + agent selection)
 */
async function setupClaudeCode(options: FlowOptions): Promise<void> {
  const { SmartConfigService } = await import('../services/smart-config-service.js');
  const { ConfigService } = await import('../services/config-service.js');

  // Check if API keys are configured
  if (!(await ConfigService.hasInitialSetup())) {
    console.log(chalk.cyan('\n🔑 First-time setup for Claude Code:\n'));
    await SmartConfigService.initialSetup();
    console.log(chalk.green('\n✅ Claude Code setup complete!\n'));
  }

  // Select provider and agent
  const runtimeChoices = await SmartConfigService.selectRuntimeChoices({
    selectProvider: options.selectProvider,
    selectAgent: options.selectAgent,
    useDefaults: options.useDefaults,
    provider: options.provider,
    agent: options.agent,
  });

  // Setup environment
  await SmartConfigService.setupEnvironment(runtimeChoices.provider!);

  // Store selected agent
  options.agent = runtimeChoices.agent;
}

/**
 * Execute the target command
 */
async function executeCommand(
  targetId: string,
  prompt: string | undefined,
  options: FlowOptions
): Promise<void> {
  const agent = options.agent || 'coder';
  const verbose = options.verbose || false;

  if (verbose || options.runOnly) {
    console.log(`🤖 Agent: ${agent}`);
    console.log(`🎯 Target: ${targetId}`);
    if (prompt) {
      console.log(`💬 Prompt: ${prompt}\n`);
    }
  }

  // Run the command
  const { runCommand } = await import('./run-command.js');
  await runCommand({ target: targetId, agent, prompt, verbose });
}

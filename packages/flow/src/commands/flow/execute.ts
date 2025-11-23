/**
 * Execution Logic for Flow Command
 * Command execution for single-run and loop modes
 */

import chalk from 'chalk';
import { targetManager } from '../../core/target-manager.js';
import { StateDetector } from '../../core/state-detector.js';
import { UpgradeManager } from '../../core/upgrade-manager.js';
import { projectSettings } from '../../utils/config/settings.js';
import { showWelcome } from '../../utils/display/banner.js';
import { showStatus } from '../../utils/display/status.js';
import { loadAgentContent, extractAgentInstructions } from '../run-command.js';
import { CLIError } from '../../utils/error-handler.js';
import type { RunCommandOptions } from '../../types.js';
import type { FlowOptions, SetupContext } from './types.js';
import { resolvePrompt } from './prompt.js';
import { executeSetupPhase } from './setup.js';
import { getExecutableTargets } from './targets.js';

/**
 * Execute command using target's executeCommand method
 */
export async function executeTargetCommand(
  targetId: string,
  systemPrompt: string,
  userPrompt: string,
  options: RunCommandOptions
): Promise<void> {
  const targetOption = targetManager.getTarget(targetId);

  if (targetOption._tag === 'None') {
    throw new CLIError(`Target not found: ${targetId}`, 'TARGET_NOT_FOUND');
  }

  const target = targetOption.value;

  if (!target.isImplemented) {
    throw new CLIError(
      `Target '${targetId}' is not implemented. Supported targets: ${getExecutableTargets().join(', ')}`,
      'TARGET_NOT_IMPLEMENTED'
    );
  }

  if (!target.executeCommand) {
    throw new CLIError(
      `Target '${targetId}' does not support command execution. Supported targets: ${getExecutableTargets().join(', ')}`,
      'EXECUTION_NOT_SUPPORTED'
    );
  }

  return target.executeCommand(systemPrompt, userPrompt, options);
}

/**
 * Execute command only (for loop mode iterations)
 * Uses pre-setup context to execute command without re-doing setup
 */
export async function executeCommandOnly(
  context: SetupContext,
  prompt: string | undefined,
  options: FlowOptions
): Promise<void> {
  const userPrompt = prompt?.trim() || '';

  // Update continue flag in runOptions
  const runOptions = {
    ...context.runOptions,
    continue: options.continue,
  };

  try {
    await executeTargetCommand(context.resolvedTarget, context.systemPrompt!, userPrompt, runOptions);
  } catch (error) {
    console.error(chalk.red.bold('\n✗ Launch failed:'), error);
    throw error;
  }
}

/**
 * Single flow execution (used by both normal and loop mode)
 */
export async function executeFlowOnce(prompt: string | undefined, options: FlowOptions): Promise<void> {
  // Quick mode: enable useDefaults and skip prompts
  if (options.quick) {
    options.useDefaults = true;
    console.log(chalk.cyan('⚡ Quick mode enabled - using saved defaults\n'));
  }

  // Continue mode always requires print mode
  if (options.continue && !options.print) {
    options.print = true;
  }

  // Import orchestrator functions
  const {
    checkUpgrades,
    checkComponentIntegrity,
    checkSyncStatus,
  } = await import('../flow-orchestrator.js');

  // Show welcome banner
  showWelcome();

  // Declare at function level to persist across steps
  let selectedTarget: string | undefined;
  let state = undefined;

  // First: determine target (from options, saved settings, or init will prompt)
  const initialTarget = options.target || (await projectSettings.getDefaultTarget());

  // Only detect state if we have a target (can't check components without knowing target structure)
  if (initialTarget && !options.sync) {
    const detector = new StateDetector();
    const upgradeManager = new UpgradeManager();

    if (options.verbose) {
      console.log(chalk.dim('🤔 Checking project status...\n'));
    }

    state = await detector.detect();

    if (options.verbose) {
      await showStatus(state);
    }

    // Step 1: Check for upgrades
    if (!options.quick) {
      await checkUpgrades(state, options);
    }

    // Step 1: Upgrade (if requested)
    if (options.upgrade && state.outdated && state.latestVersion) {
      console.log(chalk.cyan.bold('━━━ 📦 Upgrading Flow\n'));
      await upgradeManager.upgradeFlow(state);
      console.log(chalk.green('✓ Upgrade complete\n'));
      // Re-detect after upgrade
      state.version = state.latestVersion;
      state.outdated = false;
    }

    // Step 2: Upgrade target (if requested)
    if (options.upgradeTarget && state.target) {
      console.log(chalk.cyan.bold(`━━━ 🎯 Upgrading ${state.target}\n`));
      await upgradeManager.upgradeTarget(state);
      console.log(chalk.green('✓ Target upgrade complete\n'));
    }

    // Step 2.5: Check component integrity (only if we have valid state)
    await checkComponentIntegrity(state, options);

    // Step 2.6: Check sync status (new templates available)
    await checkSyncStatus(state, options);
  }

  // Step 3: Initialize (only if actually needed)
  const shouldInitialize =
    !state?.initialized ||
    options.sync ||
    options.repair ||
    options.initOnly;

  if (shouldInitialize) {
    console.log(chalk.cyan.bold('━━━ 🚀 Initializing Project\n'));
    selectedTarget = await initializeProject(options, state);
  }

  // Step 4: Launch target (if not init-only)
  if (!options.initOnly) {
    await launchTarget(prompt, options, state, selectedTarget);
  } else {
    console.log(chalk.dim('✓ Init-only mode, skipping execution\n'));
  }
}

/**
 * Initialize project with components
 */
async function initializeProject(options: FlowOptions, state: any): Promise<string | undefined> {
  const {
    selectAndValidateTarget,
    previewDryRun,
    installComponents,
  } = await import('../init-core.js');

  let selectedTarget: string | undefined;

  try {
    // In repair mode, use existing target from state
    const targetForInit = options.repair && state?.target
      ? state.target
      : options.target;

    // Prepare init options
    const initOptions = {
      target: targetForInit,
      verbose: options.verbose,
      dryRun: options.dryRun,
      clear: options.sync || false,
      mcp: options.mcp !== false,
      agents: options.agents !== false,
      rules: options.rules !== false,
      outputStyles: options.outputStyles !== false,
      slashCommands: options.slashCommands !== false,
      hooks: options.hooks !== false,
    };

    // Handle sync mode - delete template files first
    if (options.sync && !options.dryRun) {
      selectedTarget = await handleSyncMode(initOptions);
    } else {
      // Select and validate target
      const targetId = await selectAndValidateTarget(initOptions);
      selectedTarget = targetId;
    }

    // Dry run preview
    if (options.dryRun) {
      if (!selectedTarget) {
        const targetId = await selectAndValidateTarget(initOptions);
        selectedTarget = targetId;
      }

      await previewDryRun(selectedTarget, initOptions);
      console.log(chalk.dim('✓ Initialization dry run complete\n'));
    } else {
      // Actually install components
      if (!selectedTarget) {
        const targetId = await selectAndValidateTarget(initOptions);
        selectedTarget = targetId;
      }

      await installComponents(selectedTarget, initOptions);
      console.log(chalk.green.bold('✓ Initialization complete\n'));
    }
  } catch (error) {
    console.error(chalk.red.bold('✗ Initialization failed:'), error);
    process.exit(1);
  }

  return selectedTarget;
}

/**
 * Handle sync mode
 */
async function handleSyncMode(initOptions: any): Promise<string> {
  const { buildSyncManifest, showSyncPreview, selectUnknownFilesToRemove, showFinalSummary, confirmSync, executeSyncDelete, removeMCPServers, removeHooks } = await import('../../utils/files/sync-utils.js');
  const { selectAndValidateTarget } = await import('../init-core.js');

  const targetId = await selectAndValidateTarget(initOptions);

  const targetOption = targetManager.getTarget(targetId);
  if (targetOption._tag === 'None') {
    throw new Error(`Target not found: ${targetId}`);
  }

  const target = targetOption.value;
  const manifest = await buildSyncManifest(process.cwd(), target);

  console.log(chalk.cyan.bold('━━━ 🔄 Synchronizing Files\n'));
  showSyncPreview(manifest, process.cwd(), target);

  const selectedUnknowns = await selectUnknownFilesToRemove(manifest);
  showFinalSummary(manifest, selectedUnknowns);

  const confirmed = await confirmSync();
  if (!confirmed) {
    console.log(chalk.yellow('\n✗ Sync cancelled\n'));
    process.exit(0);
  }

  const { templates, unknowns } = await executeSyncDelete(manifest, selectedUnknowns);

  let mcpRemoved = 0;
  if (selectedUnknowns.mcpServers.length > 0) {
    mcpRemoved = await removeMCPServers(process.cwd(), selectedUnknowns.mcpServers);
  }

  let hooksRemoved = 0;
  if (selectedUnknowns.hooks.length > 0) {
    hooksRemoved = await removeHooks(process.cwd(), selectedUnknowns.hooks);
  }

  console.log(chalk.green(`\n✓ Synced ${templates} templates`));
  const totalRemoved = unknowns + mcpRemoved + hooksRemoved;
  if (totalRemoved > 0) {
    console.log(chalk.green(`✓ Removed ${totalRemoved} items`));
  }
  const totalSelected = selectedUnknowns.files.length + selectedUnknowns.mcpServers.length + selectedUnknowns.hooks.length;
  const preserved = manifest.agents.unknown.length + manifest.slashCommands.unknown.length + manifest.rules.unknown.length + manifest.mcpServers.notInRegistry.length + manifest.hooks.orphaned.length - totalSelected;
  if (preserved > 0) {
    console.log(chalk.green(`✓ Preserved ${preserved} custom items`));
  }
  console.log('');

  return targetId;
}

/**
 * Launch target with agent
 */
async function launchTarget(
  prompt: string | undefined,
  options: FlowOptions,
  state: any,
  selectedTarget: string | undefined
): Promise<void> {
  // Resolve target - use the target we just selected
  let targetForResolution = options.target || state?.target || selectedTarget;

  // If we just selected a target during init, use that
  if (selectedTarget) {
    targetForResolution = selectedTarget;
  }

  if (!targetForResolution) {
    console.error(chalk.red.bold('✗ No target selected. Use --target or run init first.'));
    process.exit(1);
  }

  const resolvedTarget = await targetManager.resolveTarget({
    target: targetForResolution,
    allowSelection: false,
  });

  console.log(chalk.cyan.bold(`━━━ 🎯 Launching ${resolvedTarget}\n`));

  // Check if target supports command execution
  const { getTargetsWithCommandSupport } = await import('../../config/targets.js');
  const supportedTargets = getTargetsWithCommandSupport().map(t => t.id);

  if (!supportedTargets.includes(resolvedTarget)) {
    console.log(chalk.red.bold('✗ Unsupported target platform\n'));
    console.log(chalk.yellow(`Target '${resolvedTarget}' does not support agent execution.`));
    console.log(chalk.cyan(`Supported platforms: ${supportedTargets.join(', ')}\n`));
    console.log(chalk.dim('Tip: Use --target claude-code to specify Claude Code platform'));
    console.log(chalk.dim('Example: bun dev:flow --target claude-code\n'));
    process.exit(1);
  }

  // Claude Code handling - needs provider/agent setup
  if (resolvedTarget === 'claude-code') {
    await setupClaudeCode(options);
  }

  const agent = options.agent || 'coder';
  const verbose = options.verbose || false;

  if (verbose || options.runOnly || !options.quick) {
    console.log(`  🤖 Agent: ${chalk.cyan(agent)}`);
    console.log(`  🎯 Target: ${chalk.cyan(resolvedTarget)}`);
    if (prompt) {
      console.log(`  💬 Prompt: ${chalk.dim(prompt)}\n`);
    } else {
      console.log(`  💬 Mode: ${chalk.dim('Interactive')}\n`);
    }
  }

  // Load agent and prepare prompts
  const agentContent = await loadAgentContent(agent, options.agentFile);
  const agentInstructions = extractAgentInstructions(agentContent);
  const systemPrompt = `AGENT INSTRUCTIONS:\n${agentInstructions}`;

  const userPrompt = prompt?.trim() || '';

  // Run options
  const runOptions: RunCommandOptions = {
    target: resolvedTarget,
    verbose,
    dryRun: options.dryRun,
    agent,
    agentFile: options.agentFile,
    prompt,
    print: options.print,
    continue: options.continue,
  };

  try {
    await executeTargetCommand(resolvedTarget, systemPrompt, userPrompt, runOptions);
  } catch (error) {
    console.error(chalk.red.bold('\n✗ Launch failed:'), error);
    process.exit(1);
  }

  if (!options.dryRun) {
    console.log(chalk.dim('━━━\n'));
    console.log(chalk.green('✓ Session complete\n'));
  }
}

/**
 * Setup Claude Code provider and agent
 */
async function setupClaudeCode(options: FlowOptions): Promise<void> {
  const { SmartConfigService } = await import('../../services/smart-config-service.js');
  const { ConfigService } = await import('../../services/config-service.js');

  if (!(await ConfigService.hasInitialSetup())) {
    console.log(chalk.cyan('🔑 First-time setup for Claude Code\n'));
    await SmartConfigService.initialSetup();
    console.log(chalk.green('✓ Setup complete!\n'));
  }

  const runtimeChoices = await SmartConfigService.selectRuntimeChoices({
    selectProvider: options.selectProvider,
    selectAgent: options.selectAgent,
    useDefaults: options.useDefaults,
    provider: options.provider,
    agent: options.agent,
  });

  await SmartConfigService.setupEnvironment(runtimeChoices.provider!);
  options.agent = runtimeChoices.agent;
}

/**
 * Main flow execution logic - simplified with orchestrator
 */
export async function executeFlow(prompt: string | undefined, options: FlowOptions): Promise<void> {
  // Resolve prompt (handle file input)
  const resolvedPrompt = await resolvePrompt(prompt);

  // Loop mode: Setup once, then loop only execution
  if (options.loop !== undefined) {
    const { LoopController } = await import('../../core/loop-controller.js');
    const controller = new LoopController();

    // Default to 0s (no cooldown) if just --loop with no value
    const interval = typeof options.loop === 'number' ? options.loop : 0;

    // Auto-enable headless mode for loop
    options.print = true;

    // ONE-TIME SETUP: Do all initialization once before loop starts
    const setupContext = await executeSetupPhase(resolvedPrompt, options);

    // Save original continue flag
    const originalContinue = options.continue || false;

    // LOOP: Only execute the command repeatedly
    await controller.run(
      async () => {
        const isFirstIteration = controller['state'].iteration === 1;

        // Continue logic:
        // - If user specified --continue, always use it (all iterations)
        // - If user didn't specify, only use from 2nd iteration onwards
        options.continue = originalContinue || !isFirstIteration;

        try {
          await executeCommandOnly(setupContext, resolvedPrompt, options);
          return { exitCode: 0 };
        } catch (error) {
          return { exitCode: 1, error: error as Error };
        }
      },
      {
        enabled: true,
        interval,
        maxRuns: options.maxRuns,
      }
    );

    return;
  }

  // Normal execution (non-loop)
  await executeFlowOnce(resolvedPrompt, options);
}

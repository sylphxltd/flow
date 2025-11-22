/**
 * Setup Phase for Flow Command
 * One-time initialization and preparation for command execution
 */

import chalk from 'chalk';
import { targetManager } from '../../core/target-manager.js';
import { StateDetector, type ProjectState } from '../../core/state-detector.js';
import { projectSettings } from '../../utils/config/settings.js';
import { showWelcome } from '../../utils/display/banner.js';
import { showStatus } from '../../utils/display/status.js';
import { loadAgentContent, extractAgentInstructions } from '../run-command.js';
import type { RunCommandOptions } from '../../types.js';
import type { FlowOptions, SetupContext } from './types.js';

/**
 * Execute setup phase once (for loop mode)
 * Returns context needed for repeated command execution
 */
export async function executeSetupPhase(prompt: string | undefined, options: FlowOptions): Promise<SetupContext> {
  // Quick mode: enable useDefaults and skip prompts
  if (options.quick) {
    options.useDefaults = true;
    console.log(chalk.cyan('⚡ Quick mode enabled - using saved defaults\n'));
  }

  // Import orchestrator functions
  const {
    checkUpgrades,
    checkComponentIntegrity,
  } = await import('../flow-orchestrator.js');

  // Show welcome banner (only once)
  showWelcome();

  let selectedTarget: string | undefined;
  let state: ProjectState | undefined;

  // Determine target
  const initialTarget = options.target || (await projectSettings.getDefaultTarget());

  // Detect state if we have a target
  if (initialTarget && !options.sync) {
    const detector = new StateDetector();

    if (options.verbose) {
      console.log(chalk.dim('🤔 Checking project status...\n'));
    }

    state = await detector.detect();

    if (options.verbose) {
      await showStatus(state);
    }

    // Check for upgrades
    if (!options.quick) {
      await checkUpgrades(state, options);
    }

    // Check component integrity
    await checkComponentIntegrity(state, options);
  }

  // Initialize if needed
  const shouldInitialize =
    !state?.initialized ||
    options.sync ||
    options.repair ||
    options.initOnly;

  if (shouldInitialize) {
    selectedTarget = await initializeWithTarget(options);
  }

  // Resolve target
  const targetForResolution = resolveTargetPriority(options.target, state?.target, selectedTarget);

  if (!targetForResolution) {
    console.error(chalk.red.bold('✗ No target selected. Use --target or run init first.'));
    process.exit(1);
  }

  const resolvedTarget = await targetManager.resolveTarget({
    target: targetForResolution,
    allowSelection: false,
  });

  console.log(chalk.cyan.bold(`━━━ 🎯 Launching ${resolvedTarget}\n`));

  // Validate target support
  await validateTargetSupport(resolvedTarget);

  // Handle Claude Code specific setup
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

  // Prepare run options
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

  return {
    resolvedTarget,
    initializedSuccessfully: true,
    systemPrompt,
    runOptions,
  };
}

/**
 * Initialize project with target selection and component installation
 */
async function initializeWithTarget(options: FlowOptions): Promise<string | undefined> {
  let selectedTarget: string | undefined;

  try {
    const { selectAndValidateTarget, previewDryRun, installComponents } =
      await import('../init-core.js');

    const initOptions = {
      target: options.target,
      verbose: options.verbose || false,
      dryRun: options.dryRun || false,
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
    } else if (!options.sync) {
      const targetId = await selectAndValidateTarget(initOptions);
      selectedTarget = targetId;
    }

    if (options.dryRun) {
      // Ensure we have a target ID for dry run
      if (!selectedTarget) {
        const targetId = await selectAndValidateTarget(initOptions);
        selectedTarget = targetId;
      }

      await previewDryRun(selectedTarget, initOptions);
      console.log(chalk.dim('✓ Initialization dry run complete\n'));
    } else {
      // Ensure we have a target ID for installation
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
 * Handle sync mode: delete templates then reinstall
 */
async function handleSyncMode(initOptions: any): Promise<string> {
  const { buildSyncManifest, showSyncPreview, selectUnknownFilesToRemove, showFinalSummary, confirmSync, executeSyncDelete, removeMCPServers, removeHooks } = await import('../../utils/sync-utils.js');
  const { selectAndValidateTarget } = await import('../init-core.js');

  // Need target to build manifest
  const targetId = await selectAndValidateTarget(initOptions);

  const targetOption = targetManager.getTarget(targetId);
  if (targetOption._tag === 'None') {
    throw new Error(`Target not found: ${targetId}`);
  }

  const target = targetOption.value;
  const manifest = await buildSyncManifest(process.cwd(), target);

  // Show preview
  console.log(chalk.cyan.bold('━━━ 🔄 Synchronizing Files\n'));
  showSyncPreview(manifest, process.cwd(), target);

  // Select unknown files to remove
  const selectedUnknowns = await selectUnknownFilesToRemove(manifest);

  // Show final summary
  showFinalSummary(manifest, selectedUnknowns);

  // Confirm
  const confirmed = await confirmSync();
  if (!confirmed) {
    console.log(chalk.yellow('\n✗ Sync cancelled\n'));
    process.exit(0);
  }

  // Execute deletion
  const { templates, unknowns } = await executeSyncDelete(manifest, selectedUnknowns);

  // Remove MCP servers
  let mcpRemoved = 0;
  if (selectedUnknowns.mcpServers.length > 0) {
    mcpRemoved = await removeMCPServers(process.cwd(), selectedUnknowns.mcpServers);
  }

  // Remove hooks
  let hooksRemoved = 0;
  if (selectedUnknowns.hooks.length > 0) {
    hooksRemoved = await removeHooks(process.cwd(), selectedUnknowns.hooks);
  }

  // Summary
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
 * Resolve target priority: options > state > selected
 */
function resolveTargetPriority(
  optionsTarget: string | undefined,
  stateTarget: string | undefined,
  selectedTarget: string | undefined
): string | undefined {
  return selectedTarget || optionsTarget || stateTarget;
}

/**
 * Validate that target supports command execution
 */
async function validateTargetSupport(resolvedTarget: string): Promise<void> {
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

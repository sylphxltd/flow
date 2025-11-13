import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import path from 'node:path';
import fs from 'node:fs/promises';
import { targetManager } from '../core/target-manager.js';
import { CLIError } from '../utils/error-handler.js';
import type { RunCommandOptions } from '../types.js';
import { StateDetector, type ProjectState } from '../core/state-detector.js';
import { UpgradeManager } from '../core/upgrade-manager.js';
import { loadAgentContent, extractAgentInstructions } from './run-command.js';
import { ClaudeConfigService } from '../services/claude-config-service.js';
import { ConfigService } from '../services/config-service.js';
import { projectSettings } from '../utils/settings.js';

export interface FlowOptions {
  target?: string;
  verbose?: boolean;
  dryRun?: boolean;
  clean?: boolean;
  initOnly?: boolean;
  runOnly?: boolean;
  repair?: boolean;     // Repair mode - install missing components
  upgrade?: boolean;
  upgradeTarget?: boolean;
  mcp?: boolean;
  agents?: boolean;
  rules?: boolean;
  outputStyles?: boolean;
  slashCommands?: boolean;
  hooks?: boolean;
  agent?: string;
  agentFile?: string;

  // Smart configuration options
  selectProvider?: boolean;
  selectAgent?: boolean;
  useDefaults?: boolean;
  provider?: string;
  quick?: boolean;

  // Execution modes
  print?: boolean;      // Headless print mode
  continue?: boolean;   // Continue previous conversation

  // Loop mode (continuous execution)
  loop?: number;        // Loop every N seconds (--loop 60)
  maxRuns?: number;     // Optional max iterations (default: infinite)
}

/**
 * Display welcome banner
 */
function showWelcome(): void {
  console.log(
    boxen(
      `${chalk.cyan.bold('Sylphx Flow')} ${chalk.dim('- AI-Powered Development Framework')}\n` +
      `${chalk.dim('Auto-initialization • Smart upgrades • One-click launch')}`,
      {
        padding: 1,
        margin: { bottom: 1 },
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );
}

/**
 * Compare versions to check if one is outdated
 */
function isVersionOutdated(current: string, latest: string): boolean {
  try {
    return compareVersions(current, latest) < 0;
  } catch {
    return false;
  }
}

/**
 * Compare two version strings
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
    if (parts1[i] !== parts2[i]) {
      return parts1[i] - parts2[i];
    }
  }

  return parts1.length - parts2.length;
}

async function showStatus(state: ProjectState): Promise<void> {
  console.log(chalk.cyan.bold('📊 Project Status\n'));

  if (!state.initialized) {
    console.log('  ' + chalk.yellow('⚠  Not initialized'));
  } else {
    console.log(`  ${chalk.green('✓')} Initialized (Flow v${state.version || 'unknown'})`);

    if (state.target) {
      const versionStr = state.targetVersion ? ` (v${state.targetVersion})` : '';
      console.log(`  ${chalk.green('✓')} Target platform: ${state.target}${versionStr}`);
    }

    // Component status
    const components = state.components;
    console.log(`\n  ${chalk.cyan('Components:')}`);
    console.log(`    Agents: ${components.agents.installed ? chalk.green(`✓ ${components.agents.count}`) : chalk.red('✗')}`);
    console.log(`    Rules: ${components.rules.installed ? chalk.green(`✓ ${components.rules.count}`) : chalk.red('✗')}`);
    console.log(`    Hooks: ${components.hooks.installed ? chalk.green('✓') : chalk.red('✗')}`);
    console.log(`    MCP: ${components.mcp.installed ? chalk.green(`✓ ${components.mcp.serverCount} servers`) : chalk.red('✗')}`);
    console.log(`    Output styles: ${components.outputStyles.installed ? chalk.green('✓') : chalk.red('✗')}`);
    console.log(`    Slash commands: ${components.slashCommands.installed ? chalk.green(`✓ ${components.slashCommands.count}`) : chalk.red('✗')}`);

    // Outdated warnings
    if (state.outdated) {
      console.log(`\n  ${chalk.yellow('⚠')} Flow version outdated: ${state.version} → ${state.latestVersion}`);
    }

    if (state.targetVersion && state.targetLatestVersion &&
        isVersionOutdated(state.targetVersion, state.targetLatestVersion)) {
      console.log(`  ${chalk.yellow('⚠')} ${state.target} update available: v${state.targetVersion} → v${state.targetLatestVersion}`);
    }

    if (state.lastUpdated) {
      const days = Math.floor((Date.now() - state.lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 7) {
        console.log(`\n  ${chalk.yellow('⚠')} Last updated: ${days} days ago`);
      }
    }
  }

  console.log('');
}

/**
 * Get executable targets
 */
function getExecutableTargets(): string[] {
  return targetManager.getImplementedTargetIDs().filter((targetId) => {
    const targetOption = targetManager.getTarget(targetId);
    if (targetOption._tag === 'None') {
      return false;
    }
    return targetOption.value.executeCommand !== undefined;
  });
}

/**
 * Execute command using target's executeCommand method
 */
async function executeTargetCommand(
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
 * Compare versions
 */
function isVersionOutdated(current: string, latest: string): boolean {
  try {
    return compareVersions(current, latest) < 0;
  } catch {
    return false;
  }
}

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
    if (parts1[i] !== parts2[i]) {
      return parts1[i] - parts2[i];
    }
  }

  return parts1.length - parts2.length;
}

/**
 * Resolve prompt - handle file input if needed
 * Supports @filename syntax: @prompt.txt or @/path/to/prompt.txt
 */
async function resolvePrompt(prompt: string | undefined): Promise<string | undefined> {
  if (!prompt) return prompt;

  // Check for file input syntax: @filename
  if (prompt.startsWith('@')) {
    const filePath = prompt.slice(1); // Remove @ prefix

    try {
      const resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      const content = await fs.readFile(resolvedPath, 'utf-8');
      console.log(chalk.dim(`  ✓ Loaded prompt from: ${filePath}\n`));
      return content.trim();
    } catch (error) {
      throw new Error(`Failed to read prompt file: ${filePath}`);
    }
  }

  return prompt;
}

/**
 * Main flow execution logic - simplified with orchestrator
 */
export async function executeFlow(prompt: string | undefined, options: FlowOptions): Promise<void> {
  // Resolve prompt (handle file input)
  const resolvedPrompt = await resolvePrompt(prompt);

  // Loop mode: Setup once, then loop only execution
  if (options.loop !== undefined) {
    const { LoopController } = await import('../core/loop-controller.js');
    const controller = new LoopController();

    // Default to 60s if just --loop with no value
    const interval = typeof options.loop === 'number' ? options.loop : 60;

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

/**
 * Setup context for command execution
 * Returns everything needed to execute the command repeatedly
 */
interface SetupContext {
  resolvedTarget: string;
  agent: string;
  systemPrompt: string;
  runOptions: RunCommandOptions;
}

/**
 * Execute setup phase once (for loop mode)
 * Returns context needed for repeated command execution
 */
async function executeSetupPhase(prompt: string | undefined, options: FlowOptions): Promise<SetupContext> {
  // Quick mode: enable useDefaults and skip prompts
  if (options.quick) {
    options.useDefaults = true;
    console.log(chalk.cyan('⚡ Quick mode enabled - using saved defaults\n'));
  }

  // Import orchestrator functions
  const {
    checkUpgrades,
    checkComponentIntegrity,
    selectTarget,
    initializeProject,
  } = await import('./flow-orchestrator.js');

  // Show welcome banner (only once)
  showWelcome();

  let selectedTarget: string | undefined;
  let state: ProjectState | undefined;

  // Determine target
  const initialTarget = options.target || (await projectSettings.getDefaultTarget());

  // Detect state if we have a target
  if (initialTarget && !options.clean) {
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
    options.clean ||
    options.repair ||
    options.initOnly;

  if (shouldInitialize) {
    try {
      const { selectAndValidateTarget, previewDryRun, installComponents } =
        await import('./init-core.js');

      const initOptions = {
        target: options.target,
        verbose: options.verbose || false,
        dryRun: options.dryRun || false,
        clear: options.clean || false,
        mcp: options.mcp !== false,
        agents: options.agents !== false,
        rules: options.rules !== false,
        outputStyles: options.outputStyles !== false,
        slashCommands: options.slashCommands !== false,
        hooks: options.hooks !== false,
      };

      const targetId = await selectAndValidateTarget(initOptions);
      selectedTarget = targetId;

      if (options.dryRun) {
        console.log(
          boxen(
            chalk.yellow('⚠ Dry Run Mode') + chalk.dim('\nNo changes will be made to your project'),
            {
              padding: 1,
              margin: { top: 0, bottom: 1, left: 0, right: 0 },
              borderStyle: 'round',
              borderColor: 'yellow',
            }
          )
        );

        await previewDryRun(targetId, initOptions);

        console.log(
          '\n' +
            boxen(chalk.green.bold('✓ Dry run complete'), {
              padding: { top: 0, bottom: 0, left: 2, right: 2 },
              margin: 0,
              borderStyle: 'round',
              borderColor: 'green',
            }) +
            '\n'
        );

        console.log(chalk.dim('✓ Initialization dry run complete\n'));
      } else {
        await installComponents(targetId, initOptions);
        console.log(chalk.green.bold('✓ Initialization complete\n'));
      }
    } catch (error) {
      console.error(chalk.red.bold('✗ Initialization failed:'), error);
      process.exit(1);
    }
  }

  // Resolve target
  let targetForResolution = options.target || state?.target || selectedTarget;
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
  const { getTargetsWithCommandSupport } = await import('../config/targets.js');
  const supportedTargets = getTargetsWithCommandSupport().map(t => t.id);

  if (!supportedTargets.includes(resolvedTarget)) {
    console.log(chalk.red.bold('✗ Unsupported target platform\n'));
    console.log(chalk.yellow(`Target '${resolvedTarget}' does not support agent execution.`));
    console.log(chalk.cyan(`Supported platforms: ${supportedTargets.join(', ')}\n`));
    console.log(chalk.dim('Tip: Use --target claude-code to specify Claude Code platform'));
    console.log(chalk.dim('Example: bun dev:flow --target claude-code\n'));
    process.exit(1);
  }

  // Claude Code handling
  if (resolvedTarget === 'claude-code') {
    const { SmartConfigService } = await import('../services/smart-config-service.js');
    const { ConfigService } = await import('../services/config-service.js');

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
    agent,
    systemPrompt,
    runOptions,
  };
}

/**
 * Execute command only (for loop mode iterations)
 * Uses pre-setup context to execute command without re-doing setup
 */
async function executeCommandOnly(
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
    await executeTargetCommand(context.resolvedTarget, context.systemPrompt, userPrompt, runOptions);
  } catch (error) {
    console.error(chalk.red.bold('\n✗ Launch failed:'), error);
    throw error;
  }
}

/**
 * Single flow execution (used by both normal and loop mode)
 */
async function executeFlowOnce(prompt: string | undefined, options: FlowOptions): Promise<void> {
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
    selectTarget,
    initializeProject,
    launchTarget,
  } = await import('./flow-orchestrator.js');

  // Show welcome banner
  showWelcome();

  // Declare at function level to persist across steps
  let selectedTarget: string | undefined;
  let state: ProjectState | undefined;

  // First: determine target (from options, saved settings, or init will prompt)
  const initialTarget = options.target || (await projectSettings.getDefaultTarget());

  // Only detect state if we have a target (can't check components without knowing target structure)
  if (initialTarget && !options.clean) {
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
  }

  // Step 3: Initialize (only if actually needed)
  // Positive logic: should initialize when:
  // - Not initialized yet (state?.initialized === false)
  // - Clean mode (wipe and reinstall)
  // - Repair mode (install missing components)
  // - Init-only mode (user explicitly wants init)
  const shouldInitialize =
    !state?.initialized ||     // Not initialized yet
    options.clean ||           // Clean reinstall
    options.repair ||          // Repair missing components
    options.initOnly;          // Explicit init request

  if (shouldInitialize) {
    console.log(chalk.cyan.bold('━━━ 🚀 Initializing Project\n'));

    // Import core init functions
    const {
      selectAndValidateTarget,
      previewDryRun,
      installComponents,
    } = await import('./init-core.js');

    try {
      // In repair mode, use existing target from state
      const targetForInit = options.repair && state?.target
        ? state.target
        : options.target;

      // Prepare init options
      const initOptions = {
        target: targetForInit, // Use existing target in repair mode
        verbose: options.verbose,
        dryRun: options.dryRun,
        clear: options.clean || false,
        mcp: options.mcp !== false,
        agents: options.agents !== false,
        rules: options.rules !== false,
        outputStyles: options.outputStyles !== false,
        slashCommands: options.slashCommands !== false,
        hooks: options.hooks !== false,
      };

      // Select and validate target (will use existing in repair mode, or prompt if needed)
      const targetId = await selectAndValidateTarget(initOptions);
      selectedTarget = targetId; // Save for later use

      // Dry run preview
      if (options.dryRun) {
        console.log(
          boxen(
            chalk.yellow('⚠ Dry Run Mode') + chalk.dim('\nNo changes will be made to your project'),
            {
              padding: 1,
              margin: { top: 0, bottom: 1, left: 0, right: 0 },
              borderStyle: 'round',
              borderColor: 'yellow',
            }
          )
        );

        await previewDryRun(targetId, initOptions);

        console.log(
          '\n' +
            boxen(chalk.green.bold('✓ Dry run complete'), {
              padding: { top: 0, bottom: 0, left: 2, right: 2 },
              margin: 0,
              borderStyle: 'round',
              borderColor: 'green',
            }) +
            '\n'
        );

        console.log(chalk.dim('✓ Initialization dry run complete\n'));
        // Don't return - continue to show execution command
      } else {
        // Actually install components
        const result = await installComponents(targetId, initOptions);

        console.log(chalk.green.bold('✓ Initialization complete\n'));
      }
    } catch (error) {
      console.error(chalk.red.bold('✗ Initialization failed:'), error);
      process.exit(1);
    }
  }

  // Step 4: Launch target (if not init-only)
  if (!options.initOnly) {
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
      allowSelection: false, // Target should already be selected during init
    });

    console.log(chalk.cyan.bold(`━━━ 🎯 Launching ${resolvedTarget}\n`));

    // Check if target supports command execution
    const { getTargetsWithCommandSupport } = await import('../config/targets.js');
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
      // Handle provider and agent selection for Claude Code
      const { SmartConfigService } = await import('../services/smart-config-service.js');

      // Check if API keys are configured, if not, run initial setup
      const { ConfigService } = await import('../services/config-service.js');
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

      // Setup environment with selected provider
      await SmartConfigService.setupEnvironment(runtimeChoices.provider!);

      // Use selected agent
      options.agent = runtimeChoices.agent;
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

    // Environment should already be set up by SmartConfigService in main flow
    // No need to setup again here

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
  } else {
    console.log(chalk.dim('✓ Init-only mode, skipping execution\n'));
  }
}

/**
 * Smart flow command
 */
export const flowCommand = new Command('flow')
  .description('Intelligent development flow (auto-detect state and act accordingly)')

  // Smart options
  .option('--init-only', 'Only initialize, do not run')
  .option('--run-only', 'Only run, skip initialization')
  .option('--clean', 'Clean all configurations and reinitialize')
  .option('--upgrade', 'Upgrade Sylphx Flow to latest version')
  .option('--upgrade-target', 'Upgrade target platform (Claude Code/OpenCode)')

  // Smart configuration options
  .option('--quick', 'Quick mode: use saved defaults and skip all prompts')
  .option('--select-provider', 'Prompt to select provider each run')
  .option('--select-agent', 'Prompt to select agent each run')
  .option('--use-defaults', 'Skip prompts, use saved defaults')
  .option('--provider <provider>', 'Override provider for this run (anthropic|z.ai|kimi)')

  // Init options
  .option('--target <type>', 'Target platform (opencode, claude-code, auto-detect)')
  .option('--verbose', 'Show detailed output')
  .option('--dry-run', 'Show what would be done without making changes')
  .option('--no-mcp', 'Skip MCP installation')
  .option('--no-agents', 'Skip agents installation')
  .option('--no-rules', 'Skip rules installation')
  .option('--no-output-styles', 'Skip output styles installation')
  .option('--no-slash-commands', 'Skip slash commands installation')
  .option('--no-hooks', 'Skip hooks setup')

  // Run options
  .option('--agent <name>', 'Agent to use (default: coder)', 'coder')
  .option('--agent-file <path>', 'Load agent from specific file')
  .option('-p, --print', 'Headless print mode (output only, no interactive)')
  .option('-c, --continue', 'Continue previous conversation (requires print mode)')

  // Prompt argument
  .argument('[prompt]', 'Prompt to execute with agent (optional, supports @file.txt for file input)')

  .action(async (prompt, options) => {
    await executeFlow(prompt, options);
  });

/**
 * Setup command - alias for `flow --init-only`
 * Kept for backward compatibility, but users should prefer `flow --init-only`
 */
export const setupCommand = new Command('setup')
  .description('Initialize project configuration (alias for: flow --init-only)')
  .action(async () => {
    console.log(chalk.yellow('ℹ  The "setup" command is deprecated.'));
    console.log(chalk.yellow('   Please use: flow --init-only\n'));

    showWelcome();

    // Initialize project with default target
    const { runInit } = await import('./init-command.js');
    await runInit({
      target: undefined, // Let user choose
      verbose: false,
      dryRun: false,
      clear: false,
      mcp: true,
      agents: true,
      rules: true,
      outputStyles: true,
      slashCommands: true,
      hooks: true,
      helpOption: () => {},
    });

    console.log(chalk.green('\n✅ Setup complete!'));
    console.log(chalk.dim('\nNext time, use: flow --init-only'));
  });

/**
 * Status command - show project status
 */
export const statusCommand = new Command('status')
  .description('Show project status and configuration')
  .option('--verbose', 'Show detailed information')
  .action(async (options) => {
    const detector = new StateDetector();
    const state = await detector.detect();

    showWelcome();
    await showStatus(state);

    // Show detailed info if verbose
    if (options.verbose) {
      console.log(chalk.cyan.bold('\n📋 详细信息\n'));

      // 配置文件内容
      try {
        const { getProjectSettingsFile } = await import('../config/constants.js');
        const configPath = path.join(process.cwd(), getProjectSettingsFile());
        const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
        console.log('配置文件:', JSON.stringify(config, null, 2));
      } catch {
        console.log('配置文件: 不存在');
      }
    }
  });

/**
 * Doctor command - diagnose and fix issues
 */
export const doctorCommand = new Command('doctor')
  .description('Diagnose and fix common issues')
  .option('--fix', 'Automatically fix issues')
  .option('--verbose', 'Show detailed diagnostics')
  .action(async (options) => {
    console.log(chalk.cyan.bold('🔍 诊断项目\n'));

    const detector = new StateDetector();
    const state = await detector.detect();

    let issuesFound = false;

    // Check 1: Claude Code installation
    console.log('检查 Claude Code 安装...');
    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);
      await execAsync('which claude');
      console.log(chalk.green('  ✓ Claude Code 已安装'));
    } catch {
      console.log(chalk.red('  ✗ Claude Code 未安装'));
      console.log(chalk.dim('    运行: npm install -g @anthropic-ai/claude-code'));
      issuesFound = true;
    }

    // Check 2: Configuration
    console.log('\n检查配置...');
    if (state.corrupted) {
      console.log(chalk.red('  ✗ 配置损坏'));
      issuesFound = true;

      if (options.fix) {
        console.log(chalk.yellow('  🔄 正在修复...'));
        // Run flow with clean flag
        const { executeFlow } = await import('./flow-command.js');
        await executeFlow(undefined, { clean: true });
        console.log(chalk.green('  ✓ 已修复'));
      }
    } else if (!state.initialized) {
      console.log(chalk.yellow('  ⚠ 项目未初始化'));
      issuesFound = true;
    } else {
      console.log(chalk.green('  ✓ 配置正常'));
    }

    // Check 3: Components
    console.log('\n检查组件...');
    Object.entries(state.components).forEach(([name, component]) => {
      const status = component.installed ? chalk.green('✓') : chalk.red('✗');
      const count = ('count' in component && component.count) ? ` (${component.count})` : '';
      console.log(`  ${status} ${name}${count}`);
    });

    // Summary
    console.log('\n' + chalk.bold('结果:'));
    if (!issuesFound) {
      console.log(chalk.green('✓ 所有检查通过'));
    } else if (options.fix) {
      console.log(chalk.green('✓ 所有问题已修复'));
    } else {
      console.log(chalk.yellow('⚠ 发现问题，运行加 --fix 参数自动修复'));
    }
  });

/**
 * Upgrade command - upgrade components
 */
export const upgradeCommand = new Command('upgrade')
  .description('Upgrade Sylphx Flow and components')
  .option('--check', 'Only check for updates, do not upgrade')
  .option('--components', 'Upgrade components (agents, rules, etc)', true)
  .option('--target', 'Upgrade target platform (Claude Code/OpenCode)')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    console.log(chalk.cyan.bold('📦 检查更新\n'));

    const detector = new StateDetector();
    const upgradeManager = new UpgradeManager();

    const updates = await upgradeManager.checkUpdates();

    if (!updates.flowUpdate && !updates.targetUpdate) {
      console.log(chalk.green('✓ 所有组件已是最新版本\n'));
      return;
    }

    if (updates.flowVersion) {
      console.log(`Sylphx Flow: ${updates.flowVersion.current} → ${chalk.green(updates.flowVersion.latest)}`);
    }

    if (updates.targetVersion) {
      console.log(`${updates.targetVersion.current ? 'claude-code' : 'target'}: ${updates.targetVersion.current} → ${chalk.green(updates.targetVersion.latest)}`);
    }

    // Check only
    if (options.check) {
      console.log('\n' + chalk.dim('使用 --no-check 或省略参数进行升级'));
      return;
    }

    // Confirm upgrade
    const { default: inquirer } = await import('inquirer');
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: '确认升级到最新版本?',
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(chalk.dim('\n升级已取消'));
      return;
    }

    // Perform upgrade
    console.log('');

    const state = await detector.detect();

    if (updates.flowUpdate) {
      console.log(chalk.cyan.bold('\n━ 升级 Sylphx Flow\n'));
      await upgradeManager.upgradeFlow(state);
    }

    if (updates.targetUpdate && options.target) {
      console.log(chalk.cyan.bold('\n━ 升级 Target\n'));
      await upgradeManager.upgradeTarget(state);
    }

    console.log(chalk.green('\n✓ 升级完成\n'));
  });

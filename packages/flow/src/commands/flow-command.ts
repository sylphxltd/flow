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
import { initCommand } from './init-command.js';
import { loadAgentContent, extractAgentInstructions } from './run-command.js';
import { ClaudeConfigService } from '../services/claude-config-service.js';
import { CONFIG_FILENAME } from '../config/constants.js';

export interface FlowOptions {
  target?: string;
  verbose?: boolean;
  dryRun?: boolean;
  clean?: boolean;
  initOnly?: boolean;
  runOnly?: boolean;
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
}

/**
 * Display welcome banner
 */
function showWelcome(): void {
  console.log(
    boxen(
      `${chalk.cyan.bold('Sylphx Flow')} ${chalk.dim('- AI-Powered Development Framework')}\n` +
      `${chalk.dim('自动初始化 • 智能升级 • 一键启动')}`,
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
  console.log(chalk.cyan.bold('📊 项目状态\n'));

  if (!state.initialized) {
    console.log('  ' + chalk.yellow('⚠  未初始化'));
  } else {
    console.log(`  ${chalk.green('✓')} 已初始化 (Flow v${state.version || '未知'})`);

    if (state.target) {
      const versionStr = state.targetVersion ? ` (v${state.targetVersion})` : '';
      console.log(`  ${chalk.green('✓')} 目标平台: ${state.target}${versionStr}`);
    }

    // 组件状态
    const components = state.components;
    console.log(`\n  ${chalk.cyan('组件状态:')}`);
    console.log(`    Agent: ${components.agents.installed ? chalk.green(`✓ ${components.agents.count}个`) : chalk.red('✗')}`);
    console.log(`    Rules: ${components.rules.installed ? chalk.green(`✓ ${components.rules.count}个`) : chalk.red('✗')}`);
    console.log(`    Hooks: ${components.hooks.installed ? chalk.green('✓') : chalk.red('✗')}`);
    console.log(`    MCP: ${components.mcp.installed ? chalk.green(`✓ ${components.mcp.serverCount}个服务器`) : chalk.red('✗')}`);
    console.log(`    输出样式: ${components.outputStyles.installed ? chalk.green('✓') : chalk.red('✗')}`);
    console.log(`    Slash命令: ${components.slashCommands.installed ? chalk.green(`✓ ${components.slashCommands.count}个`) : chalk.red('✗')}`);

    // 过时警告
    if (state.outdated) {
      console.log(`\n  ${chalk.yellow('⚠')} Flow 版本过时: ${state.version} → ${state.latestVersion}`);
    }

    if (state.targetVersion && state.targetLatestVersion &&
        isVersionOutdated(state.targetVersion, state.targetLatestVersion)) {
      console.log(`  ${chalk.yellow('⚠')} ${state.target} 有更新: v${state.targetVersion} → v${state.targetLatestVersion}`);
    }

    if (state.lastUpdated) {
      const days = Math.floor((Date.now() - state.lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 7) {
        console.log(`\n  ${chalk.yellow('⚠')} 上次更新: ${days}天前`);
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
 * Main flow execution logic
 */
export async function executeFlow(prompt: string | undefined, options: FlowOptions): Promise<void> {
  // Create detector and upgrade manager
  const detector = new StateDetector();
  const upgradeManager = new UpgradeManager();

  // Show welcome banner
  showWelcome();

  // Run status check
  if (options.verbose) {
    console.log(chalk.dim('🤔 正在检测项目状态...\n'));
  }

  const state = await detector.detect();

  if (options.verbose) {
    await showStatus(state);
  }

  // Step 0: Smart decision making
  if (!options.initOnly && !options.runOnly && !options.clean) {
    const action = detector.recommendAction(state);

    switch (action) {
      case 'FULL_INIT':
        console.log(chalk.cyan('🚀 检测到新项目，正在初始化...\n'));
        break;
      case 'REPAIR':
        console.log(chalk.yellow('⚠  检测到配置损坏，正在修复...\n'));
        options.clean = true;
        break;
      case 'UPGRADE':
        if (await UpgradeManager.isUpgradeAvailable()) {
          console.log(chalk.yellow(`📦 检测到更新: ${state.version} → ${state.latestVersion}\n`));
          const { default: inquirer } = await import('inquirer');
          const { upgrade } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'upgrade',
              message: '是否升级到最新版本?',
              default: true,
            },
          ]);
          if (upgrade) {
            options.upgrade = true;
          }
        }
        break;
      case 'UPGRADE_TARGET':
        console.log(chalk.yellow(`📦 ${state.target} 有更新可用\n`));
        const { default: inquirer } = await import('inquirer');
        const { upgradeTarget } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'upgradeTarget',
            message: `是否升级 ${state.target}?`,
            default: true,
          },
        ]);
        if (upgradeTarget) {
          options.upgradeTarget = true;
        }
        break;
    }
  }

  // Step 1: Upgrade (if requested)
  if (options.upgrade && state.outdated && state.latestVersion) {
    console.log(chalk.cyan.bold('━ 升级 Flow\n'));
    await upgradeManager.upgradeFlow(state);
    console.log('');
    // Re-detect after upgrade
    state.version = state.latestVersion;
    state.outdated = false;
  }

  // Step 2: Upgrade target (if requested)
  if (options.upgradeTarget && state.target) {
    console.log(chalk.cyan.bold(`━ 升级 ${state.target}\n`));
    await upgradeManager.upgradeTarget(state);
    console.log('');
  }

  // Step 3: Initialize (if needed and not run-only)
  if (!options.runOnly) {
    console.log(chalk.cyan.bold('━ 初始化项目\n'));

    const initOptions = {
      target: options.target || state.target || 'claude-code',
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
      await initCommand.action(initOptions);

      if (!options.dryRun) {
        console.log(chalk.green.bold('\n✓ 初始化完成\n'));
      } else {
        console.log(chalk.dim('\n✓ 模拟完成 - 跳过运行\n'));
        return;
      }
    } catch (error) {
      console.error(chalk.red.bold('\n✗ 初始化失败:'), error);
      process.exit(1);
    }
  }

  // Step 4: Run agent (if not init-only)
  if (!options.initOnly) {
    console.log(chalk.cyan.bold('━ 启动 Claude Code\n'));

    // Resolve target - for flow command, prioritize targets that support command execution
    const targetForResolution = options.target || state.target || 'claude-code';
    const resolvedTarget = await targetManager.resolveTarget({
      target: targetForResolution,
      allowSelection: false,
    });

    // 检查目标是否支持命令执行
    const { getTargetsWithCommandSupport } = await import('../config/targets.js');
    const supportedTargets = getTargetsWithCommandSupport().map(t => t.id);

    if (!supportedTargets.includes(resolvedTarget)) {
      console.log(chalk.red.bold('✗ 不支持的目标平台\n'));
      console.log(chalk.yellow(`目标 '${resolvedTarget}' 不支持执行 agent 命令。`));
      console.log(chalk.cyan(`支持的平台: ${supportedTargets.join(', ')}\n`));
      console.log(chalk.dim('提示: 使用 --target claude-code 指定 Claude Code 平台'));
      console.log(chalk.dim('例如: bun dev:flow --target claude-code\n'));
      process.exit(1);
    }

    // Claude Code 特殊处理 - 需要配置 provider 和 agent
    if (resolvedTarget === 'claude-code') {
      // 配置 provider (如果需要)
      await ClaudeConfigService.configureProvider(options.verbose);

      // 配置 agent (如果需要)
      const selectedAgent = await ClaudeConfigService.configureAgent(options.verbose);
      options.agent = selectedAgent;
    }

    const agent = options.agent || 'coder';
    const verbose = options.verbose || false;

    if (verbose || options.runOnly) {
      console.log(`🤖 Agent: ${agent}`);
      console.log(`🎯 Target: ${resolvedTarget}`);
      if (prompt) {
        console.log(`💬 Prompt: ${prompt}\n`);
      } else {
        console.log('💬 Interactive mode\n');
      }
    }

    // Load agent and prepare prompts
    const agentContent = await loadAgentContent(agent, options.agentFile);
    const agentInstructions = extractAgentInstructions(agentContent);
    const systemPrompt = `AGENT INSTRUCTIONS:\n${agentInstructions}`;

    const userPrompt = prompt?.trim() || '';

    // 如果目标是 Claude Code，设置环境变量
    if (resolvedTarget === 'claude-code') {
      await ClaudeConfigService.setupEnvironment(verbose);
    }

    // Run options
    const runOptions: RunCommandOptions = {
      target: resolvedTarget,
      verbose,
      dryRun: options.dryRun,
      agent,
      agentFile: options.agentFile,
      prompt,
    };

    try {
      await executeTargetCommand(resolvedTarget, systemPrompt, userPrompt, runOptions);
    } catch (error) {
      console.error(chalk.red.bold('\n✗ 启动失败:'), error);
      process.exit(1);
    }

    if (!options.dryRun) {
      console.log(chalk.dim('\n✓ Claude Code 已退出\n'));
    }
  } else {
    console.log(chalk.dim('\n✓ Init-only 模式，已跳过运行\n'));
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

  // Prompt argument
  .argument('[prompt]', 'Prompt to execute with agent (optional)')

  .action(async (prompt, options) => {
    await executeFlow(prompt, options);
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
        const configPath = path.join(process.cwd(), CONFIG_FILENAME);
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

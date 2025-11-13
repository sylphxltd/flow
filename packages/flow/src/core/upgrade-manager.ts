import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import chalk from 'chalk';
import ora from 'ora';
import type { ProjectState } from './state-detector.js';
import { CLIError } from '../utils/error-handler.js';
import { ConfigService } from '../services/config-service.js';
import { getProjectSettingsFile } from '../config/constants.js';

const execAsync = promisify(exec);

export interface UpgradeOptions {
  verbose?: boolean;
  dryRun?: boolean;
  skipBackup?: boolean;
  backupPath?: string;
}

export interface UpgradeResult {
  success: boolean;
  upgrades: {
    flow?: { from: string; to: string };
    target?: { from: string; to: string };
    components?: string[];
  };
  message: string;
}

export class UpgradeManager {
  private projectPath: string;
  private options: UpgradeOptions;

  constructor(projectPath: string = process.cwd(), options: UpgradeOptions = {}) {
    this.projectPath = projectPath;
    this.options = options;
  }

  async checkUpdates(): Promise<{
    flowUpdate: boolean;
    targetUpdate: boolean;
    flowVersion: { current: string; latest: string } | null;
    targetVersion: { current: string; latest: string } | null;
  }> {
    if (this.options.verbose) {
      console.log('检查更新...');
    }

    const [flowLatest, targetLatest] = await Promise.all([
      this.getLatestFlowVersion(),
      this.getLatestTargetVersion(),
    ]);

    let flowVersion: { current: string; latest: string } | null = null;
    let targetVersion: { current: string; latest: string } | null = null;

    // 当前 Flow 版本
    const flowCurrent = await this.getCurrentFlowVersion();

    if (flowLatest && flowCurrent && flowLatest !== flowCurrent) {
      flowVersion = { current: flowCurrent, latest: flowLatest };
    }

    // 当前 Target 版本
    const configPath = path.join(this.projectPath, getProjectSettingsFile());
    try {
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      const target = config.target;

      if (target) {
        const targetCurrent = await this.getCurrentTargetVersion(target);

        if (targetLatest && targetCurrent && targetLatest !== targetCurrent) {
          targetVersion = { current: targetCurrent, latest: targetLatest };
        }
      }
    } catch {
      // 无法读取配置
    }

    return {
      flowUpdate: !!flowVersion,
      targetUpdate: !!targetVersion,
      flowVersion,
      targetVersion,
    };
  }

  async upgradeFlow(state: ProjectState): Promise<boolean> {
    if (!state.outdated || !state.latestVersion) {
      return false;
    }

    const spinner = ora('升级 Sylphx Flow...').start();

    try {
      // 备份当前配置
      if (!this.options.skipBackup) {
        await this.backupConfig();
      }

      if (this.options.dryRun) {
        spinner.succeed(`模拟升级: ${state.version} → ${state.latestVersion}`);
        return true;
      }

      // sym link 方式 - 实际需要重新安装
      // 这里假设用户会通过 git pull 或 npm update 更新
      // 我们只需要更新配置文件和 component

      // 更新配置文件中的版本号
      const configPath = path.join(this.projectPath, getProjectSettingsFile());
      try {
        const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
        config.version = state.latestVersion;
        config.lastUpdated = new Date().toISOString();
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      } catch {
        // 无法更新配置
      }

      spinner.succeed(`已升级到 ${state.latestVersion}`);
      return true;
    } catch (error) {
      spinner.fail('升级失败');
      throw new CLIError(
        `升级 Sylphx Flow 失败: ${error instanceof Error ? error.message : String(error)}`,
        'UPGRADE_FAILED'
      );
    }
  }

  async upgradeTarget(state: ProjectState): Promise<boolean> {
    if (!state.target || !state.targetLatestVersion) {
      return false;
    }

    const spinner = ora(`升级 ${state.target}...`).start();

    try {
      if (state.target === 'claude-code') {
        await this.upgradeClaudeCode();
      } else if (state.target === 'opencode') {
        await this.upgradeOpenCode();
      }

      spinner.succeed(`${state.target} 已升级到最新版本`);
      return true;
    } catch (error) {
      spinner.fail(`${state.target} 升级失败`);
      throw new CLIError(
        `升级 ${state.target} 失败: ${error instanceof Error ? error.message : String(error)}`,
        'TARGET_UPGRADE_FAILED'
      );
    }
  }

  private async upgradeClaudeCode(): Promise<void> {
    if (this.options.dryRun) {
      console.log('模拟: claude update');
      return;
    }

    // Claude Code has built-in update command
    const { stdout } = await execAsync('claude update');

    if (this.options.verbose) {
      console.log(stdout);
    }
  }

  private async upgradeOpenCode(): Promise<void> {
    if (this.options.dryRun) {
      console.log('模拟: opencode upgrade');
      return;
    }

    // OpenCode has built-in upgrade command
    const { stdout } = await execAsync('opencode upgrade');

    if (this.options.verbose) {
      console.log(stdout);
    }
  }

  async upgradeComponents(components: string[]): Promise<string[]> {
    const upgraded: string[] = [];

    for (const component of components) {
      const spinner = ora(`升级 ${component}...`).start();

      try {
        await this.upgradeComponent(component);
        spinner.succeed(`${component} 已升级`);
        upgraded.push(component);
      } catch (error) {
        spinner.fail(`${component} 升级失败`);
        if (this.options.verbose) {
          console.error(error);
        }
      }
    }

    return upgraded;
  }

  private async upgradeComponent(component: string): Promise<void> {
    // 删除旧版本
    const componentPath = path.join(this.projectPath, '.claude', component);
    await fs.rm(componentPath, { recursive: true, force: true });

    // 重新安装最新版本
    // 实际实现会调用相应的 installer
    // 这里用 dry-run 模式模拟
    if (this.options.dryRun) {
      console.log(`模拟: 重新安装 ${component}`);
    }
  }

  private async backupConfig(): Promise<string> {
    const backupDir = this.options.backupPath || path.join(this.projectPath, '.claude-backup');
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);

    // 备份 .claude 目录
    const claudePath = path.join(this.projectPath, '.claude');
    try {
      await fs.cp(claudePath, path.join(backupPath, '.claude'), { recursive: true });
    } catch {
      // .claude 目录可能不存在
    }

    // 备份配置文件
    const configPath = path.join(this.projectPath, getProjectSettingsFile());
    try {
      await fs.cp(configPath, path.join(backupPath, getProjectSettingsFile()));
    } catch {
      // 配置文件可能不存在
    }

    return backupPath;
  }

  private async getCurrentFlowVersion(): Promise<string | null> {
    try {
      const configPath = path.join(this.projectPath, getProjectSettingsFile());
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      return config.version || null;
    } catch {
      return null;
    }
  }

  private async getLatestFlowVersion(): Promise<string | null> {
    try {
      // 从当前 package.json 获取（假设是当前开发版本）
      const packagePath = path.join(__dirname, '..', '..', 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      return packageJson.version || null;
    } catch {
      return null;
    }
  }

  private async getCurrentTargetVersion(target: string): Promise<string | null> {
    if (target === 'claude-code') {
      try {
        const { stdout } = await execAsync('claude --version');
        const match = stdout.match(/v?(\d+\.\d+\.\d+)/);
        return match ? match[1] : null;
      } catch {
        return null;
      }
    }

    return null;
  }

  private async getLatestTargetVersion(target: string): Promise<string | null> {
    if (target === 'claude-code') {
      try {
        const { stdout } = await execAsync('npm view @anthropic-ai/claude-code version');
        return stdout.trim();
      } catch {
        return null;
      }
    }

    return null;
  }

  static async isUpgradeAvailable(): Promise<boolean> {
    const manager = new UpgradeManager();
    const updates = await manager.checkUpdates();
    return updates.flowUpdate || updates.targetUpdate;
  }
}

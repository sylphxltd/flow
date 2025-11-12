import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectSettings } from '../utils/settings.js';
import { targetManager } from './target-manager.js';
import { CONFIG_FILENAME } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ProjectState {
  initialized: boolean;
  version: string | null;
  latestVersion: string | null;
  target: string | null;
  targetVersion: string | null;
  targetLatestVersion: string | null;
  components: {
    agents: { installed: boolean; count: number; version: string | null };
    rules: { installed: boolean; count: number; version: string | null };
    hooks: { installed: boolean; version: string | null };
    mcp: { installed: boolean; serverCount: number; version: string | null };
    outputStyles: { installed: boolean; version: string | null };
    slashCommands: { installed: boolean; count: number; version: string | null };
  };
  corrupted: boolean;
  outdated: boolean;
  lastUpdated: Date | null;
}

export type RecommendedAction = 'FULL_INIT' | 'RUN_ONLY' | 'REPAIR' | 'UPGRADE' | 'UPGRADE_TARGET' | 'CLEAN_INIT';

export class StateDetector {
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
  }

  async detect(): Promise<ProjectState> {
    const state: ProjectState = {
      initialized: false,
      version: null,
      latestVersion: await this.getLatestFlowVersion(),
      target: null,
      targetVersion: null,
      targetLatestVersion: null,
      components: {
        agents: { installed: false, count: 0, version: null },
        rules: { installed: false, count: 0, version: null },
        hooks: { installed: false, version: null },
        mcp: { installed: false, serverCount: 0, version: null },
        outputStyles: { installed: false, version: null },
        slashCommands: { installed: false, count: 0, version: null },
      },
      corrupted: false,
      outdated: false,
      lastUpdated: null,
    };

    try {
      // Check if initialized
      const configPath = path.join(this.projectPath, CONFIG_FILENAME);
      const configExists = await fs.access(configPath).then(() => true).catch(() => false);

      if (!configExists) {
        return state; // Not initialized
      }

      state.initialized = true;

      // Read config
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      state.version = config.version || null;
      state.target = config.target || null;
      state.lastUpdated = config.lastUpdated ? new Date(config.lastUpdated) : null;

      // Check if outdated
      if (state.version && state.latestVersion) {
        state.outdated = this.isVersionOutdated(state.version, state.latestVersion);
      }

      // Check components
      await this.checkComponent('agents', '.claude/agents', '*.md', state);
      await this.checkComponent('rules', '.claude/rules', '*.md', state);
      await this.checkComponent('hooks', '.claude/hooks', '*.js', state);
      await this.checkComponent('outputStyles', '.claude/output-styles', '*.md', state);
      await this.checkComponent('slashCommands', '.claude/commands', '*.md', state);

      // Check MCP
      const mcpConfig = await this.checkMCPConfig();
      state.components.mcp.installed = mcpConfig.exists;
      state.components.mcp.serverCount = mcpConfig.serverCount;
      state.components.mcp.version = mcpConfig.version;

      // Check target version
      if (state.target) {
        const targetInfo = await this.checkTargetVersion(state.target);
        state.targetVersion = targetInfo.version;
        state.targetLatestVersion = targetInfo.latestVersion;
      }

      // Check corruption
      state.corrupted = await this.checkCorruption(state);

    } catch (error) {
      state.corrupted = true;
    }

    return state;
  }

  recommendAction(state: ProjectState): RecommendedAction {
    if (!state.initialized) {
      return 'FULL_INIT';
    }

    if (state.corrupted) {
      return 'REPAIR';
    }

    if (state.outdated && state.version !== state.latestVersion) {
      return 'UPGRADE';
    }

    if (state.targetVersion && state.targetLatestVersion &&
        this.isVersionOutdated(state.targetVersion, state.targetLatestVersion)) {
      return 'UPGRADE_TARGET';
    }

    return 'RUN_ONLY';
  }

  async explainState(state: ProjectState): Promise<string[]> {
    const explanations: string[] = [];

    if (!state.initialized) {
      explanations.push('项目尚未初始化');
      explanations.push('运行 `bun dev:flow` 开始初始化');
      return explanations;
    }

    if (state.corrupted) {
      explanations.push('检测到配置损坏');
      explanations.push('运行 `bun dev:flow --clean` 修复');
      return explanations;
    }

    if (state.outdated) {
      explanations.push(`Flow 版本过时: ${state.version} → ${state.latestVersion}`);
      explanations.push('运行 `bun dev:flow upgrade` 升级');
    }

    if (state.targetVersion && state.targetLatestVersion &&
        this.isVersionOutdated(state.targetVersion, state.targetLatestVersion)) {
      explanations.push(`${state.target} 有更新可用`);
      explanations.push(`运行 ​​​bun dev:flow upgrade-target 升级`);
    }

    // Check components
    Object.entries(state.components).forEach(([name, component]) => {
      if (!component.installed) {
        explanations.push(`缺少 ${name}`);
      }
    });

    if (explanations.length === 0) {
      explanations.push('项目状态正常');
      explanations.push('运行 `bun dev:flow` 启动 Claude Code');
    }

    return explanations;
  }

  private async getLatestFlowVersion(): Promise<string | null> {
    try {
      // 从 package.json 获取当前版本
      const packagePath = path.join(__dirname, '..', '..', 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      return packageJson.version || null;
    } catch {
      return null;
    }
  }

  private async checkComponent(
    componentName: keyof ProjectState['components'],
    componentPath: string,
    pattern: string,
    state: ProjectState
  ): Promise<void> {
    try {
      const fullPath = path.join(this.projectPath, componentPath);
      const exists = await fs.access(fullPath).then(() => true).catch(() => false);

      state.components[componentName].installed = exists;

      if (exists) {
        // 计算文件数量
        const files = await fs.readdir(fullPath).catch(() => []);
        const count = pattern === '*.js' ? files.filter(f => f.endsWith('.js')).length :
                     pattern === '*.md' ? files.filter(f => f.endsWith('.md')).length : files.length;

        if (componentName === 'agents' || componentName === 'slashCommands' || componentName === 'rules') {
          state.components[componentName].count = count;
        }

        // 这里可以读取版本信息（如果保存了的话）
        const versionPath = path.join(fullPath, '.version');
        const versionExists = await fs.access(versionPath).then(() => true).catch(() => false);
        if (versionExists) {
          state.components[componentName].version = await fs.readFile(versionPath, 'utf-8');
        }
      }
    } catch {
      state.components[componentName].installed = false;
    }
  }

  private async checkMCPConfig(): Promise<{ exists: boolean; serverCount: number; version: string | null }> {
    try {
      const mcpPath = path.join(this.projectPath, '.mcp.json');
      const exists = await fs.access(mcpPath).then(() => true).catch(() => false);

      if (!exists) {
        return { exists: false, serverCount: 0, version: null };
      }

      const content = JSON.parse(await fs.readFile(mcpPath, 'utf-8'));
      const servers = content.mcpServers || {};

      return {
        exists: true,
        serverCount: Object.keys(servers).length,
        version: content.version || null,
      };
    } catch {
      return { exists: false, serverCount: 0, version: null };
    }
  }

  private async checkTargetVersion(target: string): Promise<{ version: string | null; latestVersion: string | null }> {
    try {
      // 这里可以检查目标平台的版本
      // 例如检查 claude CLI 版本或 opencode 版本
      if (target === 'claude-code') {
        // 检查 claude --version
        const { exec } = await import('node:child_process');
        const { promisify } = await import('node:util');
        const execAsync = promisify(exec);

        try {
          const { stdout } = await execAsync('claude --version');
          // 解析版本号
          const match = stdout.match(/v?(\d+\.\d+\.\d+)/);
          return {
            version: match ? match[1] : null,
            latestVersion: await this.getLatestClaudeVersion(),
          };
        } catch {
          return { version: null, latestVersion: null };
        }
      }

      return { version: null, latestVersion: null };
    } catch {
      return { version: null, latestVersion: null };
    }
  }

  private async getLatestClaudeVersion(): Promise<string | null> {
    // 可以从 npm 或官方网站获取最新版本
    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('npm view @anthropic-ai/claude-code version');
      return stdout.trim();
    } catch {
      return null;
    }
  }

  private async checkCorruption(state: ProjectState): Promise<boolean> {
    // 检查是否存在矛盾的状态
    if (state.initialized && !state.target) {
      return true; // 初始化咗但冇 target
    }

    // 检查必需组件
    if (state.initialized && !state.components.agents.installed) {
      return true; // 初始化咗但冇 agents
    }

    return false;
  }

  private isVersionOutdated(current: string, latest: string): boolean {
    try {
      return this.compareVersions(current, latest) < 0;
    } catch {
      return false;
    }
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
      if (parts1[i] !== parts2[i]) {
        return parts1[i] - parts2[i];
      }
    }

    return parts1.length - parts2.length;
  }
}

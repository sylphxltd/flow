/**
 * Configuration service - handles layered configuration loading
 * Priority: local > project > home
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  CONFIG_DIR,
  USER_SETTINGS_FILE,
  getProjectSettingsFile,
  getProjectLocalSettingsFile
} from '../config/constants.js';

/**
 * User configuration (sensitive data, saved to home directory)
 * This is set up once and reused across projects
 */
export interface UserSettings {
  claudeProvider?: string;
  claudeProviderConfig?: {
    ANTHROPIC_BASE_URL: string;
    description: string;
  };
  claudeApiKey?: string;

  // API keys for providers
  apiKeys?: {
    kimi?: string;     // Kimi provider
    'z.ai'?: string;   // Z.ai proxy
  };

  // User preferences (can be changed anytime)
  defaultProvider?: string;
  defaultAgent?: string;
  hasCompletedSetup?: boolean;

  [key: string]: unknown;
}

/**
 * Project configuration (shareable, saved to project directory)
 */
export interface ProjectSettings {
  target?: string;
  version?: string;
  defaultAgent?: string;  // Can override user default per project

  [key: string]: unknown;
}

/**
 * Runtime choices (temporary, not saved)
 * These are selected each run but can be overridden by CLI flags
 */
export interface RuntimeChoices {
  provider?: string;  // Selected for this run
  agent?: string;     // Selected for this run
  prompt?: string;    // User prompt for this run

  [key: string]: unknown;
}

export class ConfigService {
  /**
   * Load complete configuration (user + project + local)
   */
  static async loadConfiguration(cwd: string = process.cwd()): Promise<{
    user: UserSettings;
    project: ProjectSettings;
    choices: RuntimeChoices;
  }> {
    const userSettings = await this.loadHomeSettings();
    const projectSettings = await this.loadProjectSettings(cwd);
    const localSettings = await this.loadLocalSettings(cwd);

    // Runtime choices merge: local > project > user defaults
    const choices: RuntimeChoices = {
      provider: localSettings.provider || userSettings.defaultProvider,
      agent: localSettings.agent || projectSettings.defaultAgent || userSettings.defaultAgent,
    };

    return {
      user: userSettings,
      project: projectSettings,
      choices,
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  static async loadSettings(cwd: string = process.cwd()): Promise<any> {
    const config = await this.loadConfiguration(cwd);
    return {
      ...config.user,
      ...config.project,
      ...config.choices,
    };
  }

  /**
   * Load user global settings (mainly for API keys)
   */
  static async loadHomeSettings(): Promise<UserSettings> {
    try {
      const content = await fs.readFile(USER_SETTINGS_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  /**
   * Save user global settings
   */
  static async saveHomeSettings(settings: UserSettings): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(USER_SETTINGS_FILE.replace('/settings.json', ''), { recursive: true });

    // Merge with existing settings and save
    const existing = await this.loadHomeSettings();
    const merged = { ...existing, ...settings };
    await fs.writeFile(USER_SETTINGS_FILE, JSON.stringify(merged, null, 2) + '\n');
  }

  /**
   * Check if user has completed initial setup (API keys configured)
   */
  static async hasInitialSetup(): Promise<boolean> {
    const userSettings = await this.loadHomeSettings();
    // Check if user has completed setup (either has API keys OR has explicitly chosen default)
    return !!(userSettings.hasCompletedSetup || (userSettings.apiKeys && Object.keys(userSettings.apiKeys).length > 0));
  }

  /**
   * Get available providers (those with API keys configured)
   * Always includes 'default' (no override)
   */
  static getAvailableProviders(userSettings: UserSettings): string[] {
    const providers: string[] = ['default']; // Always available
    if (userSettings.apiKeys?.kimi) providers.push('kimi');
    if (userSettings.apiKeys?.['z.ai']) providers.push('z.ai');
    return providers;
  }

  /**
   * Load project-level settings
   */
  static async loadProjectSettings(cwd: string = process.cwd()): Promise<ProjectSettings> {
    try {
      const configPath = getProjectSettingsFile(cwd);
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  /**
   * Save project-level settings
   */
  static async saveProjectSettings(settings: ProjectSettings, cwd: string = process.cwd()): Promise<void> {
    // Ensure directory exists
    const configDir = path.join(cwd, CONFIG_DIR);
    await fs.mkdir(configDir, { recursive: true });

    // Merge with existing settings and save
    const existing = await this.loadProjectSettings(cwd);
    const merged = { ...existing, ...settings };

    const configPath = getProjectSettingsFile(cwd);
    await fs.writeFile(configPath, JSON.stringify(merged, null, 2) + '\n');
  }

  /**
   * Load project-local settings (overrides everything)
   */
  static async loadLocalSettings(cwd: string = process.cwd()): Promise<RuntimeChoices> {
    try {
      const configPath = getProjectLocalSettingsFile(cwd);
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  /**
   * Save project-local settings
   */
  static async saveLocalSettings(settings: RuntimeChoices, cwd: string = process.cwd()): Promise<void> {
    // Ensure directory exists
    const configDir = path.join(cwd, CONFIG_DIR);
    await fs.mkdir(configDir, { recursive: true });

    const configPath = getProjectLocalSettingsFile(cwd);
    await fs.writeFile(configPath, JSON.stringify(settings, null, 2) + '\n');
  }

  /**
   * Convenient method: save Claude configuration (API keys to home, other settings to project)
   */
  static async saveClaudeConfig(
    projectConfig: ProjectSettings,
    userConfig: UserSettings,
    cwd: string = process.cwd()
  ): Promise<void> {
    // Save API keys to home directory
    if (userConfig.claudeApiKey || userConfig.claudeProvider || userConfig.claudeProviderConfig) {
      await this.saveHomeSettings(userConfig);
    }

    // Save other settings to project
    await this.saveProjectSettings(projectConfig, cwd);

    // Create .gitignore pattern file if it doesn't exist (excluding .local.json)
    await this.addGitignore(cwd);
  }

  /**
   * Add .sylphx-flow/ to .gitignore with proper patterns
   */
  private static async addGitignore(cwd: string): Promise<void> {
    const gitignorePath = path.join(cwd, '.gitignore');
    const patterns = [
      '',
      '# Sylphx Flow - local settings (never commit)',
      '.sylphx-flow/*.local.json',
    ];

    try {
      const content = await fs.readFile(gitignorePath, 'utf-8');

      // Check if pattern already exists
      if (!content.includes('.sylphx-flow/*.local.json')) {
        await fs.appendFile(gitignorePath, patterns.join('\n') + '\n');
      }
    } catch {
      // .gitignore doesn't exist - create it
      await fs.writeFile(gitignorePath, patterns.join('\n').trim() + '\n');
    }
  }

  /**
   * Check if config directory exists
   */
  static async isInitialized(cwd: string = process.cwd()): Promise<boolean> {
    try {
      const configDir = path.join(cwd, CONFIG_DIR);
      await fs.access(configDir);
      return true;
    } catch {
      return false;
    }
  }
}

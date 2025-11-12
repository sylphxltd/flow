import fs from 'node:fs/promises';
import path from 'node:path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { CONFIG_FILENAME } from '../config/constants.js';

export interface ClaudeConfig {
  claudeProvider?: string;
  claudeProviderConfig?: {
    ANTHROPIC_BASE_URL: string;
    description: string;
  };
  claudeApiKey?: string;
  defaultAgent?: string;
}

export class ClaudeConfigService {
  private static readonly CONFIG_PATH = path.join(process.cwd(), CONFIG_FILENAME);

  /**
   * Load Claude configuration from file
   */
  static async loadConfig(): Promise<ClaudeConfig> {
    try {
      const content = await fs.readFile(this.CONFIG_PATH, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  /**
   * Save Claude configuration to file
   */
  static async saveConfig(config: ClaudeConfig): Promise<void> {
    // Merge with existing config
    const existingConfig = await this.loadConfig();
    const mergedConfig = { ...existingConfig, ...config };

    await fs.writeFile(this.CONFIG_PATH, JSON.stringify(mergedConfig, null, 2));
  }

  /**
   * Configure provider interactively
   */
  static async configureProvider(verbose: boolean = false): Promise<ClaudeConfig> {
    const config = await this.loadConfig();

    if (!config.claudeProvider || verbose) {
      console.log(chalk.cyan('📋 Claude Code 配置\n'));

      const providerAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: '选择 Claude API Provider:',
          choices: [
            { name: 'Anthropic (官方)', value: 'anthropic' },
            { name: 'Z.ai (推荐)', value: 'z.ai' },
            { name: 'Kimi', value: 'kimi' },
          ],
          default: config.claudeProvider || 'z.ai',
        },
      ]);

      // Ask for API Key
      const keyAnswer = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: `输入 ${providerAnswer.provider} 的 API Key:`,
          mask: '*',
          validate: (input) => input.length > 10 || 'API Key 似乎太短',
        },
      ]);

      // Provider configurations
      const providerEnvs = {
        'anthropic': {
          ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
          description: 'Anthropic 官方 API',
        },
        'z.ai': {
          ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
          description: 'Z.ai 代理',
        },
        'kimi': {
          ANTHROPIC_BASE_URL: 'https://api.kimi.com/coding/',
          description: 'Kimi 代理',
        },
      };

      const providerConfig = providerEnvs[providerAnswer.provider as keyof typeof providerEnvs];

      const updatedConfig: ClaudeConfig = {
        ...config,
        claudeProvider: providerAnswer.provider,
        claudeProviderConfig: providerConfig,
        claudeApiKey: keyAnswer.apiKey,
      };

      await this.saveConfig(updatedConfig);

      console.log(chalk.green(`✓ 配置已保存到 ${CONFIG_FILENAME}\n`));
      console.log(chalk.dim(`  Provider: ${providerConfig.description}`));
      console.log(chalk.dim(`  API Key: ${keyAnswer.apiKey.slice(0, 5)}...${keyAnswer.apiKey.slice(-4)}\n`));

      return updatedConfig;
    }

    return config;
  }

  /**
   * Configure agent interactively
   */
  static async configureAgent(verbose: boolean = false): Promise<string> {
    const config = await this.loadConfig();

    if (!config.defaultAgent || verbose) {
      const agentAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'agent',
          message: '选择默认 Agent:',
          choices: [
            { name: 'Coder - 写代码、修bug', value: 'coder' },
            { name: 'Reviewer - Code review', value: 'reviewer' },
            { name: 'Tester - 写测试', value: 'tester' },
            { name: 'Planner - 项目规划', value: 'planner' },
          ],
          default: config.defaultAgent || 'coder',
        },
      ]);

      config.defaultAgent = agentAnswer.agent;
      await this.saveConfig(config);

      console.log(chalk.green(`✓ Agent 已设置为: ${agentAnswer.agent}\n`));

      return agentAnswer.agent;
    }

    return config.defaultAgent;
  }

  /**
   * Setup environment variables for Claude Code
   */
  static async setupEnvironment(verbose: boolean = false): Promise<void> {
    const config = await this.loadConfig();

    if (!config.claudeProviderConfig) {
      throw new Error('Provider not configured. Run configureProvider() first.');
    }

    // Set environment variables
    process.env.ANTHROPIC_BASE_URL = config.claudeProviderConfig.ANTHROPIC_BASE_URL;

    if (config.claudeApiKey) {
      process.env.ANTHROPIC_API_KEY = config.claudeApiKey;

      if (verbose) {
        console.log(chalk.dim(`  Provider: ${config.claudeProviderConfig.description}`));
        console.log(chalk.dim(`  API Key: ${config.claudeApiKey.slice(0, 5)}...${config.claudeApiKey.slice(-4)}\n`));
      }
    }
  }

  /**
   * Get the default agent
   */
  static async getDefaultAgent(): Promise<string> {
    const config = await this.loadConfig();
    return config.defaultAgent || 'coder';
  }
}

/**
 * Claude Configuration Service
 * Handles Claude Code provider configuration with layered settings
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { ConfigService } from './config-service.js';
import { loadAllAgents } from '../core/agent-loader.js';

export interface ClaudeConfig {
  claudeProvider?: string;
  claudeProviderConfig?: {
    ANTHROPIC_BASE_URL: string;
    description: string;
  };
  claudeApiKey?: string;
  defaultAgent?: string;
  target?: string;
}

export class ClaudeConfigService {
  /**
   * Load layered Claude configuration from all sources
   */
  static async loadConfig(): Promise<ClaudeConfig> {
    // API keys are in home directory
    const userSettings = await ConfigService.loadHomeSettings();

    // Other settings are in project directory
    const projectSettings = await ConfigService.loadProjectSettings();

    // Merge with project settings taking precedence over home (except API key)
    const merged = {
      claudeProvider: userSettings.claudeProvider || projectSettings.claudeProvider,
      claudeProviderConfig: userSettings.claudeProviderConfig || projectSettings.claudeProviderConfig,
      claudeApiKey: userSettings.claudeApiKey,
      defaultAgent: projectSettings.defaultAgent,
      target: projectSettings.target,
    };

    // Local settings have highest priority for everything except API key
    const localSettings = await ConfigService.loadLocalSettings();

    return {
      ...merged,
      ...localSettings,
      // Keep API key from user settings
      claudeApiKey: merged.claudeApiKey,
    };
  }

  /**
   * Save user-specific config (API keys to home, project settings to project)
   */
  static async saveConfig(config: ClaudeConfig): Promise<void> {
    // Separate user-specific settings (API keys)
    const userSettings = {
      claudeApiKey: config.claudeApiKey,
      claudeProvider: config.claudeProvider,
      claudeProviderConfig: config.claudeProviderConfig,
    };

    // Other settings go to project (shareable)
    const projectSettings = {
      claudeProvider: config.claudeProvider,
      defaultAgent: config.defaultAgent,
      target: config.target,
    };

    // Save API keys to home directory (never commit)
    if (userSettings.claudeApiKey) {
      await ConfigService.saveHomeSettings(userSettings);
    }

    // Save project settings
    await ConfigService.saveProjectSettings(projectSettings);
  }

  /**
   * Configure Claude provider interactively - saves API keys to home dir
   */
  static async configureProvider(verbose: boolean = false): Promise<ClaudeConfig> {
    const config = await this.loadConfig();

    // Check if we already have API key configured
    if (!config.claudeApiKey || !config.claudeProvider || verbose) {
      console.log(chalk.cyan('📋 Claude Code Configuration\n'));

      const providerAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Select Claude API Provider:',
          choices: [
            { name: 'Anthropic (Official)', value: 'anthropic' },
            { name: 'Z.ai (Recommended)', value: 'z.ai' },
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
          message: `Enter API Key for ${providerAnswer.provider}:`,
          mask: '*',
          validate: (input) => input.length > 10 || 'API Key appears too short',
        },
      ]);

      // Provider configurations
      const providerEnvs = {
        'anthropic': {
          ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
          description: 'Anthropic Official API',
        },
        'z.ai': {
          ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
          description: 'Z.ai Proxy',
        },
        'kimi': {
          ANTHROPIC_BASE_URL: 'https://api.kimi.com/coding/',
          description: 'Kimi Proxy',
        },
      };

      const providerConfig = providerEnvs[providerAnswer.provider as keyof typeof providerEnvs];

      // Save API keys to home directory (never commit)
      await ConfigService.saveHomeSettings({
        claudeProvider: providerAnswer.provider,
        claudeProviderConfig: providerConfig,
        claudeApiKey: keyAnswer.apiKey,
      });

      console.log(chalk.green(`✓ API Key saved to ~/.sylphx-flow/settings.json (secure)\n`));
      console.log(chalk.dim(`  Provider: ${providerConfig.description}`));
      console.log(chalk.dim(`  API Key: ${keyAnswer.apiKey.slice(0, 5)}...${keyAnswer.apiKey.slice(-4)}\n`));

      // Update config for return
      config.claudeProvider = providerAnswer.provider;
      config.claudeProviderConfig = providerConfig;
      config.claudeApiKey = keyAnswer.apiKey;

      return config;
    }

    if (verbose) {
      console.log(chalk.green('✓ Claude provider already configured\n'));
      console.log(chalk.dim(`  Provider: ${config.claudeProviderConfig?.description}\n`));
    }

    return config;
  }

  /**
   * Configure agent interactively - saves to project config (shareable)
   * Dynamically loads available agents instead of hardcoded list
   */
  static async configureAgent(verbose: boolean = false): Promise<string> {
    const config = await this.loadConfig();

    if (!config.defaultAgent || verbose) {
      try {
        // Dynamically load all available agents
        const agents = await loadAllAgents(process.cwd());

        if (agents.length === 0) {
          console.log(chalk.yellow('⚠ No agents found. Defaulting to "coder".\n'));
          const defaultAgent = 'coder';
          await ConfigService.saveProjectSettings({
            defaultAgent,
          });
          return defaultAgent;
        }

        // Create choices from dynamically loaded agents
        const choices = agents.map(agent => ({
          name: agent.metadata.name || agent.id,
          value: agent.id,
        }));

        const agentAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'agent',
            message: 'Select default Agent:',
            choices,
            default: config.defaultAgent || (agents.find(a => a.id === 'coder')?.id || agents[0].id),
          },
        ]);

        // Save to project-level config (shareable)
        await ConfigService.saveProjectSettings({
          defaultAgent: agentAnswer.agent,
        });

        const selectedAgent = agents.find(a => a.id === agentAnswer.agent);
        const displayName = selectedAgent?.metadata.name || agentAnswer.agent;
        console.log(chalk.green(`✓ Agent set to: ${displayName}\n`));

        return agentAnswer.agent;
      } catch (error) {
        console.log(chalk.yellow('⚠ Failed to load agents. Defaulting to "coder".\n'));
        console.error(error);

        const defaultAgent = 'coder';
        await ConfigService.saveProjectSettings({
          defaultAgent,
        });
        return defaultAgent;
      }
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

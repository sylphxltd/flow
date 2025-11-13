/**
 * Smart Configuration Service
 * Handles intelligent provider and agent selection with user preferences
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { ConfigService, UserSettings, RuntimeChoices } from './config-service.js';
import { loadAllAgents } from '../core/agent-loader.js';

export interface SmartConfigOptions {
  selectProvider?: boolean;
  selectAgent?: boolean;
  useDefaults?: boolean;
  provider?: string;
  agent?: string;
}

export class SmartConfigService {
  /**
   * Initial setup - configure API keys once
   */
  static async initialSetup(): Promise<void> {
    console.log(chalk.cyan('🔑 Initial Setup - Configure API Keys (one-time)\n'));

    const userSettings = await ConfigService.loadHomeSettings();
    const apiKeys = userSettings.apiKeys || {};

    // Configure providers
    const providers = [
      { id: 'kimi', name: 'Kimi', hasKey: !!apiKeys.kimi },
      { id: 'z.ai', name: 'Z.ai (Recommended)', hasKey: !!apiKeys['z.ai'] },
    ];

    const missingProviders = providers.filter(p => !p.hasKey);
    const existingProviders = providers.filter(p => p.hasKey);

    // Ask which providers to configure
    console.log(chalk.cyan('Available providers:'));
    console.log(chalk.dim('  • Default (Claude Code\'s own configuration)'));
    providers.forEach(p => {
      const status = p.hasKey ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} ${p.name}`);
    });
    console.log('');

    const { selectedProvider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedProvider',
        message: 'Select provider:',
        choices: [
          {
            name: 'Default (Use Claude Code configuration)',
            value: 'default',
          },
          {
            name: 'Kimi',
            value: 'kimi',
          },
          {
            name: 'Z.ai (Recommended)',
            value: 'z.ai',
          },
        ],
      },
    ]);

    if (selectedProvider !== 'default') {
      await this.configureSelectedProviders([selectedProvider], apiKeys);
    } else {
      console.log(chalk.dim('Using Claude Code default configuration.'));
    }

    if (existingProviders.length > 0) {
      console.log(chalk.green('✅ Already configured:'));
      existingProviders.forEach(p => {
        console.log(chalk.dim(`  • ${p.name}`));
      });
      console.log('');
    }

    // Set up default preferences
    await this.setupDefaultPreferences();

    // Mark setup as completed
    await ConfigService.saveHomeSettings({ hasCompletedSetup: true });
  }

  /**
   * Configure selected providers
   */
  private static async configureSelectedProviders(
    selectedProviders: string[],
    existingApiKeys: any
  ): Promise<void> {
    for (const providerId of selectedProviders) {
      const providerName = providerId === 'kimi' ? 'Kimi' : 'Z.ai';
      console.log(chalk.cyan(`\n📋 Configure ${providerName}\n`));

      const { apiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: `Enter API Key for ${providerName}:`,
          mask: '*',
          validate: (input) => input.length > 10 || 'API Key appears too short',
        },
      ]);

      existingApiKeys[providerId] = apiKey;
      console.log(chalk.green(`✓ API Key configured for ${providerName}`));
    }

    // Save all API keys
    await ConfigService.saveHomeSettings({ apiKeys: existingApiKeys });
  }

  /**
   * Setup default preferences
   */
  private static async setupDefaultPreferences(): Promise<void> {
    console.log(chalk.cyan('⚙️  Setup Default Preferences\n'));

    const userSettings = await ConfigService.loadHomeSettings();
    const availableProviders = ConfigService.getAvailableProviders(userSettings);

    if (availableProviders.length === 0) {
      console.log(chalk.yellow('⚠  No API keys configured yet. Skipping preferences setup.'));
      return;
    }

    const { setupDefaults } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'setupDefaults',
        message: 'Set up default preferences?',
        default: true,
      },
    ]);

    if (!setupDefaults) {
      console.log(chalk.dim('Skipping preferences setup.'));
      return;
    }

    // Select default provider
    if (availableProviders.length > 1) {
      const { defaultProvider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'defaultProvider',
          message: 'Select default provider:',
          choices: availableProviders.map(p => ({
            name: p.charAt(0).toUpperCase() + p.slice(1),
            value: p,
          })),
          default: userSettings.defaultProvider || availableProviders[0],
        },
      ]);

      userSettings.defaultProvider = defaultProvider;
    }

    // Set default agent (will use dynamic loading)
    const { useDefaultAgent } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useDefaultAgent',
        message: 'Set default agent?',
        default: true,
      },
    ]);

    if (useDefaultAgent) {
      try {
        const agents = await loadAllAgents(process.cwd());
        if (agents.length > 0) {
          const { defaultAgent } = await inquirer.prompt([
            {
              type: 'list',
              name: 'defaultAgent',
              message: 'Select default agent:',
              choices: agents.map(a => ({
                name: a.metadata.name || a.id,
                value: a.id,
              })),
              default: userSettings.defaultAgent || (agents.find(a => a.id === 'coder')?.id || agents[0].id),
            },
          ]);

          userSettings.defaultAgent = defaultAgent;
        }
      } catch (error) {
        console.log(chalk.yellow('⚠  Could not load agents, using "coder" as default'));
        userSettings.defaultAgent = 'coder';
      }
    }

    await ConfigService.saveHomeSettings(userSettings);
    console.log(chalk.green('✓ Default preferences saved'));
  }

  /**
   * Runtime selection - choose provider and agent for this run
   */
  static async selectRuntimeChoices(options: SmartConfigOptions): Promise<RuntimeChoices> {
    const config = await ConfigService.loadConfiguration();
    const choices: RuntimeChoices = {};

    // Handle provider selection
    if (options.provider) {
      choices.provider = options.provider;
    } else if (options.selectProvider || !config.choices.provider) {
      choices.provider = await this.selectProvider(config.user);
    } else {
      choices.provider = config.choices.provider;
    }

    // Handle agent selection
    if (options.agent) {
      choices.agent = options.agent;
    } else if (options.useDefaults && config.choices.agent) {
      // Use saved default agent when --use-defaults flag is set
      choices.agent = config.choices.agent;
      console.log(chalk.dim(`Using default agent: ${choices.agent}`));
    } else {
      // Always prompt for agent selection unless explicitly skipped
      choices.agent = await this.selectAgent();
    }

    return choices;
  }

  /**
   * Select provider for this run
   */
  private static async selectProvider(userSettings: UserSettings): Promise<string> {
    // Get available providers (already includes 'default')
    const availableProviders = ConfigService.getAvailableProviders(userSettings);

    if (availableProviders.length === 1) {
      const provider = availableProviders[0];
      console.log(chalk.dim(`Using provider: ${provider}`));
      return provider;
    }

    const { provider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select provider (use arrow keys, Enter for default):',
        choices: availableProviders.map(p => ({
          name: p === 'default' ? 'Default (Claude Code configuration)' : p.charAt(0).toUpperCase() + p.slice(1),
          value: p,
        })),
        default: userSettings.defaultProvider || 'default', // Claude Code default
      },
    ]);

    return provider;
  }

  /**
   * Select agent for this run
   */
  private static async selectAgent(): Promise<string> {
    try {
      const agents = await loadAllAgents(process.cwd());

      if (agents.length === 0) {
        console.log(chalk.yellow('⚠  No agents found, using "coder"'));
        return 'coder';
      }

      const { agent } = await inquirer.prompt([
        {
          type: 'list',
          name: 'agent',
          message: 'Select agent (use arrow keys, Enter for default):',
          choices: agents.map(a => ({
            name: a.metadata.name || a.id,
            value: a.id,
          })),
          default: agents.find(a => a.id === 'coder')?.id || agents[0].id,
        },
      ]);

      return agent;
    } catch (error) {
      console.log(chalk.yellow('⚠  Could not load agents, using "coder"'));
      return 'coder';
    }
  }

  /**
   * Setup environment variables based on runtime choices
   */
  static async setupEnvironment(provider: string): Promise<void> {
    const userSettings = await ConfigService.loadHomeSettings();
    const apiKeys = userSettings.apiKeys || {};

    if (provider !== 'default' && !apiKeys[provider]) {
      throw new Error(`No API key configured for provider: ${provider}`);
    }

    const providerConfigs = {
      default: {
        description: 'Default (No Override)',
      },
      kimi: {
        ANTHROPIC_BASE_URL: 'https://api.kimi.com/coding/',
        description: 'Kimi',
      },
      'z.ai': {
        ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
        description: 'Z.ai Proxy',
      },
    };

    // Setup environment based on provider
    if (provider === 'default') {
      // Don't override anything - use user's existing Claude Code configuration
      console.log(chalk.dim('Using Claude Code default configuration'));
      return;
    }

    const config = providerConfigs[provider as keyof typeof providerConfigs];
    process.env.ANTHROPIC_BASE_URL = config.ANTHROPIC_BASE_URL;
    process.env.ANTHROPIC_API_KEY = apiKeys[provider];
  }
}

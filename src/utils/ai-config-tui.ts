/**
 * AI Configuration TUI
 * Interactive terminal UI for setting up AI providers and models
 * Like OpenCode + Claude Code configuration combined
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  AI_PROVIDERS,
  type AIConfig,
  getConfiguredProviders,
  loadAIConfig,
  saveAIConfig,
  type ProviderId,
} from '../config/ai-config.js';

/**
 * Main configuration TUI
 */
export async function configureAI(cwd: string = process.cwd()): Promise<void> {
  console.clear();
  console.log(chalk.cyan.bold('🤖 AI Configuration\n'));
  console.log(chalk.dim('Configure your AI providers and models'));
  console.log(chalk.dim('API keys are stored locally in .sylphx-flow/ai-config.json\n'));

  // Load existing config
  const configResult = await loadAIConfig(cwd);
  const existingConfig: AIConfig =
    configResult._tag === 'Success' ? configResult.value : {};

  // Get configured providers
  const configuredProviders = await getConfiguredProviders(cwd);

  // Main menu
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        {
          name: '🔑 Configure API Keys',
          value: 'keys',
        },
        {
          name: '🎯 Set Default Provider & Model',
          value: 'defaults',
        },
        {
          name: '📋 View Current Configuration',
          value: 'view',
        },
        {
          name: '🗑️  Remove API Keys',
          value: 'remove',
        },
        {
          name: '❌ Exit',
          value: 'exit',
        },
      ],
    },
  ]);

  switch (action) {
    case 'keys':
      await configureAPIKeys(existingConfig, cwd);
      break;
    case 'defaults':
      await configureDefaults(existingConfig, configuredProviders, cwd);
      break;
    case 'view':
      await viewConfiguration(existingConfig, configuredProviders);
      break;
    case 'remove':
      await removeAPIKeys(existingConfig, cwd);
      break;
    case 'exit':
      console.log(chalk.cyan('\n👋 Configuration complete!\n'));
      return;
  }

  // Loop back to main menu
  await configureAI(cwd);
}

/**
 * Configure API keys for providers
 */
async function configureAPIKeys(config: AIConfig, cwd: string): Promise<void> {
  console.log(chalk.cyan.bold('\n🔑 Configure API Keys\n'));

  const { providers } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'providers',
      message: 'Select providers to configure:',
      choices: [
        {
          name: '🔵 Anthropic (Claude)',
          value: 'anthropic',
          checked: !!config.providers?.anthropic?.apiKey,
        },
        {
          name: '🟢 OpenAI (GPT)',
          value: 'openai',
          checked: !!config.providers?.openai?.apiKey,
        },
        {
          name: '🔴 Google (Gemini)',
          value: 'google',
          checked: !!config.providers?.google?.apiKey,
        },
        {
          name: '🟣 OpenRouter (300+ Models)',
          value: 'openrouter',
          checked: !!config.providers?.openrouter?.apiKey,
        },
      ],
    },
  ]);

  if (providers.length === 0) {
    console.log(chalk.yellow('\n⚠️  No providers selected\n'));
    return;
  }

  const newConfig: AIConfig = { ...config, providers: { ...config.providers } };

  // Configure each selected provider
  for (const providerId of providers as ProviderId[]) {
    const provider = AI_PROVIDERS[providerId];
    const existing = config.providers?.[providerId]?.apiKey;

    console.log(chalk.blue(`\n▸ ${provider.name}`));

    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: `Enter ${provider.keyName}:`,
        mask: '*',
        default: existing,
        validate: (input: string) => {
          if (!input || input.trim() === '') {
            return 'API key is required';
          }
          return true;
        },
      },
    ]);

    if (!newConfig.providers) {
      newConfig.providers = {};
    }

    newConfig.providers[providerId] = {
      ...newConfig.providers[providerId],
      apiKey: apiKey.trim(),
    };

    console.log(chalk.green(`✓ ${provider.name} API key saved`));
  }

  // Save configuration
  const saveResult = await saveAIConfig(newConfig, cwd);

  if (saveResult._tag === 'Success') {
    console.log(chalk.green('\n✓ Configuration saved to .sylphx-flow/ai-config.json\n'));
  } else {
    console.error(chalk.red('\n✗ Failed to save configuration\n'));
    console.error(chalk.dim(saveResult.error.message));
  }
}

/**
 * Configure default provider and model
 */
async function configureDefaults(
  config: AIConfig,
  configuredProviders: ProviderId[],
  cwd: string
): Promise<void> {
  console.log(chalk.cyan.bold('\n🎯 Set Defaults\n'));

  if (configuredProviders.length === 0) {
    console.log(
      chalk.yellow('⚠️  No providers configured yet. Please configure API keys first.\n')
    );
    return;
  }

  // Select default provider
  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Select default provider:',
      choices: configuredProviders.map((id) => ({
        name: `${AI_PROVIDERS[id].name}`,
        value: id,
      })),
      default: config.defaultProvider,
    },
  ]);

  const providerInfo = AI_PROVIDERS[provider as ProviderId];

  // Select default model for that provider
  const { model } = await inquirer.prompt([
    {
      type: 'list',
      name: 'model',
      message: `Select default model for ${providerInfo.name}:`,
      choices: providerInfo.models.map((m) => ({
        name: m,
        value: m,
      })),
      default: config.providers?.[provider as ProviderId]?.defaultModel || providerInfo.models[0],
    },
  ]);

  // Update configuration
  const newConfig: AIConfig = {
    ...config,
    defaultProvider: provider,
    defaultModel: model,
    providers: {
      ...config.providers,
      [provider]: {
        ...config.providers?.[provider as ProviderId],
        defaultModel: model,
      },
    },
  };

  const saveResult = await saveAIConfig(newConfig, cwd);

  if (saveResult._tag === 'Success') {
    console.log(chalk.green(`\n✓ Default provider: ${providerInfo.name}`));
    console.log(chalk.green(`✓ Default model: ${model}\n`));
  } else {
    console.error(chalk.red('\n✗ Failed to save configuration\n'));
  }
}

/**
 * View current configuration
 */
async function viewConfiguration(config: AIConfig, configuredProviders: ProviderId[]): Promise<void> {
  console.log(chalk.cyan.bold('\n📋 Current Configuration\n'));

  if (configuredProviders.length === 0) {
    console.log(chalk.yellow('⚠️  No providers configured\n'));
    return;
  }

  // Show default provider/model
  if (config.defaultProvider) {
    console.log(chalk.blue('Default Provider:'), chalk.green(AI_PROVIDERS[config.defaultProvider].name));
    if (config.defaultModel) {
      console.log(chalk.blue('Default Model:'), chalk.green(config.defaultModel));
    }
    console.log('');
  }

  // Show configured providers
  console.log(chalk.blue('Configured Providers:'));
  for (const providerId of configuredProviders) {
    const provider = AI_PROVIDERS[providerId];
    const providerConfig = config.providers?.[providerId];

    console.log(chalk.green(`\n  ✓ ${provider.name}`));
    console.log(chalk.dim(`    API Key: ${'*'.repeat(20)}...`));

    if (providerConfig?.defaultModel) {
      console.log(chalk.dim(`    Default Model: ${providerConfig.defaultModel}`));
    }

    // Show available models
    console.log(chalk.dim(`    Available Models: ${provider.models.length} models`));
  }

  console.log('');

  // Wait for user to press Enter
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...',
    },
  ]);
}

/**
 * Remove API keys
 */
async function removeAPIKeys(config: AIConfig, cwd: string): Promise<void> {
  console.log(chalk.cyan.bold('\n🗑️  Remove API Keys\n'));

  const configuredProviders = await getConfiguredProviders(cwd);

  if (configuredProviders.length === 0) {
    console.log(chalk.yellow('⚠️  No providers configured\n'));
    return;
  }

  const { providers } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'providers',
      message: 'Select providers to remove:',
      choices: configuredProviders.map((id) => ({
        name: AI_PROVIDERS[id].name,
        value: id,
      })),
    },
  ]);

  if (providers.length === 0) {
    console.log(chalk.yellow('\n⚠️  No providers selected\n'));
    return;
  }

  // Confirm deletion
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Remove API keys for ${providers.length} provider(s)?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow('\n⚠️  Cancelled\n'));
    return;
  }

  // Remove selected providers
  const newConfig: AIConfig = { ...config, providers: { ...config.providers } };

  for (const providerId of providers as ProviderId[]) {
    if (newConfig.providers?.[providerId]) {
      delete newConfig.providers[providerId];
    }
    console.log(chalk.green(`✓ Removed ${AI_PROVIDERS[providerId].name}`));
  }

  // Clear default if removed
  if (config.defaultProvider && providers.includes(config.defaultProvider)) {
    delete newConfig.defaultProvider;
    delete newConfig.defaultModel;
  }

  await saveAIConfig(newConfig, cwd);
  console.log(chalk.green('\n✓ Configuration updated\n'));
}

/**
 * Quick setup - configure first provider
 */
export async function quickSetupAI(cwd: string = process.cwd()): Promise<boolean> {
  console.log(chalk.cyan.bold('\n🚀 Quick AI Setup\n'));

  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Select your AI provider:',
      choices: [
        { name: '🔵 Anthropic (Claude) - Recommended', value: 'anthropic' },
        { name: '🟢 OpenAI (GPT)', value: 'openai' },
        { name: '🔴 Google (Gemini)', value: 'google' },
        { name: '🟣 OpenRouter (300+ Models)', value: 'openrouter' },
      ],
    },
  ]);

  const providerInfo = AI_PROVIDERS[provider as ProviderId];

  const { apiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: `Enter your ${providerInfo.keyName}:`,
      mask: '*',
      validate: (input: string) => {
        if (!input || input.trim() === '') {
          return 'API key is required';
        }
        return true;
      },
    },
  ]);

  const { model } = await inquirer.prompt([
    {
      type: 'list',
      name: 'model',
      message: 'Select default model:',
      choices: providerInfo.models,
      default: providerInfo.models[0],
    },
  ]);

  // Save configuration
  const config: AIConfig = {
    defaultProvider: provider,
    defaultModel: model,
    providers: {
      [provider]: {
        apiKey: apiKey.trim(),
        defaultModel: model,
      },
    },
  };

  const saveResult = await saveAIConfig(config, cwd);

  if (saveResult._tag === 'Success') {
    console.log(chalk.green('\n✓ AI configuration complete!'));
    console.log(chalk.dim(`  Provider: ${providerInfo.name}`));
    console.log(chalk.dim(`  Model: ${model}`));
    console.log(chalk.dim(`  Config: .sylphx-flow/ai-config.json\n`));
    return true;
  }

  console.error(chalk.red('\n✗ Failed to save configuration\n'));
  return false;
}

/**
 * Provider Selection Helpers
 * Extract duplicated provider selection and switching logic
 */

import type { ProviderId } from '../../../types/provider.types.js';
import type { CommandContext } from '../types.js';
import { configureProvider } from './provider-config.js';

/**
 * Get provider options with configured status
 */
export async function getProviderOptions(
  context: CommandContext
): Promise<Array<{ label: string; value: string }>> {
  const { AI_PROVIDERS } = await import('@sylphx/code-core');
  const { getProvider } = await import('@sylphx/code-core');
  const aiConfig = context.getConfig();

  return Object.values(AI_PROVIDERS).map((p) => {
    let isConfigured = false;
    try {
      const provider = getProvider(p.id as any);
      const providerConfig = aiConfig?.providers?.[p.id as keyof typeof aiConfig.providers];
      isConfigured = providerConfig ? provider.isConfigured(providerConfig) : false;
    } catch {
      // Provider not found or error checking config
    }
    return {
      label: `${p.name} ${isConfigured ? '✓' : ''}`,
      value: p.id,
    };
  });
}

/**
 * Ask user to select a provider
 */
export async function askSelectProvider(
  context: CommandContext,
  message: string,
  question: string
): Promise<string | null> {
  const providerOptions = await getProviderOptions(context);

  await context.sendMessage(message);
  const answers = await context.waitForInput({
    type: 'selection',
    questions: [
      {
        id: 'provider',
        question,
        options: providerOptions,
      },
    ],
  });

  const providerId =
    typeof answers === 'object' && !Array.isArray(answers) ? answers['provider'] : '';
  return providerId || null;
}

/**
 * Ensure provider is configured, optionally configure if not
 * Returns the provider config if successful, or error message
 */
export async function ensureProviderConfigured(
  context: CommandContext,
  providerId: string,
  autoPromptConfigure: boolean = true
): Promise<{ success: true; config: any } | { success: false; message: string }> {
  const { AI_PROVIDERS } = await import('@sylphx/code-core');
  const { getProvider } = await import('@sylphx/code-core');
  const aiConfig = context.getConfig();

  const provider = getProvider(providerId as any);
  const providerConfig = aiConfig?.providers?.[providerId as keyof typeof aiConfig.providers];

  // Already configured
  if (providerConfig && provider.isConfigured(providerConfig)) {
    return { success: true, config: providerConfig };
  }

  // Not configured
  if (!autoPromptConfigure) {
    return {
      success: false,
      message: `${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} is not configured. Use: /provider set ${providerId}`,
    };
  }

  // Ask if user wants to configure now
  await context.sendMessage(
    `${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} is not configured yet.`
  );
  const configureAnswers = await context.waitForInput({
    type: 'selection',
    questions: [
      {
        id: 'configure',
        question: 'Do you want to configure it now?',
        options: [
          { label: 'Yes, configure now', value: 'yes' },
          { label: 'No, cancel', value: 'no' },
        ],
      },
    ],
  });

  const shouldConfigure =
    typeof configureAnswers === 'object' && !Array.isArray(configureAnswers)
      ? configureAnswers['configure'] === 'yes'
      : false;

  if (!shouldConfigure) {
    return {
      success: false,
      message: 'Cancelled. You can configure later using: /provider set',
    };
  }

  // Configure the provider
  const configResult = await configureProvider(context, providerId);

  // Check if now configured
  const updatedConfig = context.getConfig();
  const updatedProviderConfig =
    updatedConfig?.providers?.[providerId as keyof typeof updatedConfig.providers];

  if (!updatedProviderConfig || !provider.isConfigured(updatedProviderConfig)) {
    return {
      success: false,
      message: `${configResult}\n\nProvider still not fully configured. Please continue configuration with: /provider set ${providerId}`,
    };
  }

  await context.sendMessage(configResult);
  return { success: true, config: updatedProviderConfig };
}

/**
 * Switch to a provider (set as default, update model, save config, update session)
 */
export async function switchToProvider(
  context: CommandContext,
  providerId: string,
  providerConfig: any
): Promise<string> {
  const { AI_PROVIDERS } = await import('@sylphx/code-core');
  const aiConfig = context.getConfig();

  const newConfig = {
    ...aiConfig!,
    defaultProvider: providerId,
  };

  // Get default model and update config
  const { getDefaultModel } = await import('@sylphx/code-core');
  const defaultModel = await getDefaultModel(providerId as any, providerConfig);
  if (!defaultModel) {
    return `Failed to get default model for ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name}`;
  }

  // Save default model to config
  newConfig.providers = {
    ...newConfig.providers,
    [providerId]: {
      ...providerConfig,
      'default-model': defaultModel,
    },
  };

  context.setAIConfig(newConfig);
  await context.saveConfig(newConfig);

  // Update UI state
  context.setUISelectedProvider(providerId as ProviderId);
  context.setUISelectedModel(defaultModel);

  // Update current session's provider (preserve history)
  const currentSessionId = context.getCurrentSessionId();
  if (currentSessionId) {
    await context.updateSessionProvider(currentSessionId, providerId, defaultModel);
  } else {
    // Fallback: create new session if no active session
    await context.createSession(providerId, defaultModel);
  }

  return `Now using ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} with model: ${defaultModel}`;
}

/**
 * Combined flow: ensure configured and switch to provider
 */
export async function ensureConfiguredAndSwitch(
  context: CommandContext,
  providerId: string,
  autoPromptConfigure: boolean = true
): Promise<string> {
  const result = await ensureProviderConfigured(context, providerId, autoPromptConfigure);

  if (!result.success) {
    return result.message;
  }

  return await switchToProvider(context, providerId, result.config);
}

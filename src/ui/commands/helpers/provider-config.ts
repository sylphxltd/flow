/**
 * Provider Configuration Helper
 * Shared helper function for provider configuration
 */

import type { CommandContext } from '../types.js';

/**
 * Configure a provider interactively
 */
export async function configureProvider(
  context: CommandContext,
  providerId: string
): Promise<string> {
  const { AI_PROVIDERS } = await import('../../../config/ai-config.js');
  const { getProvider } = await import('../../../providers/index.js');
  const aiConfig = context.getConfig();

  const provider = getProvider(providerId as any);
  const schema = provider.getConfigSchema();

  const availableKeys = schema.map((field) => ({
    label: field.label,
    value: field.key,
  }));

  context.sendMessage(
    `Configure ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} - Select setting:`
  );
  const keyAnswers = await context.waitForInput({
    type: 'selection',
    questions: [
      {
        id: 'key',
        question: 'Which setting do you want to configure?',
        options: availableKeys,
      },
    ],
  });

  const key =
    typeof keyAnswers === 'object' && !Array.isArray(keyAnswers)
      ? keyAnswers['key']
      : '';
  if (!key) {
    return 'Configuration cancelled.';
  }

  // Ask for value - check if boolean type for selection
  const field = schema.find((f) => f.key === key);
  let value: string;

  if (field?.type === 'boolean') {
    context.sendMessage(`Select value for ${key}:`);
    const boolAnswers = await context.waitForInput({
      type: 'selection',
      questions: [
        {
          id: 'value',
          question: `${field.label}:`,
          options: [
            { label: 'true', value: 'true' },
            { label: 'false', value: 'false' },
          ],
        },
      ],
    });
    value =
      typeof boolAnswers === 'object' && !Array.isArray(boolAnswers)
        ? boolAnswers['value']
        : '';
  } else {
    context.sendMessage(`Enter value for ${key}:`);
    const valueAnswers = await context.waitForInput({
      type: 'text',
      prompt: `${key}:`,
    });
    value = typeof valueAnswers === 'string' ? valueAnswers : '';
  }

  if (!value) {
    return 'Value is required.';
  }

  // Update config
  const newConfig = {
    ...aiConfig!,
    providers: {
      ...aiConfig!.providers,
      [providerId]: {
        ...aiConfig!.providers?.[
          providerId as keyof typeof aiConfig.providers
        ],
        [key]: value,
      },
    },
  };

  if (!aiConfig?.defaultProvider) {
    newConfig.defaultProvider = providerId;
  }

  context.setAIConfig(newConfig);
  await context.saveConfig(newConfig);

  // Mask secret values in response
  const displayField = schema.find((f) => f.key === key);
  const displayValue = displayField?.secret ? '***' : value;

  return `Set ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} ${key} to: ${displayValue}`;
}

/**
 * Options cache for dynamic option loading
 */
export const optionsCache = new Map<
  string,
  Array<{ id: string; name: string }>
>();

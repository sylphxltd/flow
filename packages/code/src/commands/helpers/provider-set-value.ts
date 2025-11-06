/**
 * Provider Set Value Helper
 * Extract duplicated provider configuration setting logic
 */

import type { CommandContext } from '../types.js';

/**
 * Ask user to select a key from provider schema
 */
export async function askSelectProviderKey(
  context: CommandContext,
  providerId: string,
  schema: Array<{ key: string; label: string }>
): Promise<string | null> {
  const { AI_PROVIDERS } = await import('@sylphx/code-core');

  const availableKeys = schema.map((field) => ({
    label: field.label,
    value: field.key,
  }));

  await context.sendMessage(
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

  const key = typeof keyAnswers === 'object' && !Array.isArray(keyAnswers) ? keyAnswers['key'] : '';
  return key || null;
}

/**
 * Ask user for value (handles boolean vs text input)
 */
export async function askForValueByType(
  context: CommandContext,
  key: string,
  field: { key: string; label: string; type?: string } | undefined
): Promise<string | null> {
  let value: string;

  if (field?.type === 'boolean') {
    await context.sendMessage(`Select value for ${key}:`);
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
      typeof boolAnswers === 'object' && !Array.isArray(boolAnswers) ? boolAnswers['value'] : '';
  } else {
    await context.sendMessage(`Enter value for ${key}:`);
    const valueAnswers = await context.waitForInput({
      type: 'text',
      placeholder: `Enter ${key}...`,
    });
    value = typeof valueAnswers === 'string' ? valueAnswers : '';
  }

  return value || null;
}

/**
 * Set a provider config value and save
 */
export async function setProviderConfigValue(
  context: CommandContext,
  providerId: string,
  key: string,
  value: string,
  schema: Array<{ key: string; label: string; secret?: boolean }>
): Promise<string> {
  const { AI_PROVIDERS } = await import('@sylphx/code-core');
  const { useAppStore } = await import('@sylphx/code-client');
  const store = useAppStore.getState();
  const aiConfig = store.aiConfig;

  const newConfig = {
    ...aiConfig!,
    providers: {
      ...aiConfig!.providers,
      [providerId]: {
        ...aiConfig!.providers?.[providerId as keyof typeof aiConfig.providers],
        [key]: value,
      },
    },
  };

  if (!aiConfig?.defaultProvider) {
    newConfig.defaultProvider = providerId;
  }

  store.setAIConfig(newConfig);
  await context.saveConfig(newConfig);

  // Mask secret values in response
  const displayField = schema.find((f) => f.key === key);
  const displayValue = displayField?.secret ? '***' : value;

  return `Set ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} ${key} to: ${displayValue}`;
}

/**
 * Combined flow: ask for key, ask for value, save config
 */
export async function interactiveSetProviderConfig(
  context: CommandContext,
  providerId: string
): Promise<string> {
  const { getProvider } = await import('@sylphx/code-core');
  const provider = getProvider(providerId as any);
  const schema = provider.getConfigSchema();

  // Ask for key
  const key = await askSelectProviderKey(context, providerId, schema);
  if (!key) {
    return 'Configuration cancelled.';
  }

  // Ask for value
  const field = schema.find((f) => f.key === key);
  const value = await askForValueByType(context, key, field);
  if (!value) {
    return 'Value is required.';
  }

  // Save config
  return await setProviderConfigValue(context, providerId, key, value, schema);
}

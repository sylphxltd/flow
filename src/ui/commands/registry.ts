/**
 * Command Registry
 * All available commands with their definitions and implementations
 */

import type { Command, CommandContext } from './types.js';

// Internal cache for options (like models)
const optionsCache = new Map<string, Array<{ id: string; name: string }>>();

/**
 * Helper function to configure a provider
 */
async function configureProvider(context: CommandContext, providerId: string): Promise<string> {
  const { AI_PROVIDERS } = await import('../../config/ai-config.js');
  const { getProvider } = await import('../../providers/index.js');
  const aiConfig = context.getConfig();

  const provider = getProvider(providerId as any);
  const schema = provider.getConfigSchema();

  const availableKeys = schema.map(field => ({
    label: field.label,
    value: field.key,
  }));

  context.sendMessage(`Configure ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} - Select setting:`);
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
  if (!key) {
    return 'Configuration cancelled.';
  }

  // Ask for value - check if boolean type for selection
  const field = schema.find(f => f.key === key);
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
    value = typeof boolAnswers === 'object' && !Array.isArray(boolAnswers) ? boolAnswers['value'] : '';
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
        ...aiConfig!.providers?.[providerId as keyof typeof aiConfig.providers],
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
  const displayField = schema.find(f => f.key === key);
  const displayValue = displayField?.secret ? '***' : value;

  return `Set ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} ${key} to: ${displayValue}`;
}

/**
 * Provider command - Configure AI provider
 */
const providerCommand: Command = {
  id: 'provider',
  label: '/provider',
  description: 'Manage AI providers',
  args: [
    {
      name: 'action',
      description: 'Action: "use" or "set"',
      required: false,
      loadOptions: async (previousArgs) => {
        return [
          { id: 'use', label: 'use', value: 'use' },
          { id: 'set', label: 'set', value: 'set' },
        ];
      },
    },
    {
      name: 'provider-name',
      description: 'Provider name (anthropic, openai, google, openrouter)',
      required: false,
      loadOptions: async (previousArgs) => {
        const { AI_PROVIDERS } = await import('../../config/ai-config.js');
        return Object.values(AI_PROVIDERS).map((p) => ({
          id: p.id,
          label: p.name,
          value: p.id,
        }));
      },
    },
    {
      name: 'key',
      description: 'Setting key (for set action)',
      required: false,
      loadOptions: async (previousArgs) => {
        // previousArgs: [action, provider-name]
        // Load keys from provider's config schema
        const providerId = previousArgs[1]; // e.g., "anthropic", "openai", "openrouter"

        if (!providerId) {
          return [];
        }

        try {
          const { getProvider } = await import('../../providers/index.js');
          const provider = getProvider(providerId as any);
          const schema = provider.getConfigSchema();

          // Convert schema fields to options
          const keys = schema.map(field => ({
            id: field.key,
            label: field.label,
            value: field.key,
          }));

          return keys;
        } catch (error) {
          // Fallback to empty if provider not found
          return [];
        }
      },
    },
    {
      name: 'value',
      description: 'Setting value (for set action)',
      required: false,
      loadOptions: async (previousArgs) => {
        // previousArgs: [action, provider-name, key]
        const providerId = previousArgs[1];
        const key = previousArgs[2];

        if (!providerId || !key) {
          return [];
        }

        try {
          const { getProvider } = await import('../../providers/index.js');
          const provider = getProvider(providerId as any);
          const schema = provider.getConfigSchema();

          // Find the field
          const field = schema.find(f => f.key === key);

          // If boolean type, provide true/false options
          if (field?.type === 'boolean') {
            return [
              { id: 'true', label: 'true', value: 'true' },
              { id: 'false', label: 'false', value: 'false' },
            ];
          }

          return [];
        } catch (error) {
          return [];
        }
      },
    },
  ],
  execute: async (context) => {
    const { AI_PROVIDERS } = await import('../../config/ai-config.js');
    const aiConfig = context.getConfig();

    // Case 1: /provider - ask use or set
    if (context.args.length === 0) {
      context.sendMessage('What do you want to do?');
      const actionAnswers = await context.waitForInput({
        type: 'selection',
        questions: [
          {
            id: 'action',
            question: 'Select action:',
            options: [
              { label: 'Use a provider', value: 'use' },
              { label: 'Configure a provider', value: 'set' },
            ],
          },
        ],
      });

      const action = typeof actionAnswers === 'object' && !Array.isArray(actionAnswers) ? actionAnswers['action'] : '';
      if (!action) {
        return 'Action cancelled.';
      }

      // Ask which provider
      const { getProvider } = await import('../../providers/index.js');
      const providerOptions = Object.values(AI_PROVIDERS).map((p) => {
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

      context.sendMessage(action === 'use' ? 'Which provider do you want to use?' : 'Which provider do you want to configure?');
      const providerAnswers = await context.waitForInput({
        type: 'selection',
        questions: [
          {
            id: 'provider',
            question: action === 'use' ? 'Select provider to use:' : 'Select provider to configure:',
            options: providerOptions,
          },
        ],
      });

      const providerId = typeof providerAnswers === 'object' && !Array.isArray(providerAnswers) ? providerAnswers['provider'] : '';
      if (!providerId) {
        return 'Provider selection cancelled.';
      }

      if (action === 'use') {
        // Use provider
        const { getProvider } = await import('../../providers/index.js');
        const provider = getProvider(providerId as any);
        const providerConfig = aiConfig?.providers?.[providerId as keyof typeof aiConfig.providers];

        if (!providerConfig || !provider.isConfigured(providerConfig)) {
          // Provider not configured - ask if user wants to configure now
          context.sendMessage(`${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} is not configured yet.`);
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

          const shouldConfigure = typeof configureAnswers === 'object' && !Array.isArray(configureAnswers)
            ? configureAnswers['configure'] === 'yes'
            : false;

          if (!shouldConfigure) {
            return 'Cancelled. You can configure later using: /provider set';
          }

          // Configure the provider
          const configResult = await configureProvider(context, providerId);

          // After configuration, check if it's now configured
          const updatedConfig = context.getConfig();
          const updatedProviderConfig = updatedConfig?.providers?.[providerId as keyof typeof updatedConfig.providers];
          if (!updatedProviderConfig || !provider.isConfigured(updatedProviderConfig)) {
            return `${configResult}\n\nProvider still not fully configured. Please continue configuration with: /provider set ${providerId}`;
          }

          // Continue with "use" flow - update to use this provider
          context.sendMessage(configResult);
          const providerConfigToUse = updatedProviderConfig;

          // Now proceed to set as default provider
          const newConfig = {
            ...updatedConfig!,
            defaultProvider: providerId,
          };

          // Get default model and update config
          const { getDefaultModel } = await import('../../core/session-service.js');
          const defaultModel = await getDefaultModel(providerId as any, providerConfigToUse);
          if (!defaultModel) {
            return `Provider configured but failed to get default model for ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name}`;
          }

          // Save default model to config
          newConfig.providers = {
            ...newConfig.providers,
            [providerId]: {
              ...providerConfigToUse,
              'default-model': defaultModel,
            },
          };

          context.setAIConfig(newConfig);
          await context.saveConfig(newConfig);

          // Update current session's provider (preserve history)
          const currentSessionId = context.getCurrentSessionId();
          if (currentSessionId) {
            context.updateSessionProvider(currentSessionId, providerId, defaultModel);
          } else {
            // Fallback: create new session if no active session
            context.createSession(providerId, defaultModel);
          }

          return `Now using ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} with model: ${defaultModel}`;
        }

        const newConfig = {
          ...aiConfig!,
          defaultProvider: providerId,
        };

        // Get default model and update config
        const { getDefaultModel } = await import('../../core/session-service.js');
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

        // Update current session's provider (preserve history)
        const currentSessionId = context.getCurrentSessionId();
        if (currentSessionId) {
          context.updateSessionProvider(currentSessionId, providerId, defaultModel);
        } else {
          // Fallback: create new session if no active session
          context.createSession(providerId, defaultModel);
        }

        return `Switched to ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name}`;
      } else {
        // Set provider - use helper function
        return await configureProvider(context, providerId);
      }
    }

    // Case 2: /provider use - ask which provider to use
    if (context.args.length === 1 && context.args[0] === 'use') {
      const { getProvider } = await import('../../providers/index.js');
      const providerOptions = Object.values(AI_PROVIDERS).map((p) => {
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

      context.sendMessage('Which provider do you want to use?');
      const answers = await context.waitForInput({
        type: 'selection',
        questions: [
          {
            id: 'provider',
            question: 'Select provider:',
            options: providerOptions,
          },
        ],
      });

      const providerId = typeof answers === 'object' && !Array.isArray(answers) ? answers['provider'] : '';
      if (!providerId) {
        return 'Provider selection cancelled.';
      }

      const provider = getProvider(providerId as any);
      const providerConfig = aiConfig?.providers?.[providerId as keyof typeof aiConfig.providers];

      if (!providerConfig || !provider.isConfigured(providerConfig)) {
        // Provider not configured - ask if user wants to configure now
        context.sendMessage(`${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} is not configured yet.`);
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

        const shouldConfigure = typeof configureAnswers === 'object' && !Array.isArray(configureAnswers)
          ? configureAnswers['configure'] === 'yes'
          : false;

        if (!shouldConfigure) {
          return 'Cancelled. You can configure later using: /provider set';
        }

        // Configure the provider
        const configResult = await configureProvider(context, providerId);

        // After configuration, check if it's now configured
        const updatedConfig = context.getConfig();
        const updatedProviderConfig = updatedConfig?.providers?.[providerId as keyof typeof updatedConfig.providers];
        if (!updatedProviderConfig || !provider.isConfigured(updatedProviderConfig)) {
          return `${configResult}\n\nProvider still not fully configured. Please continue configuration with: /provider set ${providerId}`;
        }

        // Continue with "use" flow - update to use this provider
        context.sendMessage(configResult);
        const providerConfigToUse = updatedProviderConfig;

        // Now proceed to set as default provider
        const newConfig = {
          ...updatedConfig!,
          defaultProvider: providerId,
        };

        // Get default model and update config
        const { getDefaultModel } = await import('../../core/session-service.js');
        const defaultModel = await getDefaultModel(providerId as any, providerConfigToUse);
        if (!defaultModel) {
          return `Provider configured but failed to get default model for ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name}`;
        }

        // Save default model to config
        newConfig.providers = {
          ...newConfig.providers,
          [providerId]: {
            ...providerConfigToUse,
            'default-model': defaultModel,
          },
        };

        context.setAIConfig(newConfig);
        await context.saveConfig(newConfig);

        // Update current session's provider (preserve history)
        const currentSessionId = context.getCurrentSessionId();
        if (currentSessionId) {
          context.updateSessionProvider(currentSessionId, providerId, defaultModel);
        } else {
          // Fallback: create new session if no active session
          context.createSession(providerId, defaultModel);
        }

        return `Now using ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} with model: ${defaultModel}`;
      }

      const newConfig = {
        ...aiConfig!,
        defaultProvider: providerId,
      };

      // Get default model and update config
      const { getDefaultModel } = await import('../../core/session-service.js');
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

      // Update current session's provider (preserve history)
      const currentSessionId = context.getCurrentSessionId();
      if (currentSessionId) {
        context.updateSessionProvider(currentSessionId, providerId, defaultModel);
      } else {
        // Fallback: create new session if no active session
        context.createSession(providerId, defaultModel);
      }

      return `Switched to ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name}`;
    }

    // Case 3: /provider use [name] - switch to specific provider
    if (context.args.length === 2 && context.args[0] === 'use') {
      const providerId = context.args[1];

      if (!(providerId in AI_PROVIDERS)) {
        return `Invalid provider: ${providerId}. Available: ${Object.keys(AI_PROVIDERS).join(', ')}`;
      }

      const { getProvider } = await import('../../providers/index.js');
      const provider = getProvider(providerId as any);
      const providerConfig = aiConfig?.providers?.[providerId as keyof typeof aiConfig.providers];

      if (!providerConfig || !provider.isConfigured(providerConfig)) {
        return `${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} is not configured. Use: /provider set ${providerId}`;
      }

      const newConfig = {
        ...aiConfig!,
        defaultProvider: providerId,
      };

      // Get default model and update config
      const { getDefaultModel } = await import('../../core/session-service.js');
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

      // Update current session's provider (preserve history)
      const currentSessionId = context.getCurrentSessionId();
      if (currentSessionId) {
        context.updateSessionProvider(currentSessionId, providerId, defaultModel);
      } else {
        // Fallback: create new session if no active session
        context.createSession(providerId, defaultModel);
      }

      return `Switched to ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name}`;
    }

    // Case 4: /provider set - ask which provider to configure
    if (context.args.length === 1 && context.args[0] === 'set') {
      const providerOptions = Object.values(AI_PROVIDERS).map((p) => ({
        label: p.name,
        value: p.id,
      }));

      context.sendMessage('Which provider do you want to configure?');
      const providerAnswers = await context.waitForInput({
        type: 'selection',
        questions: [
          {
            id: 'provider',
            question: 'Select provider:',
            options: providerOptions,
          },
        ],
      });

      const providerId = typeof providerAnswers === 'object' && !Array.isArray(providerAnswers) ? providerAnswers['provider'] : '';
      if (!providerId) {
        return 'Provider selection cancelled.';
      }

      // Ask for key
      const { getProvider } = await import('../../providers/index.js');
      const provider = getProvider(providerId as any);
      const schema = provider.getConfigSchema();

      const availableKeys = schema.map(field => ({
        label: field.label,
        value: field.key,
      }));


      context.sendMessage(`Configure ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} - Select setting:`);
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
      if (!key) {
        return 'Configuration cancelled.';
      }

      // Ask for value - check if boolean type for selection
      {
        const field = schema.find(f => f.key === key);
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
          value = typeof boolAnswers === 'object' && !Array.isArray(boolAnswers) ? boolAnswers['value'] : '';
        } else {
          context.sendMessage(`Enter value for ${key}:`);
          const valueAnswers = await context.waitForInput({
            type: 'text',
            placeholder: `Enter ${key}...`,
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
              ...aiConfig!.providers?.[providerId as keyof typeof aiConfig.providers],
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
        const displayField = schema.find(f => f.key === key);
        const displayValue = displayField?.secret ? '***' : value;

        return `Set ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} ${key} to: ${displayValue}`;
      }
    }

    // Case 5: /provider set [name] - ask which key to set
    if (context.args.length === 2 && context.args[0] === 'set') {
      const providerId = context.args[1];

      if (!(providerId in AI_PROVIDERS)) {
        return `Invalid provider: ${providerId}. Available: ${Object.keys(AI_PROVIDERS).join(', ')}`;
      }

      // Ask for key
      const { getProvider } = await import('../../providers/index.js');
      const provider = getProvider(providerId as any);
      const schema = provider.getConfigSchema();

      const availableKeys = schema.map(field => ({
        label: field.label,
        value: field.key,
      }));


      context.sendMessage(`Configure ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} - Select setting:`);
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
      if (!key) {
        return 'Configuration cancelled.';
      }

      // Ask for value - check if boolean type for selection
      {
        const field = schema.find(f => f.key === key);
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
          value = typeof boolAnswers === 'object' && !Array.isArray(boolAnswers) ? boolAnswers['value'] : '';
        } else {
          context.sendMessage(`Enter value for ${key}:`);
          const valueAnswers = await context.waitForInput({
            type: 'text',
            placeholder: `Enter ${key}...`,
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
              ...aiConfig!.providers?.[providerId as keyof typeof aiConfig.providers],
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
        const displayField = schema.find(f => f.key === key);
        const displayValue = displayField?.secret ? '***' : value;

        return `Set ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} ${key} to: ${displayValue}`;
      }
    }

    // Case 6: /provider set [name] [key] [value] - direct configuration
    if (context.args.length >= 4 && context.args[0] === 'set') {
      const providerId = context.args[1];
      const key = context.args[2];
      const value = context.args.slice(3).join(' ');

      if (!(providerId in AI_PROVIDERS)) {
        return `Invalid provider: ${providerId}. Available: ${Object.keys(AI_PROVIDERS).join(', ')}`;
      }

      // Get valid keys from provider schema
      const { getProvider } = await import('../../providers/index.js');
      const provider = getProvider(providerId as any);
      const schema = provider.getConfigSchema();

      const validKeys = schema.map(f => f.key);
      if (!validKeys.includes(key)) {
        return `Invalid key: ${key}. Valid keys for ${providerId}: ${validKeys.join(', ')}`;
      }

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

      context.setAIConfig(newConfig);
      await context.saveConfig(newConfig);

      // Mask secret values in response
      const field = schema.find(f => f.key === key);
      const displayValue = field?.secret ? '***' : value;

      return `Set ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} ${key} to: ${displayValue}`;
    }

    return 'Usage:\n  /provider - Select action and provider\n  /provider use - Select provider to use\n  /provider use [name] - Switch to provider\n  /provider set - Configure a provider\n  /provider set [name] - Configure specific provider\n  /provider set [name] [key] [value] - Set provider config directly';
  },
};

/**
 * Model command - Switch AI model
 */
const modelCommand: Command = {
  id: 'model',
  label: '/model',
  description: 'Switch AI model',
  args: [
    {
      name: 'model-name',
      description: 'Model to switch to',
      required: false,
      loadOptions: async (previousArgs, context) => {
        try {
          // Get AI config from context
          const aiConfig = context?.getConfig();
          if (!aiConfig?.providers) {
            return [];
          }

          // Get current session's provider
          const currentSession = context?.getCurrentSession();
          const currentProviderId = currentSession?.provider || aiConfig.defaultProvider;

          if (!currentProviderId) {
            return [];
          }

          // Fetch models from current provider only
          const config = aiConfig.providers[currentProviderId];
          if (!config) {
            return [];
          }

          try {
            const { fetchModels } = await import('../../utils/ai-model-fetcher.js');
            const models = await fetchModels(currentProviderId as any, config);
            return models.map(m => ({
              id: m.id,
              label: m.name,
              value: m.id,
            }));
          } catch (error) {
            if (context) {
              context.addLog(`Failed to fetch models for ${currentProviderId}: ${error instanceof Error ? error.message : String(error)}`);
            }
            return [];
          }
        } catch (error) {
          if (context) {
            context.addLog(`Error loading models: ${error instanceof Error ? error.message : String(error)}`);
          }
          return [];
        }
      },
    },
  ],
  execute: async (context) => {
    let modelId: string;

    // If no args provided, ask user to select
    if (context.args.length === 0) {
      try {
        // Load models from current provider only
        const aiConfig = context.getConfig();
        if (!aiConfig?.providers) {
          return 'No providers configured. Please configure a provider first.';
        }

        // Get current session's provider
        const currentSession = context.getCurrentSession();
        const currentProviderId = currentSession?.provider || aiConfig.defaultProvider;

        if (!currentProviderId) {
          return 'No provider selected. Use /provider to select a provider first.';
        }

        const config = aiConfig.providers[currentProviderId];
        if (!config) {
          return `Provider ${currentProviderId} is not configured.`;
        }

        // Fetch models from current provider
        let allModels: Array<{ label: string; value: string }> = [];
        try {
          const { fetchModels } = await import('../../utils/ai-model-fetcher.js');
          const models = await fetchModels(currentProviderId as any, config);
          allModels = models.map(m => ({ label: m.name, value: m.id }));
          context.addLog(`Loaded ${models.length} models from ${currentProviderId}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          context.addLog(`Failed to fetch models for ${currentProviderId}: ${errorMsg}`);
          return `Failed to load models from ${currentProviderId}: ${errorMsg}`;
        }

        if (allModels.length === 0) {
          return `No models available for ${currentProviderId}`;
        }

        // Ask user to select
        context.sendMessage('Which model do you want to use?');
        const answers = await context.waitForInput({
          type: 'selection',
          questions: [
            {
              id: 'model',
              question: 'Which model do you want to use?',
              options: allModels,
            },
          ],
        });

        // Extract answer from Record
        modelId = typeof answers === 'object' && !Array.isArray(answers) ? answers['model'] : '';
      } catch (error) {
        return `Failed to load models: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else {
      modelId = context.args[0];
    }

    const currentSession = context.getCurrentSession();
    const aiConfig = context.getConfig();
    const provider = currentSession?.provider || aiConfig?.defaultProvider;

    if (!provider) {
      return 'No provider configured. Please configure a provider first.';
    }

    // Update model and save to provider config
    const newConfig = {
      ...aiConfig!,
      defaultModel: modelId,
      providers: {
        ...aiConfig!.providers,
        [provider]: {
          ...aiConfig!.providers?.[provider],
          'default-model': modelId,
        },
      },
    };
    context.setAIConfig(newConfig);

    // Save config to file
    await context.saveConfig(newConfig);

    // Update current session's model (preserve history)
    const currentSessionId = context.getCurrentSessionId();
    if (currentSessionId) {
      context.updateSessionModel(currentSessionId, modelId);
    } else {
      // Fallback: create new session if no active session
      context.createSession(provider, modelId);
    }

    return `Switched to model: ${modelId}`;
  },
};

/**
 * Logs command - View debug logs
 */
const logsCommand: Command = {
  id: 'logs',
  label: '/logs',
  description: 'View debug logs',
  execute: async (context) => {
    context.navigateTo('logs');
    return 'Opening debug logs...';
  },
};

/**
 * Help command - Show available commands
 */
const helpCommand: Command = {
  id: 'help',
  label: '/help',
  description: 'Show available commands',
  execute: async (context) => {
    const commandList = commands
      .map((cmd) => {
        const argsText = cmd.args
          ? ` ${cmd.args.map((a) => `[${a.name}]`).join(' ')}`
          : '';
        return `${cmd.label}${argsText} - ${cmd.description}`;
      })
      .join('\n');
    return `Available commands:\n${commandList}`;
  },
};

/**
 * Survey command - Test multi-selection feature
 */
const surveyCommand: Command = {
  id: 'survey',
  label: '/survey',
  description: 'Test multi-question selection (demo)',
  execute: async (context) => {
    context.sendMessage('Let me ask you a few questions...');

    const answers = await context.waitForInput({
      type: 'selection',
      questions: [
        {
          id: 'language',
          question: 'What is your favorite programming language?',
          options: [
            { label: 'TypeScript' },
            { label: 'JavaScript' },
            { label: 'Python' },
            { label: 'Rust' },
            { label: 'Go' },
          ],
        },
        {
          id: 'framework',
          question: 'Which framework do you prefer?',
          options: [
            { label: 'React' },
            { label: 'Vue' },
            { label: 'Angular' },
            { label: 'Svelte' },
            { label: 'Solid' },
          ],
        },
        {
          id: 'editor',
          question: 'What is your favorite code editor?',
          options: [
            { label: 'Visual Studio Code' },
            { label: 'Vim/Neovim' },
            { label: 'Emacs' },
            { label: 'Sublime Text' },
            { label: 'Atom' },
          ],
        },
      ],
    });

    if (typeof answers === 'object' && !Array.isArray(answers)) {
      const summary = Object.entries(answers)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      return `Survey completed! Your answers: ${summary}`;
    }

    return 'Survey cancelled.';
  },
};

/**
 * Context command - Display context window usage
 */
const contextCommand: Command = {
  id: 'context',
  label: '/context',
  description: 'Display context window usage and token breakdown',
  execute: async (context) => {
    const { countTokens, formatTokenCount } = await import('../../utils/token-counter.js');
    const { SYSTEM_PROMPT } = await import('../../core/ai-sdk.js');
    const { getAISDKTools } = await import('../../tools/index.js');

    const currentSession = context.getCurrentSession();
    if (!currentSession) {
      return 'No active session. Start chatting first to see context usage.';
    }

    const modelName = currentSession.model;

    // Get model context limit (default to 200k for Claude Sonnet 4.5)
    // TODO: Get actual limit from model metadata
    const contextLimit = 200000;

    // Calculate token counts
    context.addLog('[Context] Calculating token counts...');

    // System prompt tokens
    const systemPromptTokens = await countTokens(SYSTEM_PROMPT, modelName);

    // System tools tokens (calculate individual tool tokens)
    const tools = getAISDKTools();
    const toolTokens: Record<string, number> = {};
    let toolsTokensTotal = 0;

    for (const [toolName, toolDef] of Object.entries(tools)) {
      const toolJson = JSON.stringify(toolDef);
      const tokens = await countTokens(toolJson, modelName);
      toolTokens[toolName] = tokens;
      toolsTokensTotal += tokens;
    }

    // Messages tokens
    let messagesTokens = 0;
    for (const msg of currentSession.messages) {
      const msgTokens = await countTokens(msg.content, modelName);
      messagesTokens += msgTokens;
    }

    // Calculate totals and percentages
    const usedTokens = systemPromptTokens + toolsTokensTotal + messagesTokens;
    const freeTokens = contextLimit - usedTokens;
    const autocompactBuffer = Math.floor(contextLimit * 0.225); // 22.5%
    const realFreeTokens = freeTokens - autocompactBuffer;

    const usedPercent = ((usedTokens / contextLimit) * 100).toFixed(1);
    const systemPromptPercent = ((systemPromptTokens / contextLimit) * 100).toFixed(1);
    const toolsPercent = ((toolsTokensTotal / contextLimit) * 100).toFixed(1);
    const messagesPercent = ((messagesTokens / contextLimit) * 100).toFixed(1);
    const freePercent = ((realFreeTokens / contextLimit) * 100).toFixed(1);
    const bufferPercent = ((autocompactBuffer / contextLimit) * 100).toFixed(1);

    // Create visual bar chart (30 blocks for better resolution)
    const createBarChart = (): string[] => {
      const totalBlocks = 30;
      const systemPromptBlocks = Math.floor((systemPromptTokens / contextLimit) * totalBlocks);
      const toolsBlocks = Math.floor((toolsTokensTotal / contextLimit) * totalBlocks);
      const messagesBlocks = Math.floor((messagesTokens / contextLimit) * totalBlocks);
      const usedBlocks = systemPromptBlocks + toolsBlocks + messagesBlocks;
      const freeBlocks = totalBlocks - usedBlocks;

      // Line 1: System prompt (blue)
      const line1 = '█'.repeat(systemPromptBlocks) + '░'.repeat(totalBlocks - systemPromptBlocks);

      // Line 2: Tools (green)
      const line2 = '░'.repeat(systemPromptBlocks) + '█'.repeat(toolsBlocks) + '░'.repeat(totalBlocks - systemPromptBlocks - toolsBlocks);

      // Line 3: Messages (yellow)
      const line3 = '░'.repeat(systemPromptBlocks + toolsBlocks) + '█'.repeat(messagesBlocks) + '░'.repeat(freeBlocks);

      return [line1, line2, line3];
    };

    const [bar1, bar2, bar3] = createBarChart();

    // Format tool list with tokens (sorted by size)
    const toolList = Object.entries(toolTokens)
      .sort((a, b) => b[1] - a[1])
      .map(([name, tokens]) => `    ${name}: ${formatTokenCount(tokens)} tokens`)
      .join('\n');

    // Format output with clean visual hierarchy
    const output = `
Context Usage: ${formatTokenCount(usedTokens)}/${formatTokenCount(contextLimit)} tokens (${usedPercent}%)
Model: ${modelName}

Visual Breakdown:
  ${bar1}  System prompt: ${formatTokenCount(systemPromptTokens)} (${systemPromptPercent}%)
  ${bar2}  Tools:         ${formatTokenCount(toolsTokensTotal)} (${toolsPercent}%)
  ${bar3}  Messages:      ${formatTokenCount(messagesTokens)} (${messagesPercent}%)

Available Space:
  • Free: ${formatTokenCount(realFreeTokens)} tokens (${freePercent}%)
  • Buffer: ${formatTokenCount(autocompactBuffer)} tokens (${bufferPercent}%)

System Tools (${Object.keys(tools).length} total):
${toolList}
`.trim();

    return output;
  },
};

/**
 * Sessions command - Switch between chat sessions
 */
const sessionsCommand: Command = {
  id: 'sessions',
  label: '/sessions',
  description: 'View and switch between chat sessions',
  execute: async (context) => {
    const { formatSessionDisplay } = await import('../../utils/session-title.js');
    const sessions = context.getSessions();

    if (sessions.length === 0) {
      return 'No sessions available. Start chatting to create a session.';
    }

    const currentSessionId = context.getCurrentSessionId();

    // Ask user to select a session
    const sessionOptions = sessions.map((session) => {
      const isCurrent = session.id === currentSessionId;
      const displayText = formatSessionDisplay(session.title, session.created);
      const label = isCurrent ? `${displayText} (current)` : displayText;

      return {
        label,
        value: session.id,
      };
    });

    context.sendMessage('Select a session to switch to:');
    const answers = await context.waitForInput({
      type: 'selection',
      questions: [
        {
          id: 'session',
          question: 'Which session do you want to switch to?',
          options: sessionOptions,
        },
      ],
    });

    const selectedSessionId = typeof answers === 'object' && !Array.isArray(answers) ? answers['session'] : '';

    if (!selectedSessionId) {
      return 'Session selection cancelled.';
    }

    // Switch to selected session
    context.setCurrentSession(selectedSessionId);

    const selectedSession = sessions.find((s) => s.id === selectedSessionId);
    const displayName = selectedSession
      ? formatSessionDisplay(selectedSession.title, selectedSession.created)
      : 'Unknown session';

    return `Switched to session: ${displayName}`;
  },
};

/**
 * New command - Create a new chat session
 */
const newCommand: Command = {
  id: 'new',
  label: '/new',
  description: 'Create a new chat session',
  execute: async (context) => {
    const aiConfig = context.getConfig();

    if (!aiConfig?.defaultProvider || !aiConfig?.defaultModel) {
      return 'No AI provider configured. Use /provider to configure a provider first.';
    }

    // Create new session with current provider and model
    const newSessionId = context.createSession(aiConfig.defaultProvider, aiConfig.defaultModel);
    context.setCurrentSession(newSessionId);

    return `Created new chat session with ${aiConfig.defaultProvider} (${aiConfig.defaultModel})`;
  },
};

/**
 * Bashes command - Manage background bash processes
 */
const bashesCommand: Command = {
  id: 'bashes',
  label: '/bashes',
  description: 'Manage background bash processes',
  execute: async (context) => {
    const { bashManager } = await import('../../tools/bash-manager.js');
    const processes = bashManager.list();

    if (processes.length === 0) {
      return 'No background bash processes found.';
    }

    // Format process list
    const processOptions = processes.map((proc) => {
      const status = proc.isRunning ? '🟢 Running' : '🔴 Completed';
      const duration = Math.floor(proc.duration / 1000);
      const durationStr = duration > 60
        ? `${Math.floor(duration / 60)}m ${duration % 60}s`
        : `${duration}s`;

      return {
        label: `${status} [${durationStr}] ${proc.command}`,
        value: proc.id,
      };
    });

    context.sendMessage(`Found ${processes.length} background bash process${processes.length !== 1 ? 'es' : ''}:`);
    const answers = await context.waitForInput({
      type: 'selection',
      questions: [
        {
          id: 'action',
          question: 'What do you want to do?',
          options: [
            { label: 'View details', value: 'view' },
            { label: 'Kill a process', value: 'kill' },
            { label: 'Cancel', value: 'cancel' },
          ],
        },
      ],
    });

    const action = typeof answers === 'object' && !Array.isArray(answers) ? answers['action'] : '';

    if (!action || action === 'cancel') {
      return 'Cancelled.';
    }

    // Select process
    context.sendMessage('Select a process:');
    const processAnswers = await context.waitForInput({
      type: 'selection',
      questions: [
        {
          id: 'process',
          question: 'Which process?',
          options: processOptions,
        },
      ],
    });

    const selectedId = typeof processAnswers === 'object' && !Array.isArray(processAnswers)
      ? processAnswers['process']
      : '';

    if (!selectedId) {
      return 'No process selected.';
    }

    if (action === 'view') {
      const output = bashManager.getOutput(selectedId);
      if (!output) {
        return 'Process not found.';
      }

      const status = output.isRunning ? 'Running' : `Completed (exit code: ${output.exitCode})`;
      const duration = Math.floor(output.duration / 1000);

      let result = `
Process: ${selectedId}
Command: ${output.command}
Status: ${status}
Duration: ${duration}s

=== stdout ===
${output.stdout || '(empty)'}
`;

      if (output.stderr) {
        result += `
=== stderr ===
${output.stderr}`;
      }

      return result.trim();
    }

    if (action === 'kill') {
      const success = bashManager.kill(selectedId);
      if (!success) {
        return 'Failed to kill process (not found).';
      }

      return `Sent termination signal to process ${selectedId}`;
    }

    return 'Unknown action.';
  },
};

/**
 * All registered commands
 */
export const commands: Command[] = [
  providerCommand,
  modelCommand,
  logsCommand,
  helpCommand,
  surveyCommand,
  contextCommand,
  sessionsCommand,
  newCommand,
  bashesCommand,
];

/**
 * Get command by ID
 */
export function getCommand(id: string): Command | undefined {
  return commands.find(cmd => cmd.id === id);
}

/**
 * Get command by label (e.g., '/model')
 */
export function getCommandByLabel(label: string): Command | undefined {
  return commands.find(cmd => cmd.label === label);
}

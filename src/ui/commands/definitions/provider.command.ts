/**
 * Provider Command
 * Configure and switch AI providers
 */

import type { Command } from '../types.js';
import { configureProvider } from '../helpers/provider-config.js';

export const providerCommand: Command = {
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
        const { AI_PROVIDERS } = await import('../../../config/ai-config.js');
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
          const { getProvider } = await import('../../../providers/index.js');
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
          const { getProvider } = await import('../../../providers/index.js');
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
    const { AI_PROVIDERS } = await import('../../../config/ai-config.js');
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
      const { getProvider } = await import('../../../providers/index.js');
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
        const { getProvider } = await import('../../../providers/index.js');
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

          // After configuration, get fresh config from store
          const updatedConfig = context.getConfig();
          const updatedProviderConfig = updatedConfig?.providers?.[providerId as keyof typeof updatedConfig.providers];

          // Check if fully configured
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
          const { getDefaultModel } = await import('../../../core/session-service.js');
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

          // Update UI state
          context.setUISelectedProvider(providerId as ProviderId);
          context.setUISelectedModel(defaultModel);

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
        const { getDefaultModel } = await import('../../../core/session-service.js');
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
      const { getProvider } = await import('../../../providers/index.js');
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
        const { getDefaultModel } = await import('../../../core/session-service.js');
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

        // Update UI state
        context.setUISelectedProvider(providerId as ProviderId);
        context.setUISelectedModel(defaultModel);

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
      const { getDefaultModel } = await import('../../../core/session-service.js');
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

      const { getProvider } = await import('../../../providers/index.js');
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
      const { getDefaultModel } = await import('../../../core/session-service.js');
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
      const { getProvider } = await import('../../../providers/index.js');
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
      const { getProvider } = await import('../../../providers/index.js');
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
      const { getProvider } = await import('../../../providers/index.js');
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

export default providerCommand;

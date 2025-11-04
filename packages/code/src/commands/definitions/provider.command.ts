/**
 * Provider Command (Refactored)
 * Configure and switch AI providers
 *
 * REFACTORED: Reduced from 759 lines to ~200 lines by extracting helpers
 */

import { configureProvider } from '../helpers/provider-config.js';
import {
  askSelectProvider,
  ensureConfiguredAndSwitch,
  ensureProviderConfigured,
  switchToProvider,
} from '../helpers/provider-selection.js';
import {
  interactiveSetProviderConfig,
  setProviderConfigValue,
} from '../helpers/provider-set-value.js';
import type { Command } from '../types.js';

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
        const { AI_PROVIDERS } = await import('@sylphx/code-core');
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
        const providerId = previousArgs[1];
        if (!providerId) return [];

        try {
          const { getProvider } = await import('@sylphx/code-core');
          const provider = getProvider(providerId as any);
          const schema = provider.getConfigSchema();
          return schema.map((field) => ({
            id: field.key,
            label: field.label,
            value: field.key,
          }));
        } catch (error) {
          return [];
        }
      },
    },
    {
      name: 'value',
      description: 'Setting value (for set action)',
      required: false,
      loadOptions: async (previousArgs) => {
        const providerId = previousArgs[1];
        const key = previousArgs[2];
        if (!providerId || !key) return [];

        try {
          const { getProvider } = await import('@sylphx/code-core');
          const provider = getProvider(providerId as any);
          const schema = provider.getConfigSchema();
          const field = schema.find((f) => f.key === key);

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
    const { AI_PROVIDERS } = await import('@sylphx/code-core');

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

      const action =
        typeof actionAnswers === 'object' && !Array.isArray(actionAnswers)
          ? actionAnswers['action']
          : '';
      if (!action) {
        return 'Action cancelled.';
      }

      // Ask which provider
      const providerId = await askSelectProvider(
        context,
        action === 'use'
          ? 'Which provider do you want to use?'
          : 'Which provider do you want to configure?',
        action === 'use' ? 'Select provider to use:' : 'Select provider to configure:'
      );

      if (!providerId) {
        return 'Provider selection cancelled.';
      }

      if (action === 'use') {
        // Use provider (with optional configuration)
        return await ensureConfiguredAndSwitch(context, providerId, true);
      } else {
        // Set provider - use helper function
        return await configureProvider(context, providerId);
      }
    }

    // Case 2: /provider use - ask which provider to use
    if (context.args.length === 1 && context.args[0] === 'use') {
      const providerId = await askSelectProvider(
        context,
        'Which provider do you want to use?',
        'Select provider:'
      );

      if (!providerId) {
        return 'Provider selection cancelled.';
      }

      // Ensure configured and switch
      return await ensureConfiguredAndSwitch(context, providerId, true);
    }

    // Case 3: /provider use [name] - switch to specific provider
    if (context.args.length === 2 && context.args[0] === 'use') {
      const providerId = context.args[1];

      if (!(providerId in AI_PROVIDERS)) {
        return `Invalid provider: ${providerId}. Available: ${Object.keys(AI_PROVIDERS).join(', ')}`;
      }

      // Ensure configured and switch (without auto-prompt)
      return await ensureConfiguredAndSwitch(context, providerId, false);
    }

    // Case 4: /provider set - ask which provider to configure
    if (context.args.length === 1 && context.args[0] === 'set') {
      const { AI_PROVIDERS } = await import('@sylphx/code-core');
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

      const providerId =
        typeof providerAnswers === 'object' && !Array.isArray(providerAnswers)
          ? providerAnswers['provider']
          : '';
      if (!providerId) {
        return 'Provider selection cancelled.';
      }

      // Interactive set provider config
      return await interactiveSetProviderConfig(context, providerId);
    }

    // Case 5: /provider set [name] - ask which key to set
    if (context.args.length === 2 && context.args[0] === 'set') {
      const providerId = context.args[1];

      if (!(providerId in AI_PROVIDERS)) {
        return `Invalid provider: ${providerId}. Available: ${Object.keys(AI_PROVIDERS).join(', ')}`;
      }

      // Interactive set provider config
      return await interactiveSetProviderConfig(context, providerId);
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
      const { getProvider } = await import('@sylphx/code-core');
      const provider = getProvider(providerId as any);
      const schema = provider.getConfigSchema();

      const validKeys = schema.map((f) => f.key);
      if (!validKeys.includes(key)) {
        return `Invalid key: ${key}. Valid keys for ${providerId}: ${validKeys.join(', ')}`;
      }

      // Set config value directly
      return await setProviderConfigValue(context, providerId, key, value, schema);
    }

    return (
      'Usage:\n' +
      '  /provider - Select action and provider\n' +
      '  /provider use - Select provider to use\n' +
      '  /provider use [name] - Switch to provider\n' +
      '  /provider set - Configure a provider\n' +
      '  /provider set [name] - Configure specific provider\n' +
      '  /provider set [name] [key] [value] - Set provider config directly'
    );
  },
};

export default providerCommand;

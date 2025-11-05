/**
 * Provider Command
 * Configure and switch AI providers using component-based UI
 */

import { createElement } from 'react';
import { ProviderManagement } from '../../screens/chat/components/ProviderManagement.js';
import type { Command } from '../types.js';

export const providerCommand: Command = {
  id: 'provider',
  label: '/provider',
  description: 'Manage AI providers',
  args: [],

  execute: async (context) => {
    const action = context.args[0] as 'use' | 'configure' | undefined;

    // Validate action
    if (action && action !== 'use' && action !== 'configure') {
      await context.sendMessage(
        `Unknown action: ${action}\n\n` +
          'Usage:\n' +
          '  /provider - Select action (use/configure)\n' +
          '  /provider use - Select provider to use\n' +
          '  /provider configure - Configure a provider'
      );
      return;
    }

    // Get AI config
    const aiConfig = context.getConfig();

    // Set input component with callbacks
    context.setInputComponent(
      createElement(ProviderManagement, {
        initialAction: action,
        aiConfig,
        onComplete: () => {
          context.setInputComponent(null);
          context.addLog('[provider] Provider management closed');
        },
        onSelectProvider: (providerId) => {
          // Update provider in store
          context.updateProvider(providerId as any, {});
          context.setAIConfig({ ...aiConfig, defaultProvider: providerId } as any);
          context.addLog(`[provider] Switched to provider: ${providerId}`);
        },
        onConfigureProvider: (providerId, config) => {
          context.updateProvider(providerId as any, config);
          context.addLog(`[provider] Configured provider: ${providerId}`);
        },
      })
    );

    context.addLog(`[provider] Provider management opened with action: ${action || 'select'}`);
  },
};

export default providerCommand;

/**
 * Provider Command
 * Configure and switch AI providers using component-based UI
 */

import { ProviderManagement } from '../../screens/chat/components/ProviderManagementV2.js';
import type { Command } from '../types.js';

export const providerCommand: Command = {
  id: 'provider',
  label: '/provider',
  description: 'Manage AI providers',
  args: [
    {
      name: 'action',
      description: 'Action to perform (use/configure)',
      required: false,
      loadOptions: async () => {
        return [
          { id: 'use', label: 'use', value: 'use' },
          { id: 'configure', label: 'configure', value: 'configure' },
        ];
      },
    },
    {
      name: 'provider-id',
      description: 'Provider to use or configure',
      required: false,
      loadOptions: async (previousArgs, context) => {
        try {
          const aiConfig = context?.getConfig();
          if (!aiConfig?.providers) {
            return [];
          }

          const providers = Object.keys(aiConfig.providers);
          return providers.map((id) => ({
            id,
            label: id,
            value: id,
          }));
        } catch (error) {
          return [];
        }
      },
    },
  ],

  execute: async (context) => {
    const action = context.args[0] as 'use' | 'configure' | undefined;
    const providerId = context.args[1];

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

    const aiConfig = context.getConfig();

    // If both action and providerId are provided, handle directly
    if (action && providerId) {
      if (action === 'use') {
        // Direct provider switch
        context.updateProvider(providerId as any, {});
        const updatedConfig = {
          ...aiConfig,
          defaultProvider: providerId,
        } as any;
        context.setAIConfig(updatedConfig);

        // Save to server
        await context.saveConfig(updatedConfig);

        const providerConfig = aiConfig?.providers?.[providerId] || {};
        const providerDefaultModel = providerConfig.defaultModel as string;
        context.addLog(`[provider] Switched to provider: ${providerId} (model: ${providerDefaultModel || 'default'}) and saved config`);
        return `Switched to provider: ${providerId}`;
      } else if (action === 'configure') {
        // For configure with direct provider, still show UI to enter credentials
        // Fall through to UI below
      }
    }

    // Show UI for interactive selection
    context.setInputComponent(
      <ProviderManagement
        initialAction={action}
        initialProviderId={providerId}
        aiConfig={aiConfig}
        onComplete={() => {
          context.setInputComponent(null);
          context.addLog('[provider] Provider management closed');
        }}
        onSelectProvider={async (providerId) => {
          // Update store state
          context.updateProvider(providerId as any, {});
          const updatedConfig = {
            ...aiConfig,
            defaultProvider: providerId,
            // ❌ Don't set top-level defaultModel
            // Model should come from provider's default-model
          } as any;
          context.setAIConfig(updatedConfig);

          // CRITICAL: Save to server!
          await context.saveConfig(updatedConfig);

          const providerConfig = aiConfig?.providers?.[providerId] || {};
          const providerDefaultModel = providerConfig.defaultModel as string;
          context.addLog(`[provider] Switched to provider: ${providerId} (model: ${providerDefaultModel || 'default'}) and saved config`);
        }}
        onConfigureProvider={async (providerId, config) => {
          // Update store state
          context.updateProvider(providerId as any, config);

          // Build updated config
          const currentConfig = context.getConfig();
          const updatedConfig = {
            ...currentConfig!,
            providers: {
              ...currentConfig!.providers,
              [providerId]: config,
            },
          } as any;
          context.setAIConfig(updatedConfig);

          // CRITICAL: Save to server!
          await context.saveConfig(updatedConfig);
          context.addLog(`[provider] Configured provider: ${providerId} and saved config`);
        }}
      />,
      'Provider Management'
    );

    context.addLog(`[provider] Provider management opened with action: ${action || 'select'}`);
  },
};

export default providerCommand;

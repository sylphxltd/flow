/**
 * Provider Command
 * Configure and switch AI providers using component-based UI
 */

import { ProviderManagement } from '../../screens/chat/components/ProviderManagementV2.js';
import { getActionCompletions, getProviderCompletions } from '../../completions/provider.js';
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
        return getActionCompletions();
      },
    },
    {
      name: 'provider-id',
      description: 'Provider to use or configure',
      required: false,
      loadOptions: async () => {
        return getProviderCompletions();
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

    // Get store
    const { useAppStore } = await import('@sylphx/code-client');
    const store = useAppStore.getState();
    const aiConfig = store.aiConfig;

    // If both action and providerId are provided, handle directly
    if (action && providerId) {
      if (action === 'use') {
        // Direct provider switch
        store.updateProvider(providerId as any, {});
        const updatedConfig = {
          ...aiConfig,
          defaultProvider: providerId,
        } as any;
        store.setAIConfig(updatedConfig);

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
          // Get fresh store reference
          const { useAppStore } = await import('@sylphx/code-client');
          const freshStore = useAppStore.getState();
          const freshAiConfig = freshStore.aiConfig;

          // Update store state
          freshStore.updateProvider(providerId as any, {});
          const updatedConfig = {
            ...freshAiConfig,
            defaultProvider: providerId,
            // ❌ Don't set top-level defaultModel
            // Model should come from provider's default-model
          } as any;
          freshStore.setAIConfig(updatedConfig);

          // CRITICAL: Save to server!
          await context.saveConfig(updatedConfig);

          const providerConfig = freshAiConfig?.providers?.[providerId] || {};
          const providerDefaultModel = providerConfig.defaultModel as string;
          context.addLog(`[provider] Switched to provider: ${providerId} (model: ${providerDefaultModel || 'default'}) and saved config`);
        }}
        onConfigureProvider={async (providerId, config) => {
          // Get fresh store reference
          const { useAppStore } = await import('@sylphx/code-client');
          const freshStore = useAppStore.getState();

          // Update store state
          freshStore.updateProvider(providerId as any, config);

          // Build updated config
          const currentConfig = freshStore.aiConfig;
          const updatedConfig = {
            ...currentConfig!,
            providers: {
              ...currentConfig!.providers,
              [providerId]: config,
            },
          } as any;
          freshStore.setAIConfig(updatedConfig);

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

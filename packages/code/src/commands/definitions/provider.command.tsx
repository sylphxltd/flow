/**
 * Provider Command
 * Configure and switch AI providers using component-based UI
 */

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

    const aiConfig = context.getConfig();

    // Direct JSX - universal approach, no helper needed!
    context.setInputComponent(
      <ProviderManagement
        initialAction={action}
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

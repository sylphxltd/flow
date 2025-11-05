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
          // Get provider's default model
          const providerConfig = aiConfig?.providers?.[providerId] || {};
          const providerDefaultModel = providerConfig['default-model'] as string | undefined;

          // Update store state
          context.updateProvider(providerId as any, {});
          const updatedConfig = {
            ...aiConfig,
            defaultProvider: providerId,
            // Update defaultModel to match provider's default
            defaultModel: providerDefaultModel,
          } as any;
          context.setAIConfig(updatedConfig);

          // CRITICAL: Save to server!
          await context.saveConfig(updatedConfig);
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

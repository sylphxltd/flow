/**
 * Provider Settings Component
 * Interactive UI for configuring AI providers
 */

import { Box, Text } from 'ink';
import { useState } from 'react';
import type { SettingsMode } from '../types/settings-mode.js';

interface ProviderSettingsProps {
  mode: Extract<SettingsMode, { type: 'provider-selection' }>;
  aiConfig: any;
  onSelectProvider: (providerId: string) => void;
  onConfigureProvider: (providerId: string, config: any) => void;
  onSelectAction: (action: 'use' | 'configure') => void;
  onCancel: () => void;
  selectedIndex: number;
}

export function ProviderSettings({
  mode,
  aiConfig,
  onSelectProvider,
  onConfigureProvider,
  onSelectAction,
  onCancel,
  selectedIndex,
}: ProviderSettingsProps) {
  const [configStep, setConfigStep] = useState<'main' | 'configure'>('main');

  // Get provider options from aiConfig (populated by server)
  const providers = aiConfig?.providers || {};
  const providerOptions = Object.entries(providers).map(([id, config]: [string, any]) => {
    // Simple check: if provider has apiKey or other config, consider it configured
    const isConfigured = config && (config.apiKey || config.configured);

    return {
      id,
      name: config.name || id.charAt(0).toUpperCase() + id.slice(1),
      configured: Boolean(isConfigured),
    };
  });

  // Step 1: Select action (use / configure)
  if (mode.step === 'select-action') {
    const actions = [
      { id: 'use', name: 'Use a provider', icon: '📡' },
      { id: 'configure', name: 'Configure a provider', icon: '⚙️' },
    ];

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            🔧 Provider Management
          </Text>
        </Box>

        {actions.map((action, idx) => {
          const isSelected = idx === selectedIndex;
          const symbol = isSelected ? '❯' : ' ';

          return (
            <Box key={action.id}>
              <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                {symbol} {action.icon} {action.name}
              </Text>
            </Box>
          );
        })}

        <Box marginTop={1}>
          <Text dimColor>
            ↑↓: Navigate  │  Enter: Select  │  Esc: Cancel
          </Text>
        </Box>
      </Box>
    );
  }

  // Step 2: Select provider
  if (mode.step === 'select-provider') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            {mode.action === 'use' ? '📡 Select Provider to Use' : '⚙️  Configure Provider'}
          </Text>
        </Box>

        {providerOptions.map((provider, idx) => {
          const isSelected = idx === selectedIndex;
          const symbol = isSelected ? '❯' : ' ';
          const configSymbol = provider.configured ? ' ✓' : '';

          return (
            <Box key={provider.id}>
              <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                {symbol} {provider.name}
                {configSymbol}
              </Text>
            </Box>
          );
        })}

        <Box marginTop={1}>
          <Text dimColor>
            ↑↓: Navigate  │  Enter: Select  │  Esc: Cancel
          </Text>
        </Box>
      </Box>
    );
  }

  if (mode.step === 'configure-provider' && mode.selectedProvider) {
    const providerName = providerOptions.find((p) => p.id === mode.selectedProvider)?.name || mode.selectedProvider;

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            ⚙️  Configure {providerName}
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text dimColor>
            Provider configuration UI will be implemented.
          </Text>
          <Text dimColor>
            (This requires tRPC endpoint to get config schema)
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>
            Esc: Cancel
          </Text>
        </Box>
      </Box>
    );
  }

  return null;
}

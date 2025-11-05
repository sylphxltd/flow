/**
 * Provider Settings Component
 * Interactive UI for configuring AI providers
 */

import { AI_PROVIDERS, getProvider } from '@sylphx/code-core';
import { Box, Text } from 'ink';
import { useState } from 'react';
import type { SettingsMode } from '../types/settings-mode.js';

interface ProviderSettingsProps {
  mode: Extract<SettingsMode, { type: 'provider-selection' }>;
  aiConfig: any;
  onSelectProvider: (providerId: string) => void;
  onConfigureProvider: (providerId: string, config: any) => void;
  onCancel: () => void;
  selectedIndex: number;
}

export function ProviderSettings({
  mode,
  aiConfig,
  onSelectProvider,
  onConfigureProvider,
  onCancel,
  selectedIndex,
}: ProviderSettingsProps) {
  const [configStep, setConfigStep] = useState<'main' | 'configure'>('main');

  // Get provider options with configured status
  const providerOptions = Object.values(AI_PROVIDERS).map((p) => {
    let isConfigured = false;
    try {
      const provider = getProvider(p.id as any);
      const providerConfig = aiConfig?.providers?.[p.id as keyof typeof aiConfig.providers];
      isConfigured = providerConfig ? provider.isConfigured(providerConfig) : false;
    } catch {
      // Provider not found
    }
    return {
      id: p.id,
      name: p.name,
      configured: isConfigured,
    };
  });

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
    const provider = getProvider(mode.selectedProvider as any);
    const schema = provider.getConfigSchema();

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            ⚙️  Configure {AI_PROVIDERS[mode.selectedProvider as keyof typeof AI_PROVIDERS]?.name}
          </Text>
        </Box>

        {schema.map((field) => (
          <Box key={field.key} flexDirection="column" marginBottom={1}>
            <Text>{field.label}:</Text>
            <Text dimColor>  {field.description}</Text>
            {field.type === 'string' && field.key.toLowerCase().includes('key') && (
              <Text color="yellow">  (Enter your API key)</Text>
            )}
          </Box>
        ))}

        <Box marginTop={1}>
          <Text dimColor>
            This will be implemented with input fields
          </Text>
        </Box>
      </Box>
    );
  }

  return null;
}

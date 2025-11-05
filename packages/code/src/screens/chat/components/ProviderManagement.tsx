/**
 * Provider Management Component
 * Self-contained component for managing providers
 * Can be used by commands via context.setInputComponent()
 */

import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

interface ProviderManagementProps {
  // Initial action (optional)
  initialAction?: 'use' | 'configure';
  // AI config from store
  aiConfig: any;
  // Callbacks
  onComplete: () => void;
  onSelectProvider: (providerId: string) => void;
  onConfigureProvider: (providerId: string, config: any) => void;
}

type Step = 'select-action' | 'select-provider' | 'configure-provider';

export function ProviderManagement({
  initialAction,
  aiConfig,
  onComplete,
  onSelectProvider,
  onConfigureProvider,
}: ProviderManagementProps) {
  const [step, setStep] = useState<Step>(initialAction ? 'select-provider' : 'select-action');
  const [action, setAction] = useState<'use' | 'configure'>(initialAction || 'use');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Get provider options from aiConfig
  const providers = aiConfig?.providers || {};
  const providerOptions = Object.entries(providers).map(([id, config]: [string, any]) => {
    const isConfigured = config && (config.apiKey || config.configured);
    return {
      id,
      name: config.name || id.charAt(0).toUpperCase() + id.slice(1),
      configured: Boolean(isConfigured),
    };
  });

  // Keyboard navigation
  useInput((char, key) => {
    if (key.escape) {
      onComplete();
      return;
    }

    // Step 1: Select action (use / configure)
    if (step === 'select-action') {
      const actions = ['use', 'configure'];

      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : actions.length - 1));
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((prev) => (prev < actions.length - 1 ? prev + 1 : 0));
        return;
      }

      if (key.return) {
        const selectedAction = actions[selectedIndex] as 'use' | 'configure';
        setAction(selectedAction);
        setStep('select-provider');
        setSelectedIndex(0); // Reset for next step
        return;
      }
    }

    // Step 2: Select provider
    if (step === 'select-provider') {
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : providerOptions.length - 1));
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((prev) => (prev < providerOptions.length - 1 ? prev + 1 : 0));
        return;
      }

      if (key.return) {
        const provider = providerOptions[selectedIndex];
        if (provider) {
          if (action === 'use') {
            onSelectProvider(provider.id);
            onComplete();
          } else {
            setSelectedProvider(provider.id);
            setStep('configure-provider');
            setSelectedIndex(0);
          }
        }
        return;
      }
    }

    // Step 3: Configure provider
    if (step === 'configure-provider') {
      // TODO: Implement configuration UI
      // For now, just ESC to go back
    }
  });

  // Render: Step 1 - Select action
  if (step === 'select-action') {
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
          <Text dimColor>↑↓: Navigate  │  Enter: Select  │  Esc: Cancel</Text>
        </Box>
      </Box>
    );
  }

  // Render: Step 2 - Select provider
  if (step === 'select-provider') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            {action === 'use' ? '📡 Select Provider to Use' : '⚙️  Configure Provider'}
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
          <Text dimColor>↑↓: Navigate  │  Enter: Select  │  Esc: Cancel</Text>
        </Box>
      </Box>
    );
  }

  // Render: Step 3 - Configure provider
  if (step === 'configure-provider' && selectedProvider) {
    const providerName =
      providerOptions.find((p) => p.id === selectedProvider)?.name || selectedProvider;

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            ⚙️  Configure {providerName}
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text dimColor>Provider configuration UI will be implemented.</Text>
          <Text dimColor>(This requires tRPC endpoint to get config schema)</Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Esc: Cancel</Text>
        </Box>
      </Box>
    );
  }

  return null;
}

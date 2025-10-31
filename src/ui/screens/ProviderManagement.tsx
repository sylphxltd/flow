/**
 * Provider Management Screen
 * Add, edit, remove AI providers
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { useAppStore } from '../stores/app-store.js';
import { useAIConfig } from '../hooks/useAIConfig.js';
import { useKeyboard } from '../hooks/useKeyboard.js';
import ProviderCard from '../components/ProviderCard.js';
import { AI_PROVIDERS, type ProviderId, getConfiguredProviders } from '../../config/ai-config.js';

type Mode = 'menu' | 'add' | 'remove' | 'view';

interface MenuItem {
  label: string;
  value: string;
}

export default function ProviderManagement() {
  const [mode, setMode] = useState<Mode>('menu');
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');

  const navigateTo = useAppStore((state) => state.navigateTo);
  const aiConfig = useAppStore((state) => state.aiConfig);
  const updateProvider = useAppStore((state) => state.updateProvider);
  const removeProvider = useAppStore((state) => state.removeProvider);
  const { saveConfig } = useAIConfig();

  useKeyboard();

  const configuredProviders = Object.keys(aiConfig?.providers || {}) as ProviderId[];

  // Menu mode
  if (mode === 'menu') {
    const items: MenuItem[] = [
      { label: '➕ Add/Update Provider', value: 'add' },
      { label: '📋 View Providers', value: 'view' },
      ...(configuredProviders.length > 0
        ? [{ label: '🗑️  Remove Provider', value: 'remove' }]
        : []),
      { label: '⬅️  Back to Main Menu', value: 'back' },
    ];

    const handleSelect = (item: MenuItem) => {
      switch (item.value) {
        case 'add':
          setMode('add');
          break;
        case 'view':
          setMode('view');
          break;
        case 'remove':
          setMode('remove');
          break;
        case 'back':
          navigateTo('main-menu');
          break;
      }
    };

    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Provider Management
          </Text>
        </Box>

        <SelectInput items={items} onSelect={handleSelect} />

        <Box marginTop={1}>
          <Text dimColor>Use ↑↓ arrows to navigate, Enter to select</Text>
        </Box>
      </Box>
    );
  }

  // View mode
  if (mode === 'view') {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Configured Providers
          </Text>
        </Box>

        {configuredProviders.length === 0 ? (
          <Box marginBottom={1}>
            <Text color="yellow">No providers configured yet</Text>
          </Box>
        ) : (
          configuredProviders.map((id) => (
            <ProviderCard
              key={id}
              providerId={id}
              apiKey={aiConfig?.providers?.[id]?.apiKey}
              defaultModel={aiConfig?.providers?.[id]?.defaultModel}
              isDefault={aiConfig?.defaultProvider === id}
            />
          ))
        )}

        <Box marginTop={1}>
          <Text dimColor>Press Esc to go back</Text>
        </Box>
      </Box>
    );
  }

  // Add mode - select provider
  if (mode === 'add' && !selectedProvider) {
    const items: MenuItem[] = Object.entries(AI_PROVIDERS).map(([id, provider]) => ({
      label: `${provider.name}${configuredProviders.includes(id as ProviderId) ? ' ✓' : ''}`,
      value: id,
    }));

    const handleSelect = (item: MenuItem) => {
      setSelectedProvider(item.value as ProviderId);
    };

    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Select Provider to Configure
          </Text>
        </Box>

        <SelectInput items={items} onSelect={handleSelect} />

        <Box marginTop={1}>
          <Text dimColor>Press Esc to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Add mode - enter API key
  if (mode === 'add' && selectedProvider) {
    const provider = AI_PROVIDERS[selectedProvider];
    const existing = aiConfig?.providers?.[selectedProvider]?.apiKey;

    const handleSubmit = async (value: string) => {
      if (!value.trim()) {
        setSelectedProvider(null);
        setApiKeyInput('');
        return;
      }

      updateProvider(selectedProvider, { apiKey: value.trim() });
      await saveConfig({ ...aiConfig!, providers: { ...aiConfig!.providers } });

      setSelectedProvider(null);
      setApiKeyInput('');
      setMode('menu');
    };

    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Configure {provider.name}
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text>Enter {provider.keyName}:</Text>
        </Box>

        <Box>
          <Text color="green">{'*'.repeat(apiKeyInput.length)}</Text>
        </Box>

        <TextInput
          value={apiKeyInput}
          onChange={setApiKeyInput}
          onSubmit={handleSubmit}
          placeholder={existing ? 'Press Enter to keep existing' : 'Enter API key...'}
          showCursor
        />

        <Box marginTop={1}>
          <Text dimColor>Enter to save, Esc to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Remove mode
  if (mode === 'remove') {
    const items: MenuItem[] = configuredProviders.map((id) => ({
      label: AI_PROVIDERS[id].name,
      value: id,
    }));

    const handleSelect = async (item: MenuItem) => {
      const providerId = item.value as ProviderId;
      removeProvider(providerId);
      await saveConfig({ ...aiConfig!, providers: { ...aiConfig!.providers } });
      setMode('menu');
    };

    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Remove Provider
          </Text>
        </Box>

        <SelectInput items={items} onSelect={handleSelect} />

        <Box marginTop={1}>
          <Text dimColor>Select provider to remove, Esc to cancel</Text>
        </Box>
      </Box>
    );
  }

  return null;
}

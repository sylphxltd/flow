/**
 * Model Selection Screen
 * Select provider and model with dynamic loading
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { useAppStore } from '../stores/app-store.js';
import { useAIConfig } from '../hooks/useAIConfig.js';
import { useKeyboard } from '../hooks/useKeyboard.js';
import { AI_PROVIDERS, type ProviderId, getConfiguredProviders } from '../../config/ai-config.js';
import { fetchModels, type ModelInfo } from '../../utils/ai-model-fetcher.js';

type Mode = 'provider' | 'model' | 'search';

interface MenuItem {
  label: string;
  value: string;
}

export default function ModelSelection() {
  const [mode, setMode] = useState<Mode>('provider');
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const navigateTo = useAppStore((state) => state.navigateTo);
  const aiConfig = useAppStore((state) => state.aiConfig);
  const selectedProvider = useAppStore((state) => state.selectedProvider);
  const setSelectedProvider = useAppStore((state) => state.setSelectedProvider);
  const setSelectedModel = useAppStore((state) => state.setSelectedModel);
  const updateProvider = useAppStore((state) => state.updateProvider);
  const setError = useAppStore((state) => state.setError);
  const { saveConfig } = useAIConfig();

  useKeyboard();

  const configuredProviders = Object.keys(aiConfig?.providers || {}) as ProviderId[];

  // Load models when provider is selected
  useEffect(() => {
    if (selectedProvider && mode === 'model') {
      loadModels();
    }
  }, [selectedProvider, mode]);

  const loadModels = async () => {
    if (!selectedProvider) return;

    setIsLoadingModels(true);
    try {
      const apiKey = aiConfig?.providers?.[selectedProvider]?.apiKey;
      const modelList = await fetchModels(selectedProvider, apiKey);
      setModels(modelList);
    } catch (err) {
      setError('Failed to load models');
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Provider selection
  if (mode === 'provider') {
    if (configuredProviders.length === 0) {
      return (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold color="cyan">
              Model Selection
            </Text>
          </Box>

          <Box marginBottom={1}>
            <Text color="yellow">⚠️  No providers configured</Text>
          </Box>

          <Box>
            <Text dimColor>Please configure providers first</Text>
          </Box>

          <Box marginTop={1}>
            <Text dimColor>Press Esc to go back</Text>
          </Box>
        </Box>
      );
    }

    const items: MenuItem[] = [
      ...configuredProviders.map((id) => ({
        label: `${AI_PROVIDERS[id].name}${aiConfig?.defaultProvider === id ? ' (Default)' : ''}`,
        value: id,
      })),
      { label: '⬅️  Back to Main Menu', value: 'back' },
    ];

    const handleSelect = (item: MenuItem) => {
      if (item.value === 'back') {
        navigateTo('main-menu');
      } else {
        setSelectedProvider(item.value as ProviderId);
        setMode('model');
      }
    };

    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Select Provider
          </Text>
        </Box>

        <SelectInput items={items} onSelect={handleSelect} />

        <Box marginTop={1}>
          <Text dimColor>Use ↑↓ arrows to navigate, Enter to select</Text>
        </Box>
      </Box>
    );
  }

  // Model selection
  if (mode === 'model') {
    if (isLoadingModels) {
      return (
        <Box>
          <Text color="yellow">⏳ Loading models...</Text>
        </Box>
      );
    }

    // Filter models by search query
    const filteredModels = models.filter(
      (m) =>
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const items: MenuItem[] = filteredModels.slice(0, 20).map((model) => ({
      label: model.name !== model.id ? `${model.name} (${model.id})` : model.id,
      value: model.id,
    }));

    const handleSelect = async (item: MenuItem) => {
      if (!selectedProvider) return;

      setSelectedModel(item.value);
      updateProvider(selectedProvider, { defaultModel: item.value });

      // Update config
      const newConfig = {
        ...aiConfig!,
        defaultProvider: selectedProvider,
        defaultModel: item.value,
        providers: {
          ...aiConfig!.providers,
          [selectedProvider]: {
            ...aiConfig!.providers?.[selectedProvider],
            defaultModel: item.value,
          },
        },
      };

      await saveConfig(newConfig);

      // Reset and go back
      setSelectedProvider(null);
      setSearchQuery('');
      setMode('provider');
      navigateTo('main-menu');
    };

    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Select Model - {selectedProvider && AI_PROVIDERS[selectedProvider].name}
          </Text>
        </Box>

        {/* Search input */}
        <Box marginBottom={1} flexDirection="column">
          <Text dimColor>Search models:</Text>
          <TextInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Type to filter..."
            showCursor
          />
        </Box>

        {/* Model list */}
        {filteredModels.length === 0 ? (
          <Box marginBottom={1}>
            <Text color="yellow">No models found</Text>
          </Box>
        ) : (
          <>
            <Box marginBottom={1}>
              <Text dimColor>
                Showing {Math.min(filteredModels.length, 20)} of {models.length} models
              </Text>
            </Box>
            <SelectInput items={items} onSelect={handleSelect} />
          </>
        )}

        <Box marginTop={1}>
          <Text dimColor>Use ↑↓ to navigate, type to search, Enter to select, Esc to cancel</Text>
        </Box>
      </Box>
    );
  }

  return null;
}

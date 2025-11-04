/**
 * Model Selection Screen
 * Select provider and model with dynamic loading
 */

import { useAIConfig, useAppStore, useKeyboard } from '@sylphx/code-client';
import {
  AI_PROVIDERS,
  fetchModels,
  getConfiguredProviders,
  type ModelInfo,
  type ProviderId,
} from '@sylphx/code-core';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import React, { useEffect, useState } from 'react';

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

  const configuredProviders = Object.keys(aiConfig?.providers || {}) as ProviderId[];

  // Load models when provider is selected
  useEffect(() => {
    if (selectedProvider && mode === 'model') {
      loadModelsAndSelectDefault();
    }
  }, [selectedProvider, mode]);

  const loadModelsAndSelectDefault = async () => {
    if (!selectedProvider) return;

    setIsLoadingModels(true);
    try {
      const providerConfig = aiConfig?.providers?.[selectedProvider] || {};
      const modelList = await fetchModels(selectedProvider, providerConfig);
      setModels(modelList);

      // Auto-select default model
      const defaultModel = providerConfig['default-model'] as string | undefined;
      const modelToSelect = defaultModel || modelList[0]?.id;

      if (modelToSelect) {
        // Automatically select and save the model
        setSelectedModel(modelToSelect);
        updateProvider(selectedProvider, { defaultModel: modelToSelect });

        // Update config
        const newConfig = {
          ...aiConfig!,
          defaultProvider: selectedProvider,
          defaultModel: modelToSelect,
          providers: {
            ...aiConfig!.providers,
            [selectedProvider]: {
              ...aiConfig!.providers?.[selectedProvider],
              defaultModel: modelToSelect,
            },
          },
        };

        await saveConfig(newConfig);

        // Reset and go back to chat
        setSelectedProvider(null);
        setSearchQuery('');
        setMode('provider');
        navigateTo('chat');
      }
    } catch (err) {
      setError('Failed to load models');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const loadModels = async () => {
    if (!selectedProvider) return;

    setIsLoadingModels(true);
    try {
      const providerConfig = aiConfig?.providers?.[selectedProvider] || {};
      const modelList = await fetchModels(selectedProvider, providerConfig);
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
            <Text color="yellow">⚠️ No providers configured</Text>
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
      { label: 'Back to Chat', value: 'back' },
    ];

    const handleSelect = (item: MenuItem) => {
      if (item.value === 'back') {
        navigateTo('chat');
      } else {
        setSelectedProvider(item.value as ProviderId);
        setMode('model');
      }
    };

    return (
      <Box flexDirection="column" flexGrow={1}>
        <Box flexShrink={0} paddingBottom={1}>
          <Text color="#00D9FF">▌ SELECT PROVIDER</Text>
        </Box>

        <Box flexGrow={1} paddingY={1}>
          <SelectInput items={items} onSelect={handleSelect} />
        </Box>

        <Box flexShrink={0} paddingTop={1}>
          <Text dimColor>↑↓ Navigate · Enter Select · Esc Back</Text>
        </Box>
      </Box>
    );
  }

  // Model selection
  if (mode === 'model') {
    if (isLoadingModels) {
      return (
        <Box>
          <Text color="yellow">Loading models...</Text>
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
      navigateTo('chat');
    };

    return (
      <Box flexDirection="column" flexGrow={1}>
        <Box flexShrink={0} paddingBottom={1}>
          <Text color="#00D9FF">▌ SELECT MODEL</Text>
          <Text dimColor> · {selectedProvider && AI_PROVIDERS[selectedProvider].name}</Text>
        </Box>

        {/* Search input */}
        <Box flexShrink={0} paddingY={1} flexDirection="column">
          <Box marginBottom={1}>
            <Text dimColor>Search</Text>
          </Box>
          <TextInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Type to filter..."
            showCursor
          />
        </Box>

        {/* Model list */}
        <Box flexGrow={1} paddingY={1} flexDirection="column">
          {filteredModels.length === 0 ? (
            <Box>
              <Text color="#FFD700">▌</Text>
              <Text dimColor> No models found</Text>
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
        </Box>

        <Box flexShrink={0} paddingTop={1}>
          <Text dimColor>↑↓ Navigate · Type Search · Enter Select · Esc Cancel</Text>
        </Box>
      </Box>
    );
  }

  return null;
}

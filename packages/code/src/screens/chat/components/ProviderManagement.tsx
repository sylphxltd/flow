/**
 * Provider Management Component
 * Self-contained component for managing providers
 * Can be used by commands via context.setInputComponent()
 */

import { Box, Text, useInput } from 'ink';
import { useState, useEffect } from 'react';
import { getProvider } from '@sylphx/code-core';
import type { ConfigField, ProviderConfig } from '@sylphx/code-core';
import TextInputWithHint from '../../../components/TextInputWithHint.js';
import { InputContentLayout } from './InputContentLayout.js';

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

  // Config form state
  const [configSchema, setConfigSchema] = useState<ConfigField[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string | number | boolean>>({});
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [editingField, setEditingField] = useState(false);
  const [tempStringValue, setTempStringValue] = useState('');

  // Get provider options from aiConfig
  const providers = aiConfig?.providers || {};
  const providerOptions = Object.entries(providers).map(([id, config]: [string, any]) => {
    const isConfigured = config && (config['api-key'] || config.apiKey || config.configured);
    return {
      id,
      name: config.name || id.charAt(0).toUpperCase() + id.slice(1),
      configured: Boolean(isConfigured),
    };
  });

  // Load config schema when entering configure step
  useEffect(() => {
    if (step === 'configure-provider' && selectedProvider) {
      try {
        const provider = getProvider(selectedProvider as any);
        const schema = provider.getConfigSchema();
        setConfigSchema(schema);

        // Initialize form values with existing config
        const existingConfig = providers[selectedProvider] || {};
        const initialValues: Record<string, string | number | boolean> = {};

        schema.forEach((field) => {
          // Use existing value or default based on type
          if (existingConfig[field.key] !== undefined) {
            initialValues[field.key] = existingConfig[field.key];
          } else if (field.type === 'boolean') {
            initialValues[field.key] = false;
          } else if (field.type === 'number') {
            initialValues[field.key] = 0;
          } else {
            initialValues[field.key] = '';
          }
        });

        setFormValues(initialValues);
        setCurrentFieldIndex(0);
      } catch (error) {
        console.error('Failed to load provider schema:', error);
      }
    }
  }, [step, selectedProvider, providers]);

  // Keyboard navigation
  useInput((char, key) => {
    if (key.escape) {
      if (editingField) {
        // Cancel editing
        setEditingField(false);
        setTempStringValue('');
      } else if (step === 'configure-provider') {
        // Go back to provider selection
        setStep('select-provider');
        setSelectedProvider(null);
        setSelectedIndex(0);
      } else {
        // Close component
        onComplete();
      }
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
        setSelectedIndex(0);
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

    // Step 3: Configure provider - don't handle input if editing
    if (step === 'configure-provider' && !editingField) {
      if (key.upArrow) {
        setCurrentFieldIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      if (key.downArrow) {
        setCurrentFieldIndex((prev) => Math.min(configSchema.length, prev + 1));
        return;
      }

      if (key.return) {
        // Last item is "Save" button
        if (currentFieldIndex === configSchema.length) {
          // Save configuration
          onConfigureProvider(selectedProvider!, formValues);
          onComplete();
        } else {
          const field = configSchema[currentFieldIndex];

          if (field.type === 'boolean') {
            // Toggle boolean
            setFormValues((prev) => ({
              ...prev,
              [field.key]: !prev[field.key],
            }));
          } else {
            // Enter editing mode for string/number
            setEditingField(true);
            setTempStringValue(String(formValues[field.key] || ''));
          }
        }
        return;
      }

      // Space to toggle boolean
      if (char === ' ') {
        const field = configSchema[currentFieldIndex];
        if (field?.type === 'boolean') {
          setFormValues((prev) => ({
            ...prev,
            [field.key]: !prev[field.key],
          }));
        }
        return;
      }
    }
  }, { isActive: !editingField });

  // Render: Step 1 - Select action
  if (step === 'select-action') {
    const actions = [
      {
        id: 'use',
        name: 'Use a provider',
        description: 'Switch to a different AI provider'
      },
      {
        id: 'configure',
        name: 'Configure a provider',
        description: 'Set up API keys and settings'
      },
    ];

    return (
      <InputContentLayout
        subtitle="Manage your AI provider settings"
        helpText="↑↓: Navigate  |  Enter: Select  |  Esc: Cancel"
      >
        {actions.map((action, idx) => {
          const isSelected = idx === selectedIndex;

          return (
            <Box key={action.id} flexDirection="column" marginBottom={1}>
              <Box>
                <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                  {isSelected ? '> ' : '  '}
                  {action.name}
                </Text>
              </Box>
              {action.description && (
                <Box marginLeft={2}>
                  <Text dimColor>{action.description}</Text>
                </Box>
              )}
            </Box>
          );
        })}
      </InputContentLayout>
    );
  }

  // Render: Step 2 - Select provider
  if (step === 'select-provider') {
    return (
      <InputContentLayout
        subtitle={
          action === 'use'
            ? 'Choose which provider to use for new conversations'
            : 'Select a provider to configure'
        }
        helpText="↑↓: Navigate  |  Enter: Select  |  Esc: Cancel"
      >
        {providerOptions.map((provider, idx) => {
          const isSelected = idx === selectedIndex;

          return (
            <Box key={provider.id} marginBottom={idx < providerOptions.length - 1 ? 1 : 0}>
              <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                {isSelected ? '> ' : '  '}
                {provider.name}
                {provider.configured && <Text dimColor> (configured)</Text>}
              </Text>
            </Box>
          );
        })}
      </InputContentLayout>
    );
  }

  // Render: Step 3 - Configure provider
  if (step === 'configure-provider' && selectedProvider) {
    const providerName = providerOptions.find((p) => p.id === selectedProvider)?.name || selectedProvider;

    // No configuration needed
    if (configSchema.length === 0) {
      return (
        <InputContentLayout
          subtitle={`${providerName} is ready to use`}
          helpText="Esc: Back"
        >
          <Box>
            <Text dimColor>No configuration required for this provider.</Text>
          </Box>
        </InputContentLayout>
      );
    }

    return (
      <InputContentLayout
        subtitle={`Enter your ${providerName} credentials`}
        helpText={
          editingField
            ? 'Enter: Save  |  Esc: Cancel'
            : '↑↓: Navigate  |  Enter: Edit/Save  |  Space: Toggle  |  Esc: Back'
        }
      >
        {/* Fields */}
        <Box flexDirection="column" marginBottom={1}>
          {configSchema.map((field, idx) => {
            const isSelected = idx === currentFieldIndex && !editingField;
            const value = formValues[field.key];
            const isEmpty = field.type === 'string' && !value;

            return (
              <Box key={field.key} flexDirection="column" marginBottom={1}>
                <Box>
                  <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                    {isSelected ? '> ' : '  '}
                    {field.label}
                    {field.required && <Text color="red"> *</Text>}
                  </Text>
                </Box>

                {field.description && (
                  <Box marginLeft={2}>
                    <Text dimColor>{field.description}</Text>
                  </Box>
                )}

                <Box marginLeft={2}>
                  {field.type === 'boolean' ? (
                    <Text color={isSelected ? 'cyan' : 'gray'}>
                      [{value ? 'X' : ' '}] {value ? 'Enabled' : 'Disabled'}
                    </Text>
                  ) : editingField && idx === currentFieldIndex ? (
                    <TextInputWithHint
                      value={tempStringValue}
                      onChange={setTempStringValue}
                      onSubmit={(val) => {
                        const finalValue = field.type === 'number' ? Number(val) : val;
                        setFormValues((prev) => ({
                          ...prev,
                          [field.key]: finalValue,
                        }));
                        setEditingField(false);
                        setTempStringValue('');
                      }}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                      showCursor
                    />
                  ) : (
                    <Text color={isEmpty ? 'gray' : isSelected ? 'cyan' : 'white'}>
                      {field.secret && value ? '•'.repeat(String(value).length) : value || '(empty)'}
                    </Text>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Save Button */}
        <Box marginBottom={1}>
          <Text bold color={currentFieldIndex === configSchema.length ? 'green' : 'white'}>
            {currentFieldIndex === configSchema.length ? '> ' : '  '}
            Save Configuration
          </Text>
        </Box>
      </InputContentLayout>
    );
  }

  return null;
}

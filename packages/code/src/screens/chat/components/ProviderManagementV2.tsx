/**
 * Provider Management Component (V2 - Composition-based)
 * Uses InlineSelection composition pattern instead of custom selection logic
 *
 * ARCHITECTURE: Composition pattern
 * - Uses InlineSelection for step 1 and 2
 * - Custom form for step 3 (provider configuration)
 * - No duplicated filter/selection logic
 */

import { Box, Text, useInput } from 'ink';
import { useState, useEffect } from 'react';
import { useTRPCClient } from '@sylphx/code-client';
import type { ConfigField } from '@sylphx/code-core';
import { InlineSelection } from '../../../components/selection/index.js';
import type { SelectionOption } from '../../../hooks/useSelection.js';
import TextInputWithHint from '../../../components/TextInputWithHint.js';
import { InputContentLayout } from './InputContentLayout.js';

interface ProviderManagementProps {
  initialAction?: 'use' | 'configure';
  initialProviderId?: string;
  aiConfig: any;
  onComplete: () => void;
  onSelectProvider: (providerId: string) => void | Promise<void>;
  onConfigureProvider: (providerId: string, config: any) => void | Promise<void>;
}

type Step = 'select-action' | 'select-provider' | 'configure-provider';

export function ProviderManagement({
  initialAction,
  initialProviderId,
  aiConfig,
  onComplete,
  onSelectProvider,
  onConfigureProvider,
}: ProviderManagementProps) {
  const trpc = useTRPCClient();

  // If initialProviderId is provided, skip to the appropriate step
  const initialStep: Step = initialProviderId
    ? (initialAction === 'configure' ? 'configure-provider' : 'select-action')
    : (initialAction ? 'select-provider' : 'select-action');

  const [step, setStep] = useState<Step>(initialStep);
  const [action, setAction] = useState<'use' | 'configure'>(initialAction || 'use');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(initialProviderId || null);

  // Config form state
  const [configSchema, setConfigSchema] = useState<ConfigField[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string | number | boolean>>({});
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [editingField, setEditingField] = useState(false);
  const [tempStringValue, setTempStringValue] = useState('');

  // Fetch provider metadata from server
  const [providerMetadata, setProviderMetadata] = useState<Record<string, { name: string; description: string; isConfigured: boolean }>>({});

  useEffect(() => {
    async function loadProviderMetadata() {
      try {
        const result = await trpc.config.getProviders.query({ cwd: process.cwd() });
        // Store full provider info including isConfigured status
        const metadata: Record<string, { name: string; description: string; isConfigured: boolean }> = {};
        for (const [id, info] of Object.entries(result)) {
          metadata[id] = { name: info.name, description: info.description, isConfigured: info.isConfigured };
        }
        setProviderMetadata(metadata);
      } catch (error) {
        console.error('Failed to load provider metadata:', error);
      }
    }
    loadProviderMetadata();
  }, [trpc]);

  // Get provider options from aiConfig
  const providers = aiConfig?.providers || {};
  const providerOptions: SelectionOption[] = Object.entries(providers).map(([id, config]: [string, any]) => {
    const metadata = providerMetadata[id];
    const name = metadata?.name || config.name || id.charAt(0).toUpperCase() + id.slice(1);
    const description = metadata?.description || 'AI provider';
    const isConfigured = metadata?.isConfigured || false;

    return {
      label: name,
      value: id,
      description,
      ...(isConfigured && {
        badge: {
          text: '✓',
          color: 'green',
        },
      }),
    };
  });

  // Action options for step 1
  const actionOptions: SelectionOption[] = [
    {
      label: 'Use a provider',
      value: 'use',
      description: 'Switch to a different AI provider',
    },
    {
      label: 'Configure a provider',
      value: 'configure',
      description: 'Set up API keys and settings',
    },
  ];

  // Load config schema when entering configure step
  useEffect(() => {
    if (step === 'configure-provider' && selectedProvider) {
      async function loadSchema() {
        try {
          const result = await trpc.config.getProviderSchema.query({
            providerId: selectedProvider as any,
          });

          if (!result.success) {
            console.error('Failed to load provider schema:', result.error);
            return;
          }

          const schema = result.schema;
          setConfigSchema(schema);

          // Initialize form values with existing config
          const existingConfig = providers[selectedProvider] || {};
          const initialValues: Record<string, string | number | boolean> = {};

          schema.forEach((field) => {
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

      loadSchema();
    }
  }, [step, selectedProvider, providers, trpc]);

  // Step 1: Select action (use InlineSelection)
  if (step === 'select-action') {
    return (
      <InlineSelection
        options={actionOptions}
        subtitle="Manage your AI provider settings"
        filter={false}  // No filter needed for 2 options
        onSelect={(value) => {
          setAction(value as 'use' | 'configure');
          setStep('select-provider');
        }}
        onCancel={onComplete}
      />
    );
  }

  // Step 2: Select provider (use InlineSelection)
  if (step === 'select-provider') {
    return (
      <InlineSelection
        options={providerOptions}
        subtitle={
          action === 'use'
            ? 'Choose which provider to use for new conversations'
            : 'Select a provider to configure'
        }
        filter={true}
        onSelect={(value) => {
          if (action === 'use') {
            Promise.resolve(onSelectProvider(value as string)).then(() => {
              onComplete();
            });
          } else {
            setSelectedProvider(value as string);
            setStep('configure-provider');
          }
        }}
        onCancel={onComplete}
      />
    );
  }

  // Step 3: Configure provider (custom form - keyboard handling)
  useInput((char, key) => {
    if (key.escape) {
      if (editingField) {
        setEditingField(false);
        setTempStringValue('');
      } else {
        // Go back to provider selection
        setStep('select-provider');
        setSelectedProvider(null);
      }
      return;
    }

    if (!editingField) {
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
          Promise.resolve(onConfigureProvider(selectedProvider!, formValues)).then(() => {
            onComplete();
          });
        } else {
          const field = configSchema[currentFieldIndex];

          if (field.type === 'boolean') {
            setFormValues((prev) => ({
              ...prev,
              [field.key]: !prev[field.key],
            }));
          } else {
            setEditingField(true);
            setTempStringValue(String(formValues[field.key] || ''));
          }
        }
        return;
      }

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

  // Render: Step 3 - Configure provider
  if (step === 'configure-provider' && selectedProvider) {
    const providerName = providerOptions.find((p) => p.value === selectedProvider)?.label || selectedProvider;

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

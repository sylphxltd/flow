import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import type { MCPServerID } from '../config/servers.js';
import { MCP_SERVER_REGISTRY } from '../config/servers.js';

interface ConfigField {
  name: string;
  description: string;
  required: boolean;
  secret: boolean;
  defaultValue?: string;
  currentValue?: string;
  value: string;
  isSecret: boolean;
}

interface ServerConfig {
  id: MCPServerID;
  name: string;
  description: string;
  fields: ConfigField[];
}

interface MCPConfigUIProps {
  serverId: MCPServerID;
  existingValues: Record<string, string>;
  onSave: (values: Record<string, string>) => void;
  onCancel: () => void;
}

export function MCPConfigUI({ serverId, existingValues, onSave, onCancel }: MCPConfigUIProps) {
  const { exit } = useApp();
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Initialize server configuration
  useEffect(() => {
    const server = MCP_SERVER_REGISTRY[serverId];
    if (!server) return;

    const fields: ConfigField[] = [];

    if (server.envVars) {
      Object.entries(server.envVars).forEach(([key, config]) => {
        fields.push({
          name: key,
          description: config.description,
          required: config.required,
          secret: config.secret || false,
          defaultValue: config.default,
          currentValue: existingValues[key],
          value: existingValues[key] || config.default || '',
          isSecret: config.secret || false,
        });
      });
    }

    setServerConfig({
      id: server.id,
      name: server.name,
      description: server.description,
      fields,
    });
  }, [serverId, existingValues]);

  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.ctrl && input === 'c') {
      onCancel();
      return;
    }

    if (key.return) {
      if (currentFieldIndex === serverConfig?.fields.length) {
        handleSubmit();
      } else {
        setCurrentFieldIndex((prev) => Math.min(prev + 1, serverConfig?.fields.length || 0));
      }
      return;
    }

    if (key.tab) {
      setCurrentFieldIndex((prev) => (prev + 1) % ((serverConfig?.fields.length || 0) + 1));
      return;
    }

    if (key.shift && input === 'Tab') {
      setCurrentFieldIndex((prev) => (prev === 0 ? serverConfig?.fields.length || 0 : prev - 1));
      return;
    }

    if (key.upArrow) {
      setCurrentFieldIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setCurrentFieldIndex((prev) => Math.min(prev + 1, serverConfig?.fields.length || 0));
      return;
    }
  });

  const handleSubmit = useCallback(() => {
    if (!serverConfig) return;

    setIsSubmitting(true);
    const values: Record<string, string> = {};

    serverConfig.fields.forEach((field) => {
      values[field.name] = field.value || field.defaultValue || '';
    });

    onSave(values);
    setShowSuccess(true);

    setTimeout(() => {
      exit();
    }, 1500);
  }, [serverConfig, onSave, exit]);

  const updateFieldValue = useCallback(
    (index: number, value: string) => {
      if (!serverConfig) return;

      const newFields = [...serverConfig.fields];
      newFields[index] = { ...newFields[index], value };

      setServerConfig({
        ...serverConfig,
        fields: newFields,
      });
    },
    [serverConfig]
  );

  if (!serverConfig) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">❌ Loading server configuration...</Text>
      </Box>
    );
  }

  if (showSuccess) {
    return (
      <Box flexDirection="column" justifyContent="center" alignItems="center" height={10}>
        <Text color="green" bold>
          ✅ Configuration saved successfully!
        </Text>
        <Text color="gray">Exiting...</Text>
      </Box>
    );
  }

  const isLastField = currentFieldIndex === serverConfig.fields.length;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="blue">
          🔧 Configure {serverConfig.description}
        </Text>
      </Box>

      {/* Server Info */}
      <Box marginBottom={1}>
        <Text color="gray">
          Server: {serverConfig.name} ({serverConfig.id})
        </Text>
      </Box>

      {/* Configuration Fields */}
      {serverConfig.fields.map((field, index) => {
        const isActive = index === currentFieldIndex;
        const hasValue = field.value || field.currentValue;
        const displayValue =
          field.isSecret && hasValue
            ? '•'.repeat(Math.min(8, hasValue.length))
            : field.value || field.defaultValue || '';

        return (
          <Box key={field.name} marginBottom={1} flexDirection="column">
            <Box marginBottom={1}>
              <Text color={isActive ? 'cyan' : 'white'}>
                {field.name}
                {field.required && <Text color="red"> *</Text>}
                {field.defaultValue && !field.value && (
                  <Text color="gray"> (default: {field.defaultValue})</Text>
                )}
              </Text>
            </Box>

            <Box>
              <Text color="gray" dimColor>
                {field.description}
              </Text>
            </Box>

            <Box marginTop={1}>
              {isActive ? (
                <TextInput
                  value={field.value}
                  onChange={(value) => updateFieldValue(index, value)}
                  placeholder={field.defaultValue || ''}
                  mask={field.isSecret ? '•' : undefined}
                  focus={isActive}
                />
              ) : (
                <Box borderStyle="round" borderColor={hasValue ? 'green' : 'gray'} paddingX={1}>
                  <Text color={hasValue ? 'white' : 'gray'}>
                    {displayValue || <Text color="gray">Empty</Text>}
                  </Text>
                </Box>
              )}
            </Box>

            {isActive && (
              <Box marginTop={1}>
                <Text color="cyan" dimColor>
                  {field.isSecret ? '🔒 Secret field' : '📝 Text field'}
                  {' • '}
                  {field.required ? 'Required' : 'Optional'}
                  {field.currentValue && ' • Has existing value'}
                </Text>
              </Box>
            )}
          </Box>
        );
      })}

      {/* Submit Button */}
      <Box marginTop={2}>
        {isLastField ? (
          <Box flexDirection="column">
            <Text bold color={isSubmitting ? 'gray' : 'green'}>
              {isSubmitting ? '⏳ Saving...' : '💾 Save Configuration'}
            </Text>
            <Box marginTop={1}>
              <Text color="gray" dimColor>
                Press Enter to save, Esc to cancel
              </Text>
            </Box>
          </Box>
        ) : (
          <Text color="gray" dimColor>
            Navigate with ↑↓ Tab, press Enter on Save Configuration
          </Text>
        )}
      </Box>

      {/* Help */}
      <Box marginTop={2} borderStyle="single" padding={1}>
        <Text color="gray">
          <Text bold>Controls:</Text> Tab/↑↓ Navigate • Enter Select • Esc Cancel • Ctrl+C Exit
        </Text>
      </Box>
    </Box>
  );
}

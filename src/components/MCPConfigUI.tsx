import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useState, useEffect, useCallback } from 'react';
import type { MCPServerID } from '../config/servers.js';
import {
  MCP_SERVER_REGISTRY,
  getAllServerIDs,
  getAllEnvVars,
  getSecretEnvVars,
  getRequiredEnvVars,
} from '../config/servers.js';
import { targetManager } from '../core/target-manager.js';
import {
  getNestedProperty,
  setNestedProperty,
  deleteNestedProperty,
} from '../utils/target-config.js';

interface ConfigField {
  name: string;
  description: string;
  required: boolean;
  secret: boolean;
  defaultValue?: string;
  currentValue?: string;
  value: string;
  isSecret: boolean;
  options?: string[];
}

interface ServerConfig {
  id: MCPServerID;
  name: string;
  description: string;
  fields: ConfigField[];
}

interface MCPConfigUIProps {
  serverId?: MCPServerID;
  existingValues: Record<string, string>;
  targetId: string;
  cwd: string;
  onSave: (values: Record<string, string>, selectedServerId?: MCPServerID) => void;
  onCancel: () => void;
}

export function MCPConfigUI({
  serverId,
  existingValues,
  targetId,
  cwd,
  onSave,
  onCancel,
}: MCPConfigUIProps) {
  const { exit } = useApp();
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mode, setMode] = useState<'server-select' | 'config'>('server-select');
  const [isSelectingOption, setIsSelectingOption] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);

  const availableServers = getAllServerIDs().map((id) => {
    const server = MCP_SERVER_REGISTRY[id];
    return {
      id,
      name: server?.name || id,
      description: server?.description || 'Unknown server',
      fields: server?.envVars ? Object.keys(server.envVars) : [],
    };
  });

  useEffect(() => {
    if (serverId && MCP_SERVER_REGISTRY[serverId]) {
      setMode('config');
      const server = MCP_SERVER_REGISTRY[serverId];
      if (!server) return;

      const fields: ConfigField[] = [];

      if (server.envVars) {
        Object.entries(server.envVars).forEach(([key, config]) => {
          let options: string[] | undefined;

          if (key === 'EMBEDDING_MODEL') {
            options = [
              'text-embedding-3-small',
              'text-embedding-3-large',
              'text-embedding-ada-002',
            ];
          } else if (key === 'GEMINI_MODEL') {
            options = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
          }

          fields.push({
            name: key,
            description: config.description,
            required: config.required,
            secret: config.secret || false,
            defaultValue: config.default,
            currentValue: existingValues[key],
            value: existingValues[key] || config.default || '',
            isSecret: config.secret || false,
            options,
          });
        });
      }

      setServerConfig({
        id: server.id,
        name: server.name,
        description: server.description,
        fields,
      });
    } else {
      setMode('server-select');
      setServerConfig(null);
    }
  }, [serverId, existingValues]);

  useInput((input, key) => {
    if (key.escape) {
      if (isSelectingOption) {
        setIsSelectingOption(false);
        return;
      }
      onCancel();
      return;
    }

    if (key.ctrl && input === 'c') {
      onCancel();
      return;
    }

    if (key.return) {
      if (isSelectingOption) {
        const currentField = serverConfig?.fields[currentFieldIndex];
        if (currentField?.options) {
          updateFieldValue(currentFieldIndex, currentField.options[selectedOptionIndex]);
        }
        setIsSelectingOption(false);
        setCurrentFieldIndex((prev) => Math.min(prev + 1, serverConfig?.fields.length || 0));
        return;
      }

      if (mode === 'server-select') {
        if (currentFieldIndex < availableServers.length) {
          const selectedServer = availableServers[currentFieldIndex];
          const serverId = selectedServer.id as MCPServerID;
          const server = MCP_SERVER_REGISTRY[serverId];

          if (server) {
            const fields: ConfigField[] = [];

            if (server.envVars) {
              Object.entries(server.envVars).forEach(([key, config]) => {
                let options: string[] | undefined;

                if (key === 'EMBEDDING_MODEL') {
                  options = [
                    'text-embedding-3-small',
                    'text-embedding-3-large',
                    'text-embedding-ada-002',
                  ];
                } else if (key === 'GEMINI_MODEL') {
                  options = [
                    'gemini-2.5-flash',
                    'gemini-2.5-pro',
                    'gemini-1.5-flash',
                    'gemini-1.5-pro',
                  ];
                }

                fields.push({
                  name: key,
                  description: config.description,
                  required: config.required,
                  secret: config.secret || false,
                  defaultValue: config.default,
                  currentValue: existingValues[key],
                  value: existingValues[key] || config.default || '',
                  isSecret: config.secret || false,
                  options,
                });
              });
            }

            setServerConfig({
              id: server.id,
              name: server.name,
              description: server.description,
              fields,
            });
            setMode('config');
            setCurrentFieldIndex(0);
          }
        }
      } else if (currentFieldIndex === serverConfig?.fields.length) {
        handleSubmit();
      } else {
        const currentField = serverConfig?.fields[currentFieldIndex];
        if (currentField?.options) {
          const currentValueIndex = currentField.options.findIndex(
            (opt) => opt === currentField.value
          );
          setSelectedOptionIndex(currentValueIndex >= 0 ? currentValueIndex : 0);
          setIsSelectingOption(true);
        } else {
          setCurrentFieldIndex((prev) => Math.min(prev + 1, serverConfig?.fields.length || 0));
        }
      }
      return;
    }

    if (key.tab) {
      if (mode === 'server-select') {
        setCurrentFieldIndex((prev) => (prev + 1) % availableServers.length);
      } else {
        setCurrentFieldIndex((prev) => (prev + 1) % ((serverConfig?.fields.length || 0) + 1));
      }
      return;
    }

    if (key.upArrow) {
      if (isSelectingOption) {
        setSelectedOptionIndex((prev) => Math.max(0, prev - 1));
      } else {
        setCurrentFieldIndex((prev) => Math.max(0, prev - 1));
      }
      return;
    }

    if (key.downArrow) {
      if (isSelectingOption) {
        const currentField = serverConfig?.fields[currentFieldIndex];
        const maxIndex = (currentField?.options?.length || 1) - 1;
        setSelectedOptionIndex((prev) => Math.min(prev + 1, maxIndex));
      } else {
        const maxIndex =
          mode === 'server-select' ? availableServers.length - 1 : serverConfig?.fields.length || 0;
        setCurrentFieldIndex((prev) => Math.min(prev + 1, maxIndex));
      }
      return;
    }
  });

  const handleSubmit = useCallback(async () => {
    if (!serverConfig || mode !== 'config') return;

    setIsSubmitting(true);
    const values: Record<string, string> = {};

    serverConfig.fields.forEach((field) => {
      values[field.name] = field.value || field.defaultValue || '';
    });

    try {
      const target = targetManager.getTarget(targetId);
      if (!target) {
        throw new Error(`Target not found: ${targetId}`);
      }

      const config = await target.readConfig(cwd);
      const mcpConfigPath = target.config.mcpConfigPath;
      const mcpSection = getNestedProperty(config, mcpConfigPath) || {};

      const server = MCP_SERVER_REGISTRY[serverConfig.id];
      const serverConfig_env = server.config.type === 'local' ? server.config.environment : {};

      const updatedEnv = { ...serverConfig_env };
      for (const [key, value] of Object.entries(values)) {
        if (value && value.trim() !== '') {
          updatedEnv[key] = value;
        }
      }

      mcpSection[server.name] = {
        ...server.config,
        environment: updatedEnv,
      };

      setNestedProperty(config, mcpConfigPath, mcpSection);
      await target.writeConfig(cwd, config);

      onSave(values, serverConfig.id);
      setShowSuccess(true);

      setTimeout(() => {
        exit();
      }, 1500);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setIsSubmitting(false);
    }
  }, [serverConfig, mode, targetId, cwd, onSave, exit]);

  const updateFieldValue = useCallback(
    (index: number, value: string) => {
      if (!serverConfig || mode !== 'config') return;

      const newFields = [...serverConfig.fields];
      newFields[index] = { ...newFields[index], value };

      setServerConfig({
        ...serverConfig,
        fields: newFields,
      });
    },
    [serverConfig, mode]
  );

  if (mode === 'server-select') {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            ▸ MCP Configuration
          </Text>
        </Box>

        <Box flexDirection="column">
          {availableServers.map((server, index) => {
            const isActive = index === currentFieldIndex;
            const hasConfig = server.fields && server.fields.length > 0;

            return (
              <Box key={server.id}>
                <Text>
                  <Text color={isActive ? 'cyan' : 'gray'}>{isActive ? '❯ ' : '  '}</Text>
                  <Text color={isActive ? 'white' : 'gray'} bold={isActive}>
                    {server.name}
                  </Text>
                  {hasConfig && (
                    <Text color="gray" dimColor>
                      {' '}
                      ({server.fields.length})
                    </Text>
                  )}
                </Text>
              </Box>
            );
          })}
        </Box>

        <Box marginTop={1}>
          <Text dimColor>↑↓ navigate • ⏎ select • esc cancel</Text>
        </Box>
      </Box>
    );
  }

  if (!serverConfig) {
    return (
      <Box>
        <Text color="yellow">Loading...</Text>
      </Box>
    );
  }

  if (showSuccess) {
    return (
      <Box>
        <Text color="green">✓ Saved</Text>
      </Box>
    );
  }

  const isLastField = currentFieldIndex === serverConfig.fields.length;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ▸ {serverConfig.name}
        </Text>
      </Box>

      {serverConfig.fields.map((field, index) => {
        const isActive = index === currentFieldIndex;
        const hasValue = field.value || field.currentValue;
        const displayValue =
          field.isSecret && hasValue
            ? '•'.repeat(Math.min(8, hasValue.length))
            : field.value || field.defaultValue || '';

        return (
          <Box key={field.name} marginBottom={1}>
            <Box width={20}>
              <Text color={isActive ? 'cyan' : 'gray'}>
                {isActive ? '❯ ' : '  '}
                {field.name}
                {field.required && <Text color="red">*</Text>}
              </Text>
            </Box>
            <Box flexGrow={1}>
              {isActive ? (
                field.options ? (
                  isSelectingOption ? (
                    <Box flexDirection="column">
                      {field.options.map((option, optIndex) => (
                        <Text
                          key={option}
                          color={optIndex === selectedOptionIndex ? 'cyan' : 'gray'}
                        >
                          {optIndex === selectedOptionIndex ? '❯ ' : '  '}
                          {option}
                        </Text>
                      ))}
                    </Box>
                  ) : (
                    <Text color="white">{field.value || field.defaultValue} ▼</Text>
                  )
                ) : (
                  <TextInput
                    value={field.value}
                    onChange={(value) => updateFieldValue(index, value)}
                    placeholder={field.defaultValue || field.description}
                    mask={field.isSecret ? '•' : undefined}
                  />
                )
              ) : (
                <Text color={hasValue ? 'white' : 'gray'}>{displayValue || '—'}</Text>
              )}
            </Box>
          </Box>
        );
      })}

      <Box marginTop={1}>
        {isLastField ? (
          <Text color={isSubmitting ? 'gray' : 'green'}>
            {isSubmitting ? '⏳ Saving...' : '❯ Press ⏎ to save'}
          </Text>
        ) : (
          <Text dimColor>↑↓ navigate • ⏎ next • esc cancel</Text>
        )}
      </Box>
    </Box>
  );
}

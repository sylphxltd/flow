import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useState, useCallback } from 'react';
import type { MCPServerID } from '../config/servers.js';
import { MCP_SERVER_REGISTRY } from '../config/servers.js';

interface ConfigField {
  name: string;
  description: string;
  required: boolean;
  secret: boolean;
  default?: string;
  value: string;
  options?: string[];
}

interface MCPState {
  id: MCPServerID;
  name: string;
  description: string;
  selected: boolean;
  configured: boolean;
  healthy: boolean;
  fields: ConfigField[];
  config: Record<string, string>;
}

type ViewMode = 'selection' | 'config';

interface InteractiveMCPSetupProps {
  availableServers: MCPServerID[];
  existingConfigs?: Record<MCPServerID, Record<string, string>>;
  onComplete: (configs: Record<MCPServerID, Record<string, string>>) => void;
  onCancel: () => void;
}

export function InteractiveMCPSetup({
  availableServers,
  existingConfigs = {},
  onComplete,
  onCancel,
}: InteractiveMCPSetupProps) {
  // Initialize MCP states
  const [mcpStates, setMCPStates] = useState<MCPState[]>(() =>
    availableServers.map((id) => {
      const server = MCP_SERVER_REGISTRY[id];
      const fields: ConfigField[] = server.envVars
        ? Object.entries(server.envVars).map(([name, config]) => {
            let options: string[] | undefined;
            if (name === 'EMBEDDING_MODEL') {
              options = [
                'text-embedding-3-small',
                'text-embedding-3-large',
                'text-embedding-ada-002',
              ];
            } else if (name === 'GEMINI_MODEL') {
              options = [
                'gemini-2.5-flash',
                'gemini-2.5-pro',
                'gemini-1.5-flash',
                'gemini-1.5-pro',
              ];
            }

            const existingValue = existingConfigs[id]?.[name];
            return {
              name,
              description: config.description,
              required: config.required,
              secret: config.secret || false,
              default: config.default,
              value: existingValue || config.default || '',
              options,
            };
          })
        : [];

      const hasConfig = fields.length > 0;
      const isConfigured = hasConfig
        ? fields.every((f) => !f.required || (f.value && f.value.trim() !== ''))
        : true;

      return {
        id,
        name: server.name,
        description: server.description,
        selected: server.required || server.defaultInInit || false,
        configured: isConfigured,
        healthy: isConfigured,
        fields,
        config: existingConfigs[id] || {},
      };
    })
  );

  const [viewMode, setViewMode] = useState<ViewMode>('selection');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingMCP, setEditingMCP] = useState<MCPServerID | null>(null);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [isSelectingOption, setIsSelectingOption] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);

  const currentEditingState = mcpStates.find((m) => m.id === editingMCP);

  // Keyboard handlers
  useInput((input, key) => {
    // Global escape handler
    if (key.escape) {
      if (isSelectingOption) {
        setIsSelectingOption(false);
        return;
      }
      if (viewMode === 'config') {
        setViewMode('selection');
        setEditingMCP(null);
        setCurrentFieldIndex(0);
        return;
      }
      onCancel();
      return;
    }

    // Ctrl+C handler
    if (key.ctrl && input === 'c') {
      onCancel();
      return;
    }

    // Selection view handlers
    if (viewMode === 'selection') {
      if (input === ' ') {
        // Toggle selection
        setMCPStates((prev) => {
          const updated = [...prev];
          const mcp = updated[selectedIndex];
          if (!MCP_SERVER_REGISTRY[mcp.id].required) {
            updated[selectedIndex] = { ...mcp, selected: !mcp.selected };
          }
          return updated;
        });
        return;
      }

      if (key.return) {
        const mcp = mcpStates[selectedIndex];
        if (mcp.selected && mcp.fields.length > 0) {
          // Open config
          setEditingMCP(mcp.id);
          setViewMode('config');
          setCurrentFieldIndex(0);
        }
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((prev) => Math.min(mcpStates.length - 1, prev + 1));
        return;
      }

      if (key.ctrl && input === 's') {
        // Finish setup
        handleFinishSetup();
        return;
      }
    }

    // Config view handlers
    if (viewMode === 'config' && currentEditingState) {
      if (key.return) {
        if (isSelectingOption) {
          const currentField = currentEditingState.fields[currentFieldIndex];
          if (currentField?.options) {
            updateFieldValue(currentFieldIndex, currentField.options[selectedOptionIndex]);
          }
          setIsSelectingOption(false);
          setCurrentFieldIndex((prev) => Math.min(prev + 1, currentEditingState.fields.length));
          return;
        }

        if (currentFieldIndex === currentEditingState.fields.length) {
          // Save and return
          handleSaveConfig();
          return;
        }

        const currentField = currentEditingState.fields[currentFieldIndex];
        if (currentField?.options) {
          const currentValueIndex = currentField.options.findIndex(
            (opt) => opt === currentField.value
          );
          setSelectedOptionIndex(currentValueIndex >= 0 ? currentValueIndex : 0);
          setIsSelectingOption(true);
        } else {
          setCurrentFieldIndex((prev) => Math.min(prev + 1, currentEditingState.fields.length));
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
          const currentField = currentEditingState.fields[currentFieldIndex];
          const maxIndex = (currentField?.options?.length || 1) - 1;
          setSelectedOptionIndex((prev) => Math.min(prev + 1, maxIndex));
        } else {
          setCurrentFieldIndex((prev) => Math.min(prev + 1, currentEditingState.fields.length));
        }
        return;
      }
    }
  });

  const updateFieldValue = useCallback(
    (fieldIndex: number, value: string) => {
      if (!editingMCP) return;

      setMCPStates((prev) => {
        const updated = [...prev];
        const mcpIndex = updated.findIndex((m) => m.id === editingMCP);
        if (mcpIndex === -1) return prev;

        const mcp = updated[mcpIndex];
        const newFields = [...mcp.fields];
        newFields[fieldIndex] = { ...newFields[fieldIndex], value };

        updated[mcpIndex] = {
          ...mcp,
          fields: newFields,
        };

        return updated;
      });
    },
    [editingMCP]
  );

  const handleSaveConfig = useCallback(() => {
    if (!editingMCP || !currentEditingState) return;

    setMCPStates((prev) => {
      const updated = [...prev];
      const mcpIndex = updated.findIndex((m) => m.id === editingMCP);
      if (mcpIndex === -1) return prev;

      const mcp = updated[mcpIndex];
      const config: Record<string, string> = {};
      mcp.fields.forEach((field) => {
        if (field.value && field.value.trim() !== '') {
          config[field.name] = field.value;
        }
      });

      const isConfigured = mcp.fields.every(
        (f) => !f.required || (f.value && f.value.trim() !== '')
      );

      updated[mcpIndex] = {
        ...mcp,
        config,
        configured: isConfigured,
        healthy: isConfigured,
      };

      return updated;
    });

    setViewMode('selection');
    setEditingMCP(null);
    setCurrentFieldIndex(0);
  }, [editingMCP, currentEditingState]);

  const handleFinishSetup = useCallback(() => {
    const configs: Record<MCPServerID, Record<string, string>> = {};

    mcpStates.forEach((mcp) => {
      if (mcp.selected && mcp.configured) {
        configs[mcp.id] = mcp.config;
      }
    });

    onComplete(configs);
  }, [mcpStates, onComplete]);

  // Selection view
  if (viewMode === 'selection') {
    const selectedMCPs = mcpStates.filter((m) => m.selected);
    const allConfigured = selectedMCPs.every((m) => m.configured);
    const hasSelections = selectedMCPs.length > 0;

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            ▸ Select MCP Tools
          </Text>
          <Text color="gray" dimColor>
            {' '}
            ({selectedMCPs.length} selected)
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          {mcpStates.map((mcp, index) => {
            const isActive = index === selectedIndex;
            const isRequired = MCP_SERVER_REGISTRY[mcp.id].required;
            const needsConfig = mcp.fields.length > 0 && !mcp.configured;
            const hasNoFields = mcp.fields.length === 0;

            let statusIcon = '';
            let statusColor: 'green' | 'yellow' | 'gray' = 'gray';

            if (mcp.selected) {
              if (hasNoFields) {
                statusIcon = '✓ OK';
                statusColor = 'green';
              } else if (mcp.configured && mcp.healthy) {
                statusIcon = '✓ OK';
                statusColor = 'green';
              } else if (needsConfig) {
                statusIcon = '⚙ Configure';
                statusColor = 'yellow';
              }
            } else {
              statusIcon = '－';
              statusColor = 'gray';
            }

            return (
              <Box key={mcp.id}>
                <Text>
                  <Text color={isActive ? 'cyan' : 'gray'}>{isActive ? '❯ ' : '  '}</Text>
                  <Text color={isActive ? 'white' : 'gray'}>
                    {mcp.selected ? '◉' : '◯'} {mcp.name}
                  </Text>
                  {isRequired && (
                    <Text color="red" dimColor>
                      {' '}
                      (required)
                    </Text>
                  )}
                  <Text color={statusColor} dimColor>
                    {' '}
                    [{statusIcon}]
                  </Text>
                </Text>
              </Box>
            );
          })}
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Space: toggle • ⏎: configure • ↑↓: navigate</Text>
          {hasSelections && allConfigured && (
            <Text key="finish-ready" color="green">
              Ctrl+S: finish setup
            </Text>
          )}
          {hasSelections && !allConfigured && (
            <Text key="configure-warning" color="yellow">
              ⚠ Configure all selected tools before finishing
            </Text>
          )}
          <Text dimColor>Esc: cancel</Text>
        </Box>
      </Box>
    );
  }

  // Config view
  if (viewMode === 'config' && currentEditingState) {
    const isLastField = currentFieldIndex === currentEditingState.fields.length;

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            ▸ Configure: {currentEditingState.name}
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="gray" dimColor>
            {currentEditingState.description}
          </Text>
        </Box>

        {currentEditingState.fields.map((field, index) => {
          const isActive = index === currentFieldIndex;
          const hasValue = field.value && field.value.trim() !== '';
          const displayValue =
            field.secret && hasValue
              ? '•'.repeat(Math.min(8, field.value.length))
              : field.value || field.default || '';

          return (
            <Box key={field.name} marginBottom={1}>
              <Box width={25}>
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
                      <Text color="white">{field.value || field.default} ▼</Text>
                    )
                  ) : (
                    <TextInput
                      value={field.value}
                      onChange={(value) => updateFieldValue(index, value)}
                      placeholder={field.default || field.description}
                      mask={field.secret ? '•' : undefined}
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
            <Box flexDirection="column">
              <Text color="green">❯ Press ⏎ to save and return</Text>
              <Text dimColor>Esc: cancel</Text>
            </Box>
          ) : (
            <Text dimColor>↑↓: navigate • ⏎: next • Esc: back</Text>
          )}
        </Box>
      </Box>
    );
  }

  return null;
}

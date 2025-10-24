import { Box, Text, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import { useState, useCallback } from 'react';
import type { MCPServerID } from '../config/servers.js';
import { MCP_SERVER_REGISTRY } from '../config/servers.js';

type InitStep = 'welcome' | 'mcp-config' | 'agents' | 'rules' | 'complete';

interface ServerConfig {
  id: MCPServerID;
  values: Record<string, string>;
}

interface ModernInitUIProps {
  targetId: string;
  servers: MCPServerID[];
  onComplete: (serverConfigs: ServerConfig[]) => void;
  onCancel: () => void;
}

export function ModernInitUI({ targetId, servers, onComplete, onCancel }: ModernInitUIProps) {
  const { exit } = useApp();
  const [step, setStep] = useState<InitStep>('welcome');
  const [currentServerIndex, setCurrentServerIndex] = useState(0);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [isSelectingOption, setIsSelectingOption] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [serverConfigs, setServerConfigs] = useState<ServerConfig[]>(
    servers.map((id) => ({ id, values: {} }))
  );

  const currentServer = serverConfigs[currentServerIndex];
  const serverDef = currentServer ? MCP_SERVER_REGISTRY[currentServer.id] : null;
  const fields = serverDef?.envVars
    ? Object.entries(serverDef.envVars).map(([name, config]) => {
        let options: string[] | undefined;
        if (name === 'EMBEDDING_MODEL') {
          options = ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'];
        } else if (name === 'GEMINI_MODEL') {
          options = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        }
        return {
          name,
          description: config.description,
          required: config.required,
          secret: config.secret || false,
          default: config.default,
          value: currentServer.values[name] || config.default || '',
          options,
        };
      })
    : [];

  const updateFieldValue = useCallback(
    (fieldName: string, value: string) => {
      setServerConfigs((prev) => {
        const updated = [...prev];
        updated[currentServerIndex] = {
          ...updated[currentServerIndex],
          values: {
            ...updated[currentServerIndex].values,
            [fieldName]: value,
          },
        };
        return updated;
      });
    },
    [currentServerIndex]
  );

  const skipServer = useCallback(() => {
    if (currentServerIndex < serverConfigs.length - 1) {
      setCurrentServerIndex((prev) => prev + 1);
      setCurrentFieldIndex(0);
    } else {
      setStep('agents');
    }
  }, [currentServerIndex, serverConfigs.length]);

  const completeServer = useCallback(() => {
    if (currentServerIndex < serverConfigs.length - 1) {
      setCurrentServerIndex((prev) => prev + 1);
      setCurrentFieldIndex(0);
    } else {
      setStep('agents');
    }
  }, [currentServerIndex, serverConfigs.length]);

  useInput((input, key) => {
    if (key.escape) {
      if (isSelectingOption) {
        setIsSelectingOption(false);
        return;
      }
      if (step === 'welcome') {
        onCancel();
        return;
      }
    }

    if (key.ctrl && input === 'c') {
      onCancel();
      return;
    }

    if (step === 'welcome') {
      if (key.return) {
        if (servers.length > 0) {
          setStep('mcp-config');
        } else {
          setStep('agents');
        }
      }
      return;
    }

    if (step === 'mcp-config') {
      if (key.ctrl && input === 's') {
        skipServer();
        return;
      }

      if (key.return) {
        if (isSelectingOption) {
          const currentField = fields[currentFieldIndex];
          if (currentField?.options) {
            updateFieldValue(currentField.name, currentField.options[selectedOptionIndex]);
          }
          setIsSelectingOption(false);
          setCurrentFieldIndex((prev) => Math.min(prev + 1, fields.length));
          return;
        }

        if (currentFieldIndex === fields.length) {
          completeServer();
        } else {
          const currentField = fields[currentFieldIndex];
          if (currentField?.options) {
            const currentValueIndex = currentField.options.findIndex(
              (opt) => opt === currentField.value
            );
            setSelectedOptionIndex(currentValueIndex >= 0 ? currentValueIndex : 0);
            setIsSelectingOption(true);
          } else {
            setCurrentFieldIndex((prev) => Math.min(prev + 1, fields.length));
          }
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
          const currentField = fields[currentFieldIndex];
          const maxIndex = (currentField?.options?.length || 1) - 1;
          setSelectedOptionIndex((prev) => Math.min(prev + 1, maxIndex));
        } else {
          setCurrentFieldIndex((prev) => Math.min(prev + 1, fields.length));
        }
        return;
      }
    }

    if (step === 'agents' || step === 'rules') {
      if (key.return) {
        if (step === 'agents') {
          setStep('rules');
        } else if (step === 'rules') {
          setStep('complete');
          setTimeout(() => {
            onComplete(serverConfigs);
            exit();
          }, 1500);
        }
      }
    }
  });

  // Welcome screen
  if (step === 'welcome') {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            ▸ Sylphx Flow Setup
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text>
            Target: <Text color="green">{targetId}</Text>
          </Text>
        </Box>

        <Box marginBottom={1} flexDirection="column">
          <Text dimColor>This will configure:</Text>
          <Text dimColor> • MCP tools ({servers.length} servers)</Text>
          <Text dimColor> • Development agents</Text>
          <Text dimColor> • Custom rules</Text>
        </Box>

        <Box marginTop={1}>
          <Text color="cyan">Press ⏎ to continue</Text>
        </Box>
      </Box>
    );
  }

  // MCP Configuration
  if (step === 'mcp-config' && currentServer && serverDef) {
    const isLastField = currentFieldIndex === fields.length;
    const hasRequiredFields = fields.some((f) => f.required);

    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            ▸ Configure MCP Tools
          </Text>
          <Text color="gray" dimColor>
            {' '}
            ({currentServerIndex + 1}/{serverConfigs.length})
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text>{serverDef.name}</Text>
        </Box>

        {fields.map((field, index) => {
          const isActive = index === currentFieldIndex;
          const hasValue = field.value;
          const displayValue =
            field.secret && hasValue
              ? '•'.repeat(Math.min(8, hasValue.length))
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
                      onChange={(value) => updateFieldValue(field.name, value)}
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
              <Text color="green">❯ Press ⏎ to continue</Text>
              {!hasRequiredFields && (
                <Text color="gray" dimColor>
                  Ctrl+S to skip
                </Text>
              )}
            </Box>
          ) : (
            <Text dimColor>↑↓ navigate • ⏎ next • Ctrl+S skip</Text>
          )}
        </Box>
      </Box>
    );
  }

  // Agents installation
  if (step === 'agents') {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            ▸ Installing Agents
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="green">
            <Spinner type="dots" /> Installing development agents...
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text color="cyan">Press ⏎ to continue</Text>
        </Box>
      </Box>
    );
  }

  // Rules installation
  if (step === 'rules') {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            ▸ Installing Rules
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="green">
            <Spinner type="dots" /> Installing custom rules...
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text color="cyan">Press ⏎ to continue</Text>
        </Box>
      </Box>
    );
  }

  // Complete
  if (step === 'complete') {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="green">
            ✓ Setup Complete
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text color="gray">• MCP tools configured</Text>
          <Text color="gray">• Agents installed</Text>
          <Text color="gray">• Rules installed</Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Ready to use!</Text>
        </Box>
      </Box>
    );
  }

  return null;
}

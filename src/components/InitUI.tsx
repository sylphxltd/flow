import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useState, useCallback } from 'react';
import type { MCPServerID } from '../config/servers.js';
import { MCP_SERVER_REGISTRY } from '../config/servers.js';

interface InitUIProps {
  servers: MCPServerID[];
  onComplete: (
    configuredServers: Array<{ id: MCPServerID; values: Record<string, string> }>
  ) => void;
  onCancel: () => void;
}

interface ServerStatus {
  id: MCPServerID;
  status: 'pending' | 'configuring' | 'completed' | 'skipped';
  values: Record<string, string>;
}

export function InitUI({ servers, onComplete, onCancel }: InitUIProps) {
  const { exit } = useApp();
  const [serverStatuses, setServerStatuses] = useState<ServerStatus[]>(
    servers.map((id) => ({
      id,
      status: 'pending',
      values: {},
    }))
  );
  const [currentServerIndex, setCurrentServerIndex] = useState(0);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [isSelectingOption, setIsSelectingOption] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);

  const currentServer = serverStatuses[currentServerIndex];
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
      setServerStatuses((prev) => {
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
    setServerStatuses((prev) => {
      const updated = [...prev];
      updated[currentServerIndex] = {
        ...updated[currentServerIndex],
        status: 'skipped',
      };
      return updated;
    });

    if (currentServerIndex < serverStatuses.length - 1) {
      setCurrentServerIndex((prev) => prev + 1);
      setCurrentFieldIndex(0);
    } else {
      const configured = serverStatuses
        .filter((s) => s.status === 'completed')
        .map((s) => ({ id: s.id, values: s.values }));
      onComplete(configured);
      exit();
    }
  }, [currentServerIndex, serverStatuses, onComplete, exit]);

  const completeServer = useCallback(() => {
    setServerStatuses((prev) => {
      const updated = [...prev];
      updated[currentServerIndex] = {
        ...updated[currentServerIndex],
        status: 'completed',
      };
      return updated;
    });

    if (currentServerIndex < serverStatuses.length - 1) {
      setCurrentServerIndex((prev) => prev + 1);
      setCurrentFieldIndex(0);
    } else {
      const configured = serverStatuses
        .filter((s) => s.status === 'completed' || s.status === 'pending')
        .map((s) => ({ id: s.id, values: s.values }));
      onComplete(configured);
      exit();
    }
  }, [currentServerIndex, serverStatuses, onComplete, exit]);

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
  });

  if (!currentServer || !serverDef) {
    return (
      <Box>
        <Text color="green">✓ All servers configured</Text>
      </Box>
    );
  }

  const isLastField = currentFieldIndex === fields.length;
  const hasRequiredFields = fields.some((f) => f.required);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ▸ {serverDef.name} ({currentServerIndex + 1}/{serverStatuses.length})
        </Text>
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
          <Text dimColor>↑↓ navigate • ⏎ next • Ctrl+S skip • esc cancel</Text>
        )}
      </Box>
    </Box>
  );
}

import { Box, Text, useApp, useInput } from 'ink';
import { useState, useCallback } from 'react';
import type { MCPServerID } from '../config/servers.js';
import { MCP_SERVER_REGISTRY } from '../config/servers.js';
import { Header, StatusMessage, Controls, InputField, SelectField } from './ui/index.js';

type Step = 'welcome' | 'mcp-config' | 'installing' | 'complete';

interface ServerConfig {
  id: MCPServerID;
  values: Record<string, string>;
}

interface InitFlowUIProps {
  targetId: string;
  servers: MCPServerID[];
  onComplete: (serverConfigs: ServerConfig[]) => Promise<void>;
  onCancel: () => void;
}

export function InitFlowUI({ targetId, servers, onComplete, onCancel }: InitFlowUIProps) {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>('welcome');
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

  const completeCurrentServer = useCallback(() => {
    if (currentServerIndex < serverConfigs.length - 1) {
      setCurrentServerIndex((prev) => prev + 1);
      setCurrentFieldIndex(0);
    } else {
      setStep('installing');
      onComplete(serverConfigs).then(() => {
        setStep('complete');
        setTimeout(() => exit(), 2000);
      });
    }
  }, [currentServerIndex, serverConfigs, onComplete, exit]);

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

    // Welcome screen
    if (step === 'welcome') {
      if (key.return) {
        if (servers.length > 0) {
          setStep('mcp-config');
        } else {
          setStep('installing');
          onComplete([]).then(() => {
            setStep('complete');
            setTimeout(() => exit(), 2000);
          });
        }
      }
      return;
    }

    // MCP Config
    if (step === 'mcp-config') {
      if (key.ctrl && input === 's') {
        completeCurrentServer();
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
          completeCurrentServer();
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
  });

  // Welcome
  if (step === 'welcome') {
    return (
      <Box flexDirection="column">
        <Header title="Sylphx Flow Setup" subtitle={`Target: ${targetId}`} />

        <Box marginBottom={1} flexDirection="column">
          <Text dimColor>This will configure:</Text>
          <Text dimColor> • MCP tools ({servers.length} servers)</Text>
          <Text dimColor> • Development agents</Text>
          <Text dimColor> • Custom rules</Text>
        </Box>

        <Controls items={[{ key: 'enter', label: '⏎ continue' }]} />
      </Box>
    );
  }

  // MCP Configuration
  if (step === 'mcp-config' && currentServer && serverDef) {
    const isLastField = currentFieldIndex === fields.length;

    return (
      <Box flexDirection="column">
        <Header
          title="MCP Configuration"
          subtitle={`${serverDef.name} (${currentServerIndex + 1}/${serverConfigs.length})`}
        />

        {fields.map((field, index) => {
          const isActive = index === currentFieldIndex;

          if (field.options) {
            return (
              <SelectField
                key={field.name}
                label={field.name}
                options={field.options}
                value={field.value}
                selectedIndex={selectedOptionIndex}
                active={isActive}
                isOpen={isActive && isSelectingOption}
                required={field.required}
              />
            );
          }

          return (
            <InputField
              key={field.name}
              label={field.name}
              value={field.value}
              onChange={(value) => updateFieldValue(field.name, value)}
              placeholder={field.default || field.description}
              secret={field.secret}
              active={isActive}
              required={field.required}
            />
          );
        })}

        <Box marginTop={1}>
          {isLastField ? (
            <Text color="green">❯ Press ⏎ to continue</Text>
          ) : (
            <Controls
              items={[
                { key: 'arrows', label: '↑↓ navigate' },
                { key: 'enter', label: '⏎ next' },
                { key: 'skip', label: 'Ctrl+S skip' },
              ]}
            />
          )}
        </Box>
      </Box>
    );
  }

  // Installing
  if (step === 'installing') {
    return (
      <Box flexDirection="column">
        <Header title="Installing" />

        <StatusMessage type="loading" message="Setting up your workspace..." />

        <Box marginTop={1} flexDirection="column">
          <Text dimColor> • Configuring MCP servers</Text>
          <Text dimColor> • Installing agents</Text>
          <Text dimColor> • Installing rules</Text>
        </Box>
      </Box>
    );
  }

  // Complete
  if (step === 'complete') {
    return (
      <Box flexDirection="column">
        <Header title="Setup Complete" />

        <StatusMessage type="success" message="All components installed successfully" />

        <Box marginTop={1} flexDirection="column">
          <Text color="gray">✓ MCP tools configured</Text>
          <Text color="gray">✓ Agents installed</Text>
          <Text color="gray">✓ Rules installed</Text>
        </Box>
      </Box>
    );
  }

  return null;
}

/**
 * Chat Screen
 * AI chat interface with session management
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInputWithHint from '../components/TextInputWithHint.js';
import { useAppStore } from '../stores/app-store.js';
import { useChat } from '../hooks/useChat.js';
import StatusBar from '../components/StatusBar.js';
import Spinner from '../components/Spinner.js';
import LogPanel from '../components/LogPanel.js';

type StreamPart =
  | { type: 'text'; content: string }
  | { type: 'tool'; name: string; status: 'running' | 'completed' | 'failed'; duration?: number };

interface CommandArg {
  name: string;
  description: string;
  required?: boolean;
  loadOptions?: () => Promise<Array<{ id: string; name: string }>>; // Async loader - each command manages its own loading logic
}

interface Command {
  id: string;
  label: string;
  description: string;
  args?: CommandArg[];
  execute: (args?: string[]) => Promise<string>; // Returns response message
}

interface ChatProps {
  commandFromPalette?: string | null;
}

export default function Chat({ commandFromPalette }: ChatProps) {
  const [input, setInput] = useState('');
  const [inputKey, setInputKey] = useState(0); // Force TextInput remount for cursor position
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamParts, setStreamParts] = useState<StreamPart[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false); // Hide logs by default
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [pendingCommand, setPendingCommand] = useState<{ command: Command; currentInput: string } | null>(null);
  const skipNextSubmit = useRef(false); // Prevent double execution when autocomplete handles Enter

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const navigateTo = useAppStore((state) => state.navigateTo);
  const aiConfig = useAppStore((state) => state.aiConfig);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const createSession = useAppStore((state) => state.createSession);
  const sessions = useAppStore((state) => state.sessions);
  const updateProvider = useAppStore((state) => state.updateProvider);
  const setAIConfig = useAppStore((state) => state.setAIConfig);
  const addMessage = useAppStore((state) => state.addMessage);

  const { sendMessage, currentSession } = useChat();

  // Options cache and loading states (keyed by command.id + arg.name)
  const optionsCacheRef = useRef<Map<string, Array<{ id: string; name: string }>>>(new Map());
  const [currentlyLoading, setCurrentlyLoading] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cachedOptions, setCachedOptions] = useState<Map<string, Array<{ id: string; name: string }>>>(new Map());

  // Define available commands with args configuration
  const baseCommands: Command[] = [
    {
      id: 'model',
      label: '/model',
      description: 'Switch AI model',
      args: [
        {
          name: 'model-name',
          description: 'Model to switch to',
          required: true,
          loadOptions: async () => {
            // Each command manages its own loading logic
            const cacheKey = 'model';

            // Return cached if available
            if (optionsCacheRef.current.has(cacheKey)) {
              return optionsCacheRef.current.get(cacheKey)!;
            }

            if (!aiConfig?.providers) {
              throw new Error('No providers configured');
            }

            const allModels: Array<{ id: string; name: string }> = [];
            const errors: string[] = [];

            // Fetch models from each provider sequentially
            for (const [providerId, config] of Object.entries(aiConfig.providers)) {
              if (config.apiKey) {
                try {
                  const { fetchModels } = await import('../../utils/ai-model-fetcher.js');
                  const models = await fetchModels(providerId as any, config.apiKey);
                  allModels.push(...models.map(m => ({ id: m.id, name: m.name })));
                  addLog(`Loaded ${models.length} models from ${providerId}`);
                } catch (error) {
                  const errorMsg = error instanceof Error ? error.message : String(error);
                  errors.push(`${providerId}: ${errorMsg}`);
                  addLog(`Failed to fetch models for ${providerId}: ${errorMsg}`);
                }
              }
            }

            if (allModels.length === 0) {
              const errorMsg = errors.length > 0 ? errors.join('; ') : 'No models available';
              throw new Error(errorMsg);
            }

            // Cache the result
            optionsCacheRef.current.set(cacheKey, allModels);
            return allModels;
          },
        },
      ],
      execute: async (args) => {
        if (!args || args.length === 0) {
          return 'Please provide a model name. Example: /model claude-3-5-sonnet';
        }

        const modelId = args[0];
        const provider = currentSession?.provider || aiConfig?.defaultProvider;

        if (!provider) {
          return 'No provider configured. Please configure a provider first.';
        }

        // Update model
        updateProvider(provider, { defaultModel: modelId });
        const newConfig = {
          ...aiConfig!,
          defaultModel: modelId,
          providers: {
            ...aiConfig!.providers,
            [provider]: {
              ...aiConfig!.providers?.[provider],
              defaultModel: modelId,
            },
          },
        };
        setAIConfig(newConfig);

        return `Switched to model: ${modelId}`;
      },
    },
    {
      id: 'logs',
      label: '/logs',
      description: 'Toggle debug logs',
      execute: async () => {
        setShowLogs((prev) => !prev);
        return showLogs ? 'Debug logs hidden' : 'Debug logs enabled';
      },
    },
    {
      id: 'clear',
      label: '/clear',
      description: 'Clear chat history',
      execute: async () => {
        if (currentSessionId) {
          const session = sessions.find((s) => s.id === currentSessionId);
          if (session) {
            session.messages = [];
          }
        }
        return 'Chat history cleared';
      },
    },
    {
      id: 'help',
      label: '/help',
      description: 'Show available commands',
      execute: async () => {
        const commandList = baseCommands
          .map((cmd) => {
            const argsText = cmd.args
              ? ` ${cmd.args.map((a) => `[${a.name}]`).join(' ')}`
              : '';
            return `${cmd.label}${argsText} - ${cmd.description}`;
          })
          .join('\n');
        return `Available commands:\n${commandList}`;
      },
    },
  ];

  // Generate hint text for current input
  const getHintText = (): string | undefined => {
    if (!input.startsWith('/')) return undefined;

    const parts = input.split(' ');
    const commandName = parts[0];

    // Find matching base command
    const matchedCommand = baseCommands.find((cmd) => cmd.label === commandName);
    if (matchedCommand && matchedCommand.args && matchedCommand.args.length > 0) {
      const currentArgIndex = parts.length - 1;
      if (currentArgIndex < matchedCommand.args.length) {
        const arg = matchedCommand.args[currentArgIndex];
        return arg.required ? `[${arg.name}]` : `<${arg.name}>`;
      }
    }

    return undefined;
  };

  // Clear error when input changes (to stop showing stale errors)
  useEffect(() => {
    setLoadError(null);
  }, [input]);

  // Trigger option loading when needed
  useEffect(() => {
    if (!input.startsWith('/')) return;

    const parts = input.split(' ');
    const commandName = parts[0];
    const matchedCommand = baseCommands.find((cmd) => cmd.label === commandName);

    // If command has args with loadOptions and user is typing args
    if (matchedCommand && matchedCommand.args && parts.length > 1) {
      const arg = matchedCommand.args[0];
      if (arg.loadOptions) {
        const cacheKey = `${matchedCommand.id}:${arg.name}`;

        // Trigger load if not cached and not loading
        if (!cachedOptions.has(cacheKey) && currentlyLoading !== cacheKey) {
          setCurrentlyLoading(cacheKey);

          arg.loadOptions()
            .then((options) => {
              // Use functional update to avoid dependency on cachedOptions
              setCachedOptions((prev) => new Map(prev).set(cacheKey, options));
              setCurrentlyLoading(null);
            })
            .catch((error) => {
              const errorMsg = error instanceof Error ? error.message : String(error);
              addLog(`Error loading ${cacheKey}: ${errorMsg}`);
              setLoadError(errorMsg);
              setCurrentlyLoading(null);
            });
        }
      }
    }
  }, [input, baseCommands, currentlyLoading]); // Remove cachedOptions from deps to prevent loop

  // Filter commands based on input
  const getFilteredCommands = () => {
    if (!input.startsWith('/')) return [];

    const parts = input.split(' ');
    const commandName = parts[0];
    const argInput = parts.slice(1).join(' ');

    const matchedCommand = baseCommands.find((cmd) => cmd.label === commandName);

    // Multi-level autocomplete: if command has args and user is typing args
    if (matchedCommand && matchedCommand.args && parts.length > 1) {
      const arg = matchedCommand.args[0];
      const cacheKey = `${matchedCommand.id}:${arg.name}`;
      const options = cachedOptions.get(cacheKey) || [];

      if (options.length > 0) {
        return options
          .filter((option) =>
            option.id.toLowerCase().includes(argInput.toLowerCase()) ||
            option.name.toLowerCase().includes(argInput.toLowerCase())
          )
          .map((option) => ({
            id: `${cacheKey}-${option.id}`,
            label: `${commandName} ${option.id}`,
            description: option.name !== option.id ? option.name : '',
            args: matchedCommand.args,
            execute: async () => {
              return await matchedCommand.execute([option.id]);
            },
          }));
      }
    }

    // Base command filtering
    const query = input.slice(1).toLowerCase();
    return baseCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(`/${query}`) ||
        cmd.description.toLowerCase().includes(query)
    );
  };

  const filteredCommands = getFilteredCommands();
  const hintText = getHintText();

  // Handle keyboard shortcuts for command menu and selection navigation
  useInput(
    async (input, key) => {
      // Handle pending command selection (e.g., model selection, provider selection)
      if (pendingCommand) {
        // Get options for the pending command's first arg
        const firstArg = pendingCommand.command.args?.[0];
        const cacheKey = firstArg ? `${pendingCommand.command.id}:${firstArg.name}` : '';
        const options = cacheKey ? (cachedOptions.get(cacheKey) || []) : [];
        const maxIndex = options.length - 1;

        // Arrow down - next option
        if (key.downArrow) {
          setSelectedCommandIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
          return;
        }
        // Arrow up - previous option
        if (key.upArrow) {
          setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : 0));
          return;
        }
        // Enter - select option
        if (key.return) {
          const selectedOption = options[selectedCommandIndex];
          if (selectedOption) {
            const response = await pendingCommand.command.execute([selectedOption.id]);
            if (currentSessionId) {
              addMessage(currentSessionId, 'assistant', response);
            }
            setPendingCommand(null);
            setSelectedCommandIndex(0);
          }
          return;
        }
        // Escape - cancel
        if (key.escape) {
          if (currentSessionId) {
            addMessage(currentSessionId, 'assistant', 'Command cancelled');
          }
          setPendingCommand(null);
          setSelectedCommandIndex(0);
          return;
        }
      }

      // Handle command autocomplete navigation
      else if (filteredCommands.length > 0) {
        // Arrow down - next command
        if (key.downArrow) {
          setSelectedCommandIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          return;
        }
        // Arrow up - previous command
        if (key.upArrow) {
          setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : 0));
          return;
        }
        // Tab or Enter - autocomplete selected command
        if (key.tab || key.return) {
          const selected = filteredCommands[selectedCommandIndex];
          if (selected) {
            // Check if this is a base command or multi-level autocomplete
            const isBaseCommand = baseCommands.some(cmd => cmd.label === selected.label);
            const hasArgs = selected.args && selected.args.length > 0;
            const isMultiLevel = !isBaseCommand && selected.id.includes(':');

            if (isMultiLevel && key.return) {
              // Multi-level autocomplete + Enter: execute directly
              skipNextSubmit.current = true; // Prevent TextInput's onSubmit from also firing
              if (currentSessionId) {
                addMessage(currentSessionId, 'user', selected.label);
              }
              const response = await selected.execute();
              if (currentSessionId) {
                addMessage(currentSessionId, 'assistant', response);
              }
              setInput('');
              setSelectedCommandIndex(0);
            } else {
              // Base command or Tab: fill in text
              const completedText = (isBaseCommand && hasArgs) ? `${selected.label} ` : selected.label;
              setInput(completedText);
              setInputKey((prev) => prev + 1); // Force remount to move cursor to end
              setSelectedCommandIndex(0);
            }
          }
          return;
        }
        // Escape - cancel command mode
        if (key.escape) {
          setInput('');
          setSelectedCommandIndex(0);
          return;
        }
      }
    },
    { isActive: true }
  );

  // Create session if none exists
  useEffect(() => {
    if (!currentSessionId && aiConfig?.defaultProvider && aiConfig?.defaultModel) {
      createSession(aiConfig.defaultProvider, aiConfig.defaultModel);
    }
  }, [currentSessionId, aiConfig, createSession]);

  // Reset selected command index when filtered commands change
  useEffect(() => {
    setSelectedCommandIndex(0);
  }, [filteredCommands.length]);

  // Check if ready to chat
  if (!aiConfig?.defaultProvider || !aiConfig?.defaultModel) {
    return (
      <Box flexDirection="column" flexGrow={1} paddingY={2}>
        <Box paddingBottom={2}>
          <Text color="#00D9FF">▌</Text>
          <Text bold color="white"> WELCOME</Text>
        </Box>

        <Box paddingBottom={2}>
          <Text color="#FFD700">▌</Text>
          <Text color="gray"> No AI provider configured yet</Text>
        </Box>

        <Box flexDirection="column" gap={1}>
          <Box>
            <Text color="#00D9FF">1.</Text>
            <Text color="gray"> Press </Text>
            <Text bold color="#00D9FF">Ctrl+P</Text>
            <Text color="gray"> to configure a provider</Text>
          </Box>
          <Box>
            <Text color="#00D9FF">2.</Text>
            <Text color="gray"> Press </Text>
            <Text bold color="#00D9FF">Ctrl+M</Text>
            <Text color="gray"> to select a model</Text>
          </Box>
          <Box>
            <Text color="#00D9FF">3.</Text>
            <Text color="gray"> Start chatting with AI</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  if (!currentSession) {
    return (
      <Box>
        <Text color="yellow">⏳ Creating session...</Text>
      </Box>
    );
  }

  const handleSubmit = async (value: string) => {
    if (!value.trim() || isStreaming) return;

    // Skip if we just handled this in autocomplete (prevent double execution)
    if (skipNextSubmit.current) {
      skipNextSubmit.current = false;
      return;
    }

    const userMessage = value.trim();
    setInput('');

    // Check if it's a command
    if (userMessage.startsWith('/')) {
      const parts = userMessage.split(' ');
      const commandName = parts[0];
      const args = parts.slice(1);

      // Find matching command
      const command = baseCommands.find((cmd) => cmd.label === commandName);

      if (!command) {
        // Unknown command - add to conversation
        if (currentSessionId) {
          addMessage(currentSessionId, 'user', userMessage);
          addMessage(currentSessionId, 'assistant', `Unknown command: ${commandName}. Type /help for available commands.`);
        }
        return;
      }

      // Add user command to conversation
      if (currentSessionId) {
        addMessage(currentSessionId, 'user', userMessage);
      }

      // Check if command needs args but none provided
      if (command.args && command.args.length > 0 && args.length === 0) {
        const firstArg = command.args[0];
        const cacheKey = `${command.id}:${firstArg.name}`;

        // Trigger lazy load if arg has loadOptions
        if (firstArg.loadOptions && !cachedOptions.has(cacheKey) && currentlyLoading !== cacheKey) {
          setCurrentlyLoading(cacheKey);
          setLoadError(null);

          firstArg.loadOptions()
            .then((options) => {
              setCachedOptions((prev) => new Map(prev).set(cacheKey, options));
              setCurrentlyLoading(null);
            })
            .catch((error) => {
              const errorMsg = error instanceof Error ? error.message : String(error);
              addLog(`Error loading ${cacheKey}: ${errorMsg}`);
              setLoadError(errorMsg);
              setCurrentlyLoading(null);
            });
        }

        // Save pending command and show selection UI
        setPendingCommand({ command, currentInput: commandName });
        return;
      }

      // Execute command
      try {
        const response = await command.execute(args.length > 0 ? args : undefined);
        if (currentSessionId) {
          addMessage(currentSessionId, 'assistant', response);
        }
      } catch (error) {
        if (currentSessionId) {
          addMessage(currentSessionId, 'assistant', `Error: ${error instanceof Error ? error.message : 'Command failed'}`);
        }
      }

      setPendingCommand(null);
      return;
    }

    // Regular message - send to AI
    setIsStreaming(true);
    setStreamParts([]);
    addLog('Starting message send...');

    await sendMessage(
      userMessage,
      // onChunk - text streaming
      (chunk) => {
        const timestamp = Date.now();
        addLog(`Chunk(${chunk.length}ch) @${timestamp}`);
        setStreamParts((prev) => {
          const newParts = [...prev];
          const lastPart = newParts[newParts.length - 1];

          // If last part is text, append to it
          if (lastPart && lastPart.type === 'text') {
            newParts[newParts.length - 1] = {
              type: 'text',
              content: lastPart.content + chunk
            };
          } else {
            // Otherwise create new text part
            newParts.push({ type: 'text', content: chunk });
          }
          const totalLength = newParts.reduce((sum, p) =>
            p.type === 'text' ? sum + p.content.length : sum, 0);
          addLog(`→ Total: ${totalLength}ch in ${newParts.length} parts`);
          return newParts;
        });
      },
      // onToolCall - tool execution started
      (toolName, args) => {
        addLog(`Tool call: ${toolName}`);
        setStreamParts((prev) => [
          ...prev,
          { type: 'tool', name: toolName, status: 'running' },
        ]);
      },
      // onToolResult - tool execution completed
      (toolName, result, duration) => {
        addLog(`Tool result: ${toolName} (${duration}ms)`);
        setStreamParts((prev) =>
          prev.map((part) =>
            part.type === 'tool' && part.name === toolName
              ? { ...part, status: 'completed', duration }
              : part
          )
        );
      },
      // onComplete - streaming finished
      () => {
        addLog('Streaming complete');
        setIsStreaming(false);
        setStreamParts([]); // Clear streaming parts - they're now in message history
      }
    );
  };

  return (
    <Box flexDirection="row" flexGrow={1}>
      {/* Main chat area */}
      <Box flexDirection="column" flexGrow={1} width="70%">
        {/* Header */}
        <Box flexShrink={0} paddingBottom={1}>
          <Text color="#00D9FF">▌ CHAT</Text>
        </Box>

        {/* Messages - Scrollable area */}
        <Box flexDirection="column" flexGrow={1} minHeight={0}>
        {currentSession.messages.length === 0 && !isStreaming ? (
          <Box paddingY={1}>
            <Text dimColor>Ready to chat...</Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {currentSession.messages.map((msg, i) => (
              <Box key={i} paddingY={1} flexDirection="column">
                {msg.role === 'user' ? (
                  <>
                    <Box marginBottom={1}>
                      <Text color="#00D9FF">▌ YOU</Text>
                    </Box>
                    <Text color="white">{msg.content}</Text>
                  </>
                ) : (
                  <>
                    <Box marginBottom={1}>
                      <Text color="#00FF88">▌ ASSISTANT</Text>
                    </Box>
                    {/* Render parts if available, otherwise fallback to content */}
                    {msg.parts && msg.parts.length > 0 ? (
                      msg.parts.map((part, idx) => {
                        if (part.type === 'text') {
                          return (
                            <Box key={idx} marginBottom={1}>
                              <Text color="gray">{part.content}</Text>
                            </Box>
                          );
                        } else {
                          return (
                            <Box key={idx} marginBottom={1}>
                              <Text color="#00FF88">● </Text>
                              <Text color="white" bold>{part.name}</Text>
                              {part.duration !== undefined && (
                                <Text color="gray"> ({part.duration}ms)</Text>
                              )}
                            </Box>
                          );
                        }
                      })
                    ) : (
                      <Text color="gray">{msg.content}</Text>
                    )}
                  </>
                )}
              </Box>
            ))}

            {isStreaming && (
              <Box paddingY={1} flexDirection="column">
                <Box marginBottom={1}>
                  <Text color="#00FF88">▌ ASSISTANT</Text>
                </Box>

                {/* Show loading when no parts yet */}
                {streamParts.length === 0 && (
                  <Box>
                    <Spinner color="#FFD700" label="Thinking..." />
                  </Box>
                )}

                {/* Render parts in order */}
                {streamParts.map((part, idx) => {
                  if (part.type === 'text') {
                    const isLastPart = idx === streamParts.length - 1;
                    return (
                      <Box key={idx} marginBottom={1} flexDirection="column">
                        <Text color="gray">{part.content}</Text>
                        {isLastPart && <Text color="#FFD700">▊</Text>}
                      </Box>
                    );
                  } else {
                    // Tool part
                    return (
                      <Box key={idx} marginBottom={1}>
                        {part.status === 'running' ? (
                          <>
                            <Spinner color="#00FF88" />
                            <Text color="white" bold> {part.name}</Text>
                            <Text color="gray"> (executing...)</Text>
                          </>
                        ) : part.status === 'completed' ? (
                          <>
                            <Text color="#00FF88">● </Text>
                            <Text color="white" bold>{part.name}</Text>
                            <Text color="gray"> ({part.duration}ms)</Text>
                          </>
                        ) : (
                          <>
                            <Text color="red">● </Text>
                            <Text color="white" bold>{part.name}</Text>
                            <Text color="red"> (failed)</Text>
                          </>
                        )}
                      </Box>
                    );
                  }
                })}
              </Box>
            )}
          </Box>
        )}
      </Box>


        {/* Input Area */}
        <Box flexDirection="column" flexShrink={0} paddingTop={1}>
          <Box marginBottom={1}>
            <Text color="#00D9FF">▌ INPUT</Text>
            {!input.startsWith('/') && !isStreaming && !pendingCommand && (
              <Text dimColor> (Type / for commands)</Text>
            )}
          </Box>

          {/* Selection Mode - when a command is pending and needs args */}
          {pendingCommand ? (
            <Box flexDirection="column">
              <Box marginBottom={1}>
                <Text dimColor>
                  Select {pendingCommand.command.args?.[0]?.name || 'option'}:
                </Text>
              </Box>

              {/* Loading state */}
              {currentlyLoading ? (
                <Box>
                  <Spinner color="#FFD700" />
                  <Text color="gray"> Loading options...</Text>
                </Box>
              ) : loadError ? (
                /* Error state */
                <Box flexDirection="column">
                  <Box marginBottom={1}>
                    <Text color="red">Failed to load options</Text>
                  </Box>
                  <Box marginBottom={1}>
                    <Text dimColor>{loadError}</Text>
                  </Box>
                  <Box>
                    <Text dimColor>Press Esc to cancel</Text>
                  </Box>
                </Box>
              ) : (() => {
                /* Options list */
                const firstArg = pendingCommand.command.args?.[0];
                const cacheKey = firstArg ? `${pendingCommand.command.id}:${firstArg.name}` : '';
                const options = cacheKey ? (cachedOptions.get(cacheKey) || []) : [];

                if (options.length === 0) {
                  return (
                    <Box flexDirection="column">
                      <Box marginBottom={1}>
                        <Text color="yellow">No options available</Text>
                      </Box>
                      <Box>
                        <Text dimColor>Press Esc to cancel</Text>
                      </Box>
                    </Box>
                  );
                }

                return (
                  <>
                    {options.slice(0, 10).map((option, idx) => (
                      <Box
                        key={option.id}
                        paddingY={0}
                        onClick={async () => {
                          const response = await pendingCommand.command.execute([option.id]);
                          if (currentSessionId) {
                            addMessage(currentSessionId, 'assistant', response);
                          }
                          setPendingCommand(null);
                          setSelectedCommandIndex(0);
                        }}
                      >
                        <Text
                          color={idx === selectedCommandIndex ? '#00FF88' : 'gray'}
                          bold={idx === selectedCommandIndex}
                        >
                          {idx === selectedCommandIndex ? '> ' : '  '}
                          {option.id}
                        </Text>
                        {option.name !== option.id && (
                          <Text dimColor> - {option.name}</Text>
                        )}
                      </Box>
                    ))}
                    <Box marginTop={1}>
                      <Text dimColor>
                        {options.length > 10 ? `Showing 10 of ${options.length} · ` : ''}
                        ↑↓ Navigate · Enter Select · Esc Cancel
                      </Text>
                    </Box>
                  </>
                );
              })()}
            </Box>
          ) : isStreaming ? (
            <Box>
              <Text dimColor>Waiting for response...</Text>
            </Box>
          ) : (
            <>
              {/* Text Input with inline hint */}
              <TextInputWithHint
                key={inputKey}
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                placeholder="Type your message or / for commands..."
                showCursor
                hint={hintText}
              />

              {/* Command Autocomplete - Shows below input when typing / */}
              {input.startsWith('/') && input.includes(' ') && currentlyLoading ? (
                <Box marginTop={1}>
                  <Spinner color="#FFD700" />
                  <Text color="gray"> Loading options...</Text>
                </Box>
              ) : input.startsWith('/') && input.includes(' ') && loadError ? (
                <Box flexDirection="column" marginTop={1}>
                  <Box>
                    <Text color="red">Failed to load options</Text>
                  </Box>
                  <Box marginTop={1}>
                    <Text dimColor>{loadError}</Text>
                  </Box>
                </Box>
              ) : filteredCommands.length > 0 ? (
                <Box flexDirection="column" marginTop={1}>
                  {filteredCommands.slice(0, 5).map((cmd, idx) => (
                    <Box key={cmd.id}>
                      <Text
                        color={idx === selectedCommandIndex ? '#00FF88' : 'gray'}
                        bold={idx === selectedCommandIndex}
                      >
                        {idx === selectedCommandIndex ? '> ' : '  '}
                        {cmd.label}
                      </Text>
                      <Text dimColor> {cmd.description}</Text>
                    </Box>
                  ))}
                </Box>
              ) : null}
            </>
          )}
        </Box>

        {/* Status Bar - Fixed at bottom */}
        <Box flexShrink={0} paddingTop={1}>
          <StatusBar
            provider={currentSession.provider}
            model={currentSession.model}
            apiKey={aiConfig?.providers?.[currentSession.provider]?.apiKey}
            messageCount={currentSession.messages.length}
          />
          <Box>
            <Text dimColor>Type </Text>
            <Text color="#00D9FF" bold>/</Text>
            <Text dimColor> for commands</Text>
          </Box>
        </Box>
      </Box>

      {/* Right panel - Debug Logs */}
      {showLogs && (
        <Box flexDirection="column" width="30%" paddingLeft={1}>
          <LogPanel logs={debugLogs} maxLines={50} />
        </Box>
      )}
    </Box>
  );
}

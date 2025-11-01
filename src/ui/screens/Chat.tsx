/**
 * Chat Screen
 * AI chat interface with session management
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInputWithHint from '../components/TextInputWithHint.js';
import { useAppStore } from '../stores/app-store.js';
import { useChat } from '../hooks/useChat.js';
import { useAIConfig } from '../hooks/useAIConfig.js';
import StatusBar from '../components/StatusBar.js';
import Spinner from '../components/Spinner.js';
import { commands } from '../commands/registry.js';
import type { CommandContext, WaitForInputOptions, Question } from '../commands/types.js';
import { calculateScrollViewport } from '../utils/scroll-viewport.js';
import { setUserInputHandler, clearUserInputHandler, setQueueUpdateCallback } from '../../tools/interaction.js';
import { ToolDisplay } from '../components/ToolDisplay.js';

type StreamPart =
  | { type: 'text'; content: string }
  | { type: 'tool'; name: string; status: 'running' | 'completed' | 'failed'; duration?: number; args?: unknown; result?: unknown };

interface ChatProps {
  commandFromPalette?: string | null;
}

export default function Chat({ commandFromPalette }: ChatProps) {
  const [input, setInput] = useState('');
  const [inputKey, setInputKey] = useState(0); // Force TextInput remount for cursor position
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamParts, setStreamParts] = useState<StreamPart[]>([]);
  const debugLogs = useAppStore((state) => state.debugLogs);
  const addDebugLog = useAppStore((state) => state.addDebugLog);
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [pendingCommand, setPendingCommand] = useState<{ command: Command; currentInput: string } | null>(null);
  const skipNextSubmit = useRef(false); // Prevent double execution when autocomplete handles Enter

  // For command interactive flow - when command calls waitForInput()
  const [pendingInput, setPendingInput] = useState<WaitForInputOptions | null>(null);
  const inputResolver = useRef<((value: string | Record<string, string>) => void) | null>(null);
  const [selectionFilter, setSelectionFilter] = useState(''); // Filter text for selection mode

  // Multi-selection state
  const [multiSelectionPage, setMultiSelectionPage] = useState(0); // Current page index (0 = Q1, 1 = Q2, ..., n = Review)
  const [multiSelectionAnswers, setMultiSelectionAnswers] = useState<Record<string, string>>({}); // question id -> answer id

  // Ask queue state
  const [askQueueLength, setAskQueueLength] = useState(0);

  const addLog = (message: string) => {
    addDebugLog(message);
  };

  const navigateTo = useAppStore((state) => state.navigateTo);
  const aiConfig = useAppStore((state) => state.aiConfig);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const createSession = useAppStore((state) => state.createSession);
  const updateSessionModel = useAppStore((state) => state.updateSessionModel);
  const updateSessionProvider = useAppStore((state) => state.updateSessionProvider);
  const sessions = useAppStore((state) => state.sessions);
  const updateProvider = useAppStore((state) => state.updateProvider);
  const setAIConfig = useAppStore((state) => state.setAIConfig);
  const addMessage = useAppStore((state) => state.addMessage);

  const { sendMessage, currentSession } = useChat();
  const { saveConfig } = useAIConfig();

  // Options cache for selection mode and autocomplete
  const [cachedOptions, setCachedOptions] = useState<Map<string, Array<{ id: string; name: string }>>>(new Map());
  const [currentlyLoading, setCurrentlyLoading] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Create command context for execute functions
  const createCommandContext = (args: string[]): CommandContext => ({
    args,
    sendMessage: (content: string) => {
      if (currentSessionId) {
        addMessage(currentSessionId, 'assistant', content);
      }
    },
    waitForInput: (options) => {
      return new Promise((resolve) => {
        addLog(`[waitForInput] Waiting for ${options.type} input`);
        inputResolver.current = resolve;
        setPendingInput(options);

        // If it's selection, reset state
        if (options.type === 'selection') {
          setMultiSelectionPage(0);
          setMultiSelectionAnswers({});
          setSelectedCommandIndex(0);
        }
      });
    },
    getConfig: () => aiConfig,
    saveConfig: (config) => saveConfig(config),
    getCurrentSession: () => currentSession,
    updateProvider: (provider, data) => updateProvider(provider, data),
    setAIConfig: (config) => setAIConfig(config),
    updateSessionModel: (sessionId, model) => updateSessionModel(sessionId, model),
    updateSessionProvider: (sessionId, provider, model) => updateSessionProvider(sessionId, provider, model),
    createSession: (provider, model) => createSession(provider, model),
    getSessions: () => sessions,
    getCurrentSessionId: () => currentSessionId,
    navigateTo: (screen) => navigateTo(screen),
    addLog: (message) => addLog(message),
  });

  // Generate hint text for current input
  const getHintText = (): string | undefined => {
    if (!input.startsWith('/')) return undefined;

    const parts = input.split(' ');
    const commandName = parts[0];

    // Find matching command
    const matchedCommand = commands.find((cmd) => cmd.label === commandName);
    if (matchedCommand && matchedCommand.args && matchedCommand.args.length > 0) {
      // Count non-empty args after command name
      const args = parts.slice(1).filter(p => p.trim() !== '');
      const currentArgIndex = args.length;
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
    const matchedCommand = commands.find((cmd) => cmd.label === commandName);

    // If command has args with loadOptions and user is typing args
    if (matchedCommand && matchedCommand.args && parts.length > 1) {
      // Determine which arg we're currently on
      const args = parts.slice(1).filter(p => p.trim() !== '');
      const lastPart = parts[parts.length - 1];
      const isTypingNewArg = lastPart === ''; // User just typed space

      // If typing new arg, load next arg's options
      // If typing existing arg, load current arg's options
      const currentArgIndex = isTypingNewArg ? args.length : Math.max(0, args.length - 1);
      const arg = matchedCommand.args[currentArgIndex];

      if (arg && arg.loadOptions) {
        // Include previous args in cache key to invalidate when args change
        const cacheKey = `${matchedCommand.id}:${arg.name}:${args.join(',')}`;

        // Trigger load if not cached and not loading
        if (!cachedOptions.has(cacheKey) && currentlyLoading !== cacheKey) {
          setCurrentlyLoading(cacheKey);

          arg.loadOptions(args)
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
  }, [input, currentlyLoading]); // cachedOptions removed from deps to prevent loop, commands are stable

  // Filter commands based on input
  const getFilteredCommands = () => {
    if (!input.startsWith('/')) return [];

    const parts = input.split(' ');
    const commandName = parts[0];

    const matchedCommand = commands.find((cmd) => cmd.label === commandName);

    // Multi-level autocomplete: if command has args and user is typing args
    if (matchedCommand && matchedCommand.args && parts.length > 1) {
      // Determine which arg we're currently on
      const args = parts.slice(1).filter(p => p.trim() !== '');
      const lastPart = parts[parts.length - 1];
      const isTypingNewArg = lastPart === ''; // User just typed space

      // If typing new arg, load next arg's options
      // If typing existing arg, load current arg's options and filter
      const currentArgIndex = isTypingNewArg ? args.length : Math.max(0, args.length - 1);
      const currentArgInput = isTypingNewArg ? '' : lastPart;

      const arg = matchedCommand.args[currentArgIndex];
      if (arg) {
        // Use same cache key pattern as loadOptions
        const cacheKey = `${matchedCommand.id}:${arg.name}:${args.join(',')}`;
        const options = cachedOptions.get(cacheKey) || [];

        if (options.length > 0) {
          return options
            .filter((option) =>
              option.label.toLowerCase().includes(currentArgInput.toLowerCase()) ||
              (option.value && option.value.toLowerCase().includes(currentArgInput.toLowerCase()))
            )
            .map((option) => {
              // Build the full command string with all args
              const allArgs = isTypingNewArg
                ? [...args, option.value || option.label]
                : [...args.slice(0, -1), option.value || option.label];
              return {
                id: `${cacheKey}-${option.value || option.label}`,
                label: `${commandName} ${allArgs.join(' ')}`,
                description: option.value ? `Value: ${option.value}` : '',
                args: matchedCommand.args,
                execute: async (context) => {
                  return await matchedCommand.execute(createCommandContext(allArgs));
                },
              };
            });
        }
      }
    }

    // Command filtering
    const query = input.slice(1).toLowerCase();
    return commands.filter(
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
      // Handle pendingInput (when command calls waitForInput)
      if (pendingInput && inputResolver.current) {
        // Selection mode (unified for single and multi-question)
        if (pendingInput.type === 'selection') {
          const questions = pendingInput.questions;
          const isSingleQuestion = questions.length === 1;
          const currentQuestion = questions[multiSelectionPage];
          const totalQuestions = questions.length;

          // Calculate filtered options first (needed for arrow key navigation)
          const filteredOptions = currentQuestion.options.filter(
            (option) =>
              option.label.toLowerCase().includes(selectionFilter.toLowerCase()) ||
              (option.value && option.value.toLowerCase().includes(selectionFilter.toLowerCase()))
          );
          const maxIndex = filteredOptions.length - 1;

          // Arrow down - next option (handle FIRST before text input)
          if (key.downArrow) {
            setSelectedCommandIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
            return;
          }
          // Arrow up - previous option
          if (key.upArrow) {
            setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : 0));
            return;
          }

          // Handle text input for filtering
          if (input && !key.return && !key.escape && !key.tab && !key.ctrl) {
            setSelectionFilter((prev) => prev + input);
            setSelectedCommandIndex(0);
            return;
          }

          // Handle backspace for filtering
          if (key.backspace || key.delete) {
            setSelectionFilter((prev) => prev.slice(0, -1));
            setSelectedCommandIndex(0);
            return;
          }

          // Multi-question: Tab navigation between questions
          if (!isSingleQuestion) {
            if (key.tab && !key.shift) {
              setMultiSelectionPage((prev) => (prev + 1) % totalQuestions);
              setSelectedCommandIndex(0);
              setSelectionFilter('');
              return;
            }
            if (key.shift && key.tab) {
              setMultiSelectionPage((prev) => (prev - 1 + totalQuestions) % totalQuestions);
              setSelectedCommandIndex(0);
              setSelectionFilter('');
              return;
            }
          }

          // Ctrl+Enter - submit all answers (only for multi-question)
          if (!isSingleQuestion && key.ctrl && key.return) {
            // Check if all questions are answered
            const allAnswered = questions.every((q) => multiSelectionAnswers[q.id]);
            if (allAnswered) {
              addLog(`[selection] Submitting answers: ${JSON.stringify(multiSelectionAnswers)}`);

              // Add user's answers to chat history
              if (currentSessionId) {
                const answerText = questions
                  .map((q) => {
                    const answerValue = multiSelectionAnswers[q.id];
                    const answerOption = q.options.find((opt) =>
                      (opt.value || opt.label) === answerValue
                    );
                    return answerOption?.label || answerValue;
                  })
                  .join(', ');
                addMessage(currentSessionId, 'user', answerText);
              }

              inputResolver.current(multiSelectionAnswers);
              inputResolver.current = null;
              setPendingInput(null);
              setMultiSelectionPage(0);
              setMultiSelectionAnswers({});
              setSelectionFilter('');
            } else {
              addLog(`[selection] Cannot submit: not all questions answered`);
            }
            return;
          }

          // Enter - select option
          if (key.return) {
            const selectedOption = filteredOptions[selectedCommandIndex];
            if (selectedOption) {
              const selectedValue = selectedOption.value || selectedOption.label;
              addLog(`[selection] Q${multiSelectionPage + 1}: ${selectedValue}`);

              if (isSingleQuestion) {
                // Single question: submit immediately
                // Add user's answer to chat history
                if (currentSessionId) {
                  addMessage(currentSessionId, 'user', selectedOption.label);
                }

                inputResolver.current({ [currentQuestion.id]: selectedValue });
                inputResolver.current = null;
                setPendingInput(null);
                setMultiSelectionPage(0);
                setMultiSelectionAnswers({});
                setSelectionFilter('');
              } else {
                // Multi-question: save answer
                const newAnswers = {
                  ...multiSelectionAnswers,
                  [currentQuestion.id]: selectedValue,
                };
                setMultiSelectionAnswers(newAnswers);

                // Check if all questions are answered
                const allAnswered = questions.every((q) => newAnswers[q.id]);

                if (allAnswered) {
                  // All answered: auto-submit
                  addLog(`[selection] All answered, auto-submitting: ${JSON.stringify(newAnswers)}`);

                  // Add user's answers to chat history
                  if (currentSessionId) {
                    const answerText = questions
                      .map((q) => {
                        const answerValue = newAnswers[q.id];
                        const answerOption = q.options.find((opt) =>
                          (opt.value || opt.label) === answerValue
                        );
                        return answerOption?.label || answerValue;
                      })
                      .join(', ');
                    addMessage(currentSessionId, 'user', answerText);
                  }

                  inputResolver.current(newAnswers);
                  inputResolver.current = null;
                  setPendingInput(null);
                  setMultiSelectionPage(0);
                  setMultiSelectionAnswers({});
                  setSelectionFilter('');
                } else {
                  // Move to next unanswered question
                  const nextUnanswered = questions.findIndex(
                    (q, idx) => idx > multiSelectionPage && !newAnswers[q.id]
                  );
                  if (nextUnanswered !== -1) {
                    setMultiSelectionPage(nextUnanswered);
                  }
                  setSelectedCommandIndex(0);
                  setSelectionFilter('');
                }
              }
            }
            return;
          }
          // Escape - cancel
          if (key.escape) {
            addLog(`[selection] Cancelled`);
            inputResolver.current({});
            inputResolver.current = null;
            setPendingInput(null);
            setMultiSelectionPage(0);
            setMultiSelectionAnswers({});
            setSelectionFilter('');
            return;
          }
          // For other keys (text input), let TextInput handle it via onChange
          // Don't return here - allow text input to work
        }
        // Text input mode - no special handling here, let TextInput handle it
        // Note: We don't return here for pendingInput text mode
        // This allows TextInput to handle the input normally
      }

      // Handle pending command selection (e.g., model selection, provider selection)
      if (pendingCommand && !pendingInput) {
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
            const response = await pendingCommand.command.execute(createCommandContext([selectedOption.id]));
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
      else if (filteredCommands.length > 0 && !pendingInput) {
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
        // Tab - fill in autocomplete text only
        if (key.tab) {
          const selected = filteredCommands[selectedCommandIndex];
          if (selected) {
            const isCommand = commands.some(cmd => cmd.label === selected.label);
            const hasArgs = selected.args && selected.args.length > 0;
            const completedText = (isCommand && hasArgs) ? `${selected.label} ` : selected.label;

            addLog(`[useInput] Tab autocomplete fill: ${completedText}`);
            setInput(completedText);
            setInputKey((prev) => prev + 1); // Force remount to move cursor to end
            setSelectedCommandIndex(0);
          }
          return;
        }

        // Enter - execute autocomplete selection
        if (key.return) {
          const selected = filteredCommands[selectedCommandIndex];
          if (selected) {
            skipNextSubmit.current = true; // Prevent TextInput's onSubmit from also executing

            // Check if this is a base command that needs args
            const isCommand = commands.some(cmd => cmd.label === selected.label);
            const hasArgs = selected.args && selected.args.length > 0;

            // Execute command directly - let command handle interaction via CommandContext
            addLog(`[useInput] Enter autocomplete execute: ${selected.label}`);

            // Add user message to conversation
            if (currentSessionId) {
              addMessage(currentSessionId, 'user', selected.label);
            }

            // Execute command - it will use waitForInput if needed
            const response = await selected.execute(createCommandContext([]));

            // Add final response if any
            if (response && currentSessionId) {
              addMessage(currentSessionId, 'assistant', response);
            }

            setInput('');
            setSelectedCommandIndex(0);
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

  // Register user input handler for ask tool
  useEffect(() => {
    setUserInputHandler((request) => {
      return new Promise((resolve) => {
        addDebugLog(`[ask tool] Waiting for user selection (${request.questions.length} question${request.questions.length > 1 ? 's' : ''})`);
        inputResolver.current = resolve;
        setPendingInput(request);

        // Reset selection state
        setMultiSelectionPage(0);
        setMultiSelectionAnswers({});
        setSelectionFilter('');
        setSelectedCommandIndex(0);
      });
    });

    // Set queue update callback
    setQueueUpdateCallback((count) => {
      setAskQueueLength(count);
    });

    return () => {
      clearUserInputHandler();
    };
  }, [addDebugLog]);

  // Reset selected command index when filtered commands change
  useEffect(() => {
    setSelectedCommandIndex(0);
  }, [filteredCommands.length]);

  const handleSubmit = async (value: string) => {
    if (!value.trim() || isStreaming) return;

    // Handle pendingInput for text type
    if (pendingInput && pendingInput.type === 'text' && inputResolver.current) {
      addLog(`[handleSubmit] Resolving text input: ${value}`);

      // Add user's text input to chat history
      if (currentSessionId) {
        addMessage(currentSessionId, 'user', value.trim());
      }

      inputResolver.current(value.trim());
      inputResolver.current = null;
      setPendingInput(null);
      setInput('');
      return;
    }

    // If we're in command mode with active autocomplete, don't handle here
    // Let useInput handle the autocomplete selection
    if (value.startsWith('/') && filteredCommands.length > 0) {
      addLog(`[handleSubmit] Skipping, autocomplete active (${filteredCommands.length} suggestions)`);
      return;
    }

    // Skip if we just handled this in autocomplete (prevent double execution)
    if (skipNextSubmit.current) {
      addLog(`[handleSubmit] Skipping due to skipNextSubmit flag: ${value}`);
      skipNextSubmit.current = false;
      return;
    }

    addLog(`[handleSubmit] Processing: ${value}`);
    const userMessage = value.trim();
    setInput('');

    // Check if it's a command
    if (userMessage.startsWith('/')) {
      const parts = userMessage.split(' ');
      const commandName = parts[0];
      const args = parts.slice(1);

      // Find matching command
      const command = commands.find((cmd) => cmd.label === commandName);

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

      // Execute command - let command handle interaction via CommandContext
      try {
        const response = await command.execute(createCommandContext(args));

        // Add final response if any
        if (response && currentSessionId) {
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
    // Block if no provider configured
    if (!aiConfig?.defaultProvider || !aiConfig?.defaultModel) {
      if (currentSessionId) {
        addMessage(currentSessionId, 'user', userMessage);
        addMessage(currentSessionId, 'assistant', 'No AI provider configured. Use /provider to configure a provider first.');
      }
      return;
    }

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
          { type: 'tool', name: toolName, status: 'running', args },
        ]);
      },
      // onToolResult - tool execution completed
      (toolName, result, duration) => {
        addLog(`Tool result: ${toolName} (${duration}ms)`);
        setStreamParts((prev) =>
          prev.map((part) =>
            part.type === 'tool' && part.name === toolName
              ? { ...part, status: 'completed', duration, result }
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
      // NOTE: onUserInputRequest removed - handler is set globally in useEffect
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
        {!currentSession ? (
          <Box paddingY={1} flexDirection="column">
            <Box paddingBottom={2}>
              <Text color="#00D9FF">▌</Text>
              <Text bold color="white"> WELCOME</Text>
            </Box>
            <Box paddingBottom={1}>
              <Text dimColor>No AI provider configured yet.</Text>
            </Box>
            <Box paddingBottom={1}>
              <Text dimColor>Configure a provider to start chatting:</Text>
            </Box>
            <Box paddingLeft={2} paddingBottom={1}>
              <Text color="#00D9FF">/provider</Text>
              <Text dimColor> - Manage AI providers</Text>
            </Box>
            <Box paddingLeft={2} paddingBottom={1}>
              <Text color="#00D9FF">/help</Text>
              <Text dimColor> - Show all available commands</Text>
            </Box>
          </Box>
        ) : currentSession.messages.length === 0 && !isStreaming ? (
          <Box paddingY={1}>
            <Text dimColor>Ready to chat...</Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {currentSession.messages.map((msg, i) => (
              <Box key={i} paddingY={1} flexDirection="column">
                {msg.role === 'user' ? (
                  <>
                    <Box>
                      <Text color="#00D9FF">▌ YOU</Text>
                    </Box>
                    <Text color="white">{msg.content}</Text>
                  </>
                ) : (
                  <>
                    <Box>
                      <Text color="#00FF88">▌ ASSISTANT</Text>
                    </Box>
                    {/* Render parts if available, otherwise fallback to content */}
                    {msg.parts && msg.parts.length > 0 ? (
                      msg.parts.map((part, idx) => {
                        if (part.type === 'text') {
                          return (
                            <Box key={idx}>
                              <Text color="white">{part.content}</Text>
                            </Box>
                          );
                        } else {
                          return (
                            <Box key={idx}>
                              <ToolDisplay
                                name={part.name}
                                status={part.status}
                                duration={part.duration}
                                args={part.args}
                                result={part.result}
                              />
                            </Box>
                          );
                        }
                      })
                    ) : (
                      <Text color="white">{msg.content}</Text>
                    )}
                  </>
                )}
              </Box>
            ))}

            {isStreaming && (
              <Box paddingY={1} flexDirection="column">
                <Box>
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
                      <Box key={idx} flexDirection="column">
                        <Text color="white">{part.content}</Text>
                        {isLastPart && <Text color="#FFD700">▊</Text>}
                      </Box>
                    );
                  } else {
                    // Tool part
                    return (
                      <Box key={idx}>
                        <ToolDisplay
                          name={part.name}
                          status={part.status}
                          duration={part.duration}
                          args={part.args}
                          result={part.result}
                        />
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

          {/* PendingInput Mode - when command calls waitForInput */}
          {pendingInput ? (
            <Box flexDirection="column">
              {pendingInput.prompt && (
                <Box marginBottom={1}>
                  <Text dimColor>{pendingInput.prompt}</Text>
                </Box>
              )}

              {pendingInput.type === 'selection' ? (
                // Selection UI (vertical list style - all questions visible)
                (() => {
                  const questions = pendingInput.questions;
                  const isSingleQuestion = questions.length === 1;
                  const currentQuestion = questions[multiSelectionPage];

                  // Calculate progress
                  const answeredCount = Object.keys(multiSelectionAnswers).length;
                  const totalQuestions = questions.length;
                  const allAnswered = questions.every((q) => multiSelectionAnswers[q.id]);

                  return (
                    <>
                      {/* Queue status */}
                      {askQueueLength > 0 && (
                        <Box marginBottom={1}>
                          <Text color="#FFD700">[+{askQueueLength} pending]</Text>
                        </Box>
                      )}

                      {/* Progress header (only for multi-question) */}
                      {!isSingleQuestion && (
                        <Box marginBottom={1}>
                          <Text color="#00D9FF">Progress: </Text>
                          <Text color="#00FF88" bold>
                            {answeredCount}/{totalQuestions}
                          </Text>
                          <Text dimColor> completed</Text>
                        </Box>
                      )}

                      {/* Vertical list - all questions */}
                      {questions.map((q, qIdx) => {
                        const isCurrentQuestion = qIdx === multiSelectionPage;
                        const answer = multiSelectionAnswers[q.id];
                        const answerOption = answer ? q.options.find((opt) => (opt.value || opt.label) === answer) : null;

                        return (
                          <Box key={q.id} marginBottom={1} flexDirection="column">
                            {/* Question header */}
                            <Box>
                              <Text color="#00D9FF">Q{qIdx + 1}. </Text>
                              <Text bold={isCurrentQuestion} color={isCurrentQuestion ? '#00D9FF' : 'gray'}>
                                {q.question}
                              </Text>
                              {isCurrentQuestion && !isSingleQuestion && (
                                <Text color="#00FF88"> ← </Text>
                              )}
                            </Box>

                            {/* Answer or expanded options */}
                            {isCurrentQuestion ? (
                              // Current question: show options
                              <Box marginLeft={4} flexDirection="column" marginTop={1}>
                                {/* Filter */}
                                <Box marginBottom={1}>
                                  <Text dimColor>🔍 Filter: </Text>
                                  <Text color="#00FF88">{selectionFilter || '(type to search)'}</Text>
                                </Box>

                                {/* Options */}
                                {(() => {
                                  // Safety check: ensure options exist
                                  if (!q.options || !Array.isArray(q.options)) {
                                    return (
                                      <Box>
                                        <Text color="red">⚠ Error: No options available for this question</Text>
                                        <Text dimColor>Question data: {JSON.stringify(q)}</Text>
                                      </Box>
                                    );
                                  }

                                  const filteredOptions = q.options.filter(
                                    (option) =>
                                      option.label.toLowerCase().includes(selectionFilter.toLowerCase()) ||
                                      (option.value && option.value.toLowerCase().includes(selectionFilter.toLowerCase()))
                                  );

                                  if (filteredOptions.length === 0) {
                                    return <Text color="yellow">⚠ No matches found</Text>;
                                  }

                                  // Calculate scroll window to keep selected item visible
                                  const viewport = calculateScrollViewport(filteredOptions, selectedCommandIndex);

                                  return (
                                    <>
                                      {viewport.hasItemsAbove && (
                                        <Box marginBottom={1}>
                                          <Text dimColor>... {viewport.itemsAboveCount} more above</Text>
                                        </Box>
                                      )}
                                      {viewport.visibleItems.map((option, idx) => {
                                        const absoluteIdx = viewport.scrollOffset + idx;
                                        return (
                                          <Box key={option.value || option.label} paddingY={0}>
                                            <Text
                                              color={absoluteIdx === selectedCommandIndex ? '#00FF88' : 'gray'}
                                              bold={absoluteIdx === selectedCommandIndex}
                                            >
                                              {absoluteIdx === selectedCommandIndex ? '▶ ' : '  '}
                                              {option.label}
                                            </Text>
                                          </Box>
                                        );
                                      })}
                                      {viewport.hasItemsBelow && (
                                        <Box marginTop={1}>
                                          <Text dimColor>... {viewport.itemsBelowCount} more below</Text>
                                        </Box>
                                      )}
                                    </>
                                  );
                                })()}
                              </Box>
                            ) : (
                              // Other questions: show answer or not answered
                              <Box marginLeft={4}>
                                {answer ? (
                                  <>
                                    <Text color="#00FF88">✓ </Text>
                                    <Text color="#00FF88">{answerOption?.label || answer}</Text>
                                  </>
                                ) : (
                                  <Text dimColor>(not answered yet)</Text>
                                )}
                              </Box>
                            )}
                          </Box>
                        );
                      })}

                      {/* Controls footer */}
                      <Box marginTop={1} flexDirection="column">
                        <Box>
                          {!isSingleQuestion && (
                            <>
                              <Text dimColor>Tab: </Text>
                              <Text color="#00D9FF">Next</Text>
                              <Text dimColor> · Shift+Tab: </Text>
                              <Text color="#00D9FF">Previous</Text>
                              <Text dimColor> · </Text>
                            </>
                          )}
                          <Text dimColor>↑↓: </Text>
                          <Text color="#00D9FF">Navigate</Text>
                          <Text dimColor> · Enter: </Text>
                          <Text color="#00FF88">Select</Text>
                          {!isSingleQuestion && (
                            <>
                              <Text dimColor> · </Text>
                              <Text dimColor>Ctrl+Enter: </Text>
                              <Text color={allAnswered ? '#00FF88' : 'gray'}>
                                Submit{!allAnswered && ' (answer all first)'}
                              </Text>
                            </>
                          )}
                          <Text dimColor> · Esc: </Text>
                          <Text color="#FF3366">Cancel</Text>
                        </Box>
                      </Box>
                    </>
                  );
                })()
              ) : (
                // Text input UI - TextInput below will handle it
                <Box marginBottom={1}>
                  <Text dimColor>{pendingInput.placeholder || 'Type your response...'}</Text>
                </Box>
              )}
            </Box>
          ) : /* Selection Mode - when a command is pending and needs args */
          pendingCommand ? (
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

                // Calculate scroll window to keep selected item visible
                const viewport = calculateScrollViewport(options, selectedCommandIndex);

                return (
                  <>
                    {viewport.hasItemsAbove && (
                      <Box marginBottom={1}>
                        <Text dimColor>... {viewport.itemsAboveCount} more above</Text>
                      </Box>
                    )}
                    {viewport.visibleItems.map((option, idx) => {
                      const absoluteIdx = viewport.scrollOffset + idx;
                      return (
                        <Box
                          key={option.value || option.label}
                          paddingY={0}
                          onClick={async () => {
                            const response = await pendingCommand.command.execute(createCommandContext([option.value || option.label]));
                            if (currentSessionId) {
                              addMessage(currentSessionId, 'assistant', response);
                            }
                            setPendingCommand(null);
                            setSelectedCommandIndex(0);
                          }}
                        >
                          <Text
                            color={absoluteIdx === selectedCommandIndex ? '#00FF88' : 'gray'}
                            bold={absoluteIdx === selectedCommandIndex}
                          >
                            {absoluteIdx === selectedCommandIndex ? '> ' : '  '}
                            {option.label}
                          </Text>
                        </Box>
                      );
                    })}
                    {viewport.hasItemsBelow && (
                      <Box marginTop={1}>
                        <Text dimColor>... {viewport.itemsBelowCount} more below</Text>
                      </Box>
                    )}
                    <Box marginTop={1}>
                      <Text dimColor>
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
                value={
                  pendingInput?.type === 'selection'
                    ? selectionFilter
                    : input
                }
                onChange={
                  pendingInput?.type === 'selection'
                    ? (value) => {
                        setSelectionFilter(value);
                        setSelectedCommandIndex(0); // Reset selection when filter changes
                      }
                    : setInput
                }
                onSubmit={handleSubmit}
                placeholder={
                  pendingInput?.type === 'selection'
                    ? 'Type to filter options...'
                    : pendingInput?.type === 'text'
                    ? (pendingInput.placeholder || 'Type your response...')
                    : 'Type your message or / for commands...'
                }
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
          {currentSession && (
            <StatusBar
              provider={currentSession.provider}
              model={currentSession.model}
              apiKey={aiConfig?.providers?.[currentSession.provider]?.apiKey}
              messageCount={currentSession.messages.length}
            />
          )}
          <Box>
            <Text dimColor>Type </Text>
            <Text color="#00D9FF" bold>/</Text>
            <Text dimColor> for commands</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

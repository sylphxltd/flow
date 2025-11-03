/**
 * Chat Screen
 * AI chat interface with session management
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - useMemo for expensive filtering operations
 * - useCallback for stable function references
 * - Memo for child components to prevent cascade re-renders
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Box, Text, useInput, Static } from 'ink';
import TextInputWithHint from '../components/TextInputWithHint.js';
import MarkdownText from '../components/MarkdownText.js';
import TodoList from '../components/TodoList.js';
import { useAppStore } from '../stores/app-store.js';
import { useChat } from '../hooks/useChat.js';
import { useAIConfig } from '../hooks/useAIConfig.js';
import StatusBar from '../components/StatusBar.js';
import Spinner from '../components/Spinner.js';
import { commands } from '../commands/registry.js';
import type { CommandContext, WaitForInputOptions, Question } from '../commands/types.js';
import { ToolDisplay } from '../components/ToolDisplay.js';
import { filterFiles } from '../../utils/file-scanner.js';
import type { FileAttachment } from '../../types/session.types.js';
import { formatTokenCount } from '../../utils/token-counter.js';
import { useFileAttachments } from '../hooks/useFileAttachments.js';
import { MessagePart } from '../components/MessagePart.js';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation.js';
import { useTokenCalculation } from '../hooks/useTokenCalculation.js';
import { useProjectFiles } from '../hooks/useProjectFiles.js';
import { useAskToolHandler } from '../hooks/useAskToolHandler.js';
import { useSessionInitialization } from '../hooks/useSessionInitialization.js';
import { SelectionUI } from '../components/SelectionUI.js';
import { PendingCommandSelection } from '../components/PendingCommandSelection.js';
import { FileAutocomplete } from '../components/FileAutocomplete.js';
import { CommandAutocomplete } from '../components/CommandAutocomplete.js';

type StreamPart =
  | { type: 'text'; content: string }
  | { type: 'reasoning'; content: string; completed?: boolean; duration?: number; startTime?: number }
  | { type: 'tool'; toolId: string; name: string; status: 'running' | 'completed' | 'failed'; duration?: number; args?: unknown; result?: unknown; error?: string; startTime?: number }
  | { type: 'error'; error: string };

interface ChatProps {
  commandFromPalette?: string | null;
}

export default function Chat({ commandFromPalette }: ChatProps) {
  const [input, setInput] = useState('');
  const [cursor, setCursor] = useState(0); // Controlled cursor position
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamParts, setStreamParts] = useState<StreamPart[]>([]);
  const [isTitleStreaming, setIsTitleStreaming] = useState(false);
  const [streamingTitle, setStreamingTitle] = useState('');

  // Abort controller for cancelling AI stream
  const abortControllerRef = useRef<AbortController | null>(null);

  // Optimized streaming: accumulate chunks in ref, update state in batches
  const streamBufferRef = useRef<{ chunks: string[]; timeout: NodeJS.Timeout | null }>({
    chunks: [],
    timeout: null
  });
  const debugLogs = useAppStore((state) => state.debugLogs);
  const addDebugLog = useAppStore((state) => state.addDebugLog);
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [pendingCommand, setPendingCommand] = useState<{ command: Command; currentInput: string } | null>(null);
  const skipNextSubmit = useRef(false); // Prevent double execution when autocomplete handles Enter
  const lastEscapeTime = useRef<number>(0); // Track last ESC press for double-ESC detection
  const [showEscHint, setShowEscHint] = useState(false); // Show "Press ESC again to clear" hint

  // File attachment hook
  const {
    pendingAttachments,
    attachmentTokens,
    validTags,
    addAttachment,
    clearAttachments,
    setAttachmentTokenCount,
  } = useFileAttachments(input);

  const { projectFiles, filesLoading } = useProjectFiles();
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  // For command interactive flow - when command calls waitForInput()
  const [pendingInput, setPendingInput] = useState<WaitForInputOptions | null>(null);
  const inputResolver = useRef<((value: string | Record<string, string | string[]>) => void) | null>(null);
  const [selectionFilter, setSelectionFilter] = useState(''); // Filter text for selection mode
  const [isFilterMode, setIsFilterMode] = useState(false); // Whether user is actively filtering (typing)

  // Multi-selection state
  const [multiSelectionPage, setMultiSelectionPage] = useState(0); // Current page index (0 = Q1, 1 = Q2, ..., n = Review)
  const [multiSelectionAnswers, setMultiSelectionAnswers] = useState<Record<string, string | string[]>>({}); // question id -> answer id(s)
  const [multiSelectChoices, setMultiSelectChoices] = useState<Set<string>>(new Set()); // Current question's selected choices (for multi-select mode)

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
  const updateSessionTitle = useAppStore((state) => state.updateSessionTitle);
  // Removed unused 'sessions' selector that was causing unnecessary re-renders
  const updateProvider = useAppStore((state) => state.updateProvider);
  const setAIConfig = useAppStore((state) => state.setAIConfig);
  const setCurrentSession = useAppStore((state) => state.setCurrentSession);
  const addMessage = useAppStore((state) => state.addMessage);
  const setSelectedProvider = useAppStore((state) => state.setSelectedProvider);
  const setSelectedModel = useAppStore((state) => state.setSelectedModel);
  const updateNotificationSettings = useAppStore((state) => state.updateNotificationSettings);
  const notificationSettings = useAppStore((state) => state.notificationSettings);
  const sessions = useAppStore((state) => state.sessions);

  const { sendMessage, currentSession } = useChat();
  const { saveConfig } = useAIConfig();

  // Static header items - stable reference to prevent re-rendering
  const headerItems = useMemo(() => ['header'], []);

  // Custom hooks for side effects
  const usedTokens = useTokenCalculation(currentSession);

  useSessionInitialization({
    currentSessionId,
    aiConfig,
    createSession,
  });

  useAskToolHandler({
    setPendingInput,
    setMultiSelectionPage,
    setMultiSelectionAnswers,
    setSelectionFilter,
    setSelectedCommandIndex,
    setAskQueueLength,
    inputResolver,
    addDebugLog,
  });

  // Options cache for selection mode and autocomplete
  const [cachedOptions, setCachedOptions] = useState<Map<string, Array<{ id: string; name: string }>>>(new Map());
  const [currentlyLoading, setCurrentlyLoading] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Shared session ID ref for command execution
  const commandSessionRef = useRef<string | null>(null);

  // Create command context for execute functions
  const createCommandContext = (args: string[]): CommandContext => ({
    args,
    sendMessage: (content: string) => {
      // Reuse existing command session or create one
      if (!commandSessionRef.current) {
        commandSessionRef.current = currentSessionId || createSession('openrouter', 'anthropic/claude-3.5-sonnet');
      }
      addMessage(commandSessionRef.current, 'assistant', content);
    },
    triggerAIResponse: async (message: string, attachments?: Array<{ path: string; relativePath: string; size?: number }>) => {
      // Clear input
      setInput('');
      // Call the shared helper
      await sendUserMessageToAI(message, attachments);
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
          // Initialize pre-selected choices for first question if multi-select
          const firstQuestion = options.questions[0];
          if (firstQuestion?.multiSelect && firstQuestion.preSelected) {
            setMultiSelectChoices(new Set(firstQuestion.preSelected));
          } else {
            setMultiSelectChoices(new Set());
          }
          setSelectedCommandIndex(0);
          setSelectionFilter('');
          setIsFilterMode(false);
        }
      });
    },
    getConfig: () => useAppStore.getState().aiConfig,
    saveConfig: (config) => saveConfig(config),
    getCurrentSession: () => currentSession,
    updateProvider: (provider, data) => updateProvider(provider, data),
    setAIConfig: (config) => setAIConfig(config),
    updateSessionModel: (sessionId, model) => updateSessionModel(sessionId, model),
    updateSessionProvider: (sessionId, provider, model) => updateSessionProvider(sessionId, provider, model),
    setUISelectedProvider: (provider) => setSelectedProvider(provider),
    setUISelectedModel: (model) => setSelectedModel(model),
    createSession: (provider, model) => createSession(provider, model),
    getSessions: () => sessions,
    getCurrentSessionId: () => currentSessionId,
    setCurrentSession: (sessionId) => setCurrentSession(sessionId),
    navigateTo: (screen) => navigateTo(screen),
    addLog: (message) => addLog(message),
    notificationSettings,
    updateNotificationSettings: (settings) => updateNotificationSettings(settings),
    updateOutput: (content) => addLog(content),
    getCommands: () => commands,
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

          // Create context for loadOptions
          const context = createCommandContext([]);

          arg.loadOptions(args, context)
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

  // Get file auto-completion suggestions when @ is typed
  // PERFORMANCE: Memoize to avoid recalculating on every render
  const filteredFileInfo = useMemo(() => {
    // Find @ symbol before cursor position
    const textBeforeCursor = input.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex === -1) return { files: [], query: '', hasAt: false, atIndex: -1 };

    // Check character before @ to avoid triggering on emails (user@example.com)
    // Only trigger if @ is at start OR preceded by whitespace/newline
    if (atIndex > 0) {
      const charBeforeAt = textBeforeCursor[atIndex - 1];
      const isWhitespace = /\s/.test(charBeforeAt); // space, tab, newline, etc.
      if (!isWhitespace) {
        // @ is preceded by non-whitespace (likely email), don't trigger
        return { files: [], query: '', hasAt: false, atIndex };
      }
    }

    // Extract query after @ up to cursor
    const query = textBeforeCursor.slice(atIndex + 1);

    // Don't show suggestions if there's a space in the query
    // (user has moved past this @ token)
    if (query.includes(' ')) return { files: [], query: '', hasAt: false, atIndex };

    // Filter files based on query
    const filtered = filterFiles(projectFiles, query);

    return { files: filtered.slice(0, 10), query, hasAt: true, atIndex }; // Limit to 10 results
  }, [input, cursor, projectFiles]); // Only recompute when these change

  // Filter commands based on input
  // PERFORMANCE: Memoize to avoid recalculating on every render
  const filteredCommands = useMemo(() => {
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
                description: '',
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
  }, [input, cachedOptions]); // Recompute when input or cached options change

  // Get hint text for current input
  // PERFORMANCE: Memoize to avoid recalculating on every render
  const hintText = useMemo(() => getHintText(), [input]);

  // Handle keyboard shortcuts for command menu and selection navigation
  useKeyboardNavigation({
    input,
    cursor,
    isStreaming,
    pendingInput,
    pendingCommand,
    filteredFileInfo,
    filteredCommands,
    multiSelectionPage,
    multiSelectionAnswers,
    multiSelectChoices,
    selectionFilter,
    isFilterMode,
    selectedCommandIndex,
    selectedFileIndex,
    skipNextSubmit,
    lastEscapeTime,
    inputResolver,
    commandSessionRef,
    abortControllerRef,
    cachedOptions,
    setInput,
    setCursor,
    setShowEscHint,
    setMultiSelectionPage,
    setSelectedCommandIndex,
    setMultiSelectionAnswers,
    setMultiSelectChoices,
    setSelectionFilter,
    setIsFilterMode,
    setSelectedFileIndex,
    setPendingInput,
    setPendingCommand,
    addLog,
    addMessage,
    addAttachment,
    setAttachmentTokenCount,
    createCommandContext,
    currentSessionId,
    currentSession,
    createSession,
  });

  // Reset selected command index when filtered commands change
  // PERFORMANCE: Use filteredCommands.length to avoid triggering on array identity change
  useEffect(() => {
    setSelectedCommandIndex(0);
  }, [filteredCommands.length]);

  // Reset selected file index when filtered files change
  useEffect(() => {
    setSelectedFileIndex(0);
  }, [filteredFileInfo.files.length]);

  // Helper function to send user message and trigger AI response
  // Used by both handleSubmit and triggerAIResponse
  const sendUserMessageToAI = useCallback(async (userMessage: string, attachments?: FileAttachment[]) => {
    // Block if no provider configured
    if (!aiConfig?.defaultProvider || !aiConfig?.defaultModel) {
      if (currentSessionId) {
        addMessage(currentSessionId, 'user', userMessage, attachments);
        addMessage(currentSessionId, 'assistant', 'No AI provider configured. Use /provider to configure a provider first.');
      }
      return;
    }

    setIsStreaming(true);
    setStreamParts([]);
    addLog('Starting message send...');

    // Create abort controller for this stream
    abortControllerRef.current = new AbortController();

    // Helper to flush accumulated chunks
    const flushStreamBuffer = () => {
      const buffer = streamBufferRef.current;
      if (buffer.chunks.length === 0) return;

      const accumulatedText = buffer.chunks.join('');
      buffer.chunks = [];

      setStreamParts((prev) => {
        const newParts = [...prev];
        const lastPart = newParts[newParts.length - 1];

        // If last part is text, append to it
        if (lastPart && lastPart.type === 'text') {
          newParts[newParts.length - 1] = {
            type: 'text',
            content: lastPart.content + accumulatedText
          };
        } else {
          // Otherwise create new text part
          newParts.push({ type: 'text', content: accumulatedText });
        }
        return newParts;
      });
    };

    try {
      await sendMessage(
        userMessage,
        // onChunk - text streaming (batched for performance)
        (chunk) => {
          // Accumulate chunks in buffer
          streamBufferRef.current.chunks.push(chunk);

          // Clear existing timeout
          if (streamBufferRef.current.timeout) {
            clearTimeout(streamBufferRef.current.timeout);
          }

          // Schedule flush after 50ms of inactivity (debounce)
          streamBufferRef.current.timeout = setTimeout(() => {
            flushStreamBuffer();
            streamBufferRef.current.timeout = null;
          }, 50);
        },
        // onToolCall - tool execution started
        (toolCallId, toolName, args) => {
          setStreamParts((prev) => [
            ...prev,
            { type: 'tool', toolId: toolCallId, name: toolName, status: 'running', args, startTime: Date.now() },
          ]);
        },
        // onToolResult - tool execution completed
        (toolCallId, toolName, result, duration) => {
          setStreamParts((prev) =>
            prev.map((part) =>
              part.type === 'tool' && part.toolId === toolCallId
                ? { ...part, status: 'completed', duration, result }
                : part
            )
          );
        },
        // onComplete - streaming finished
        async () => {
          // Flush any remaining buffered chunks
          if (streamBufferRef.current.timeout) {
            clearTimeout(streamBufferRef.current.timeout);
            streamBufferRef.current.timeout = null;
          }
          flushStreamBuffer();

          setIsStreaming(false);
          setStreamParts([]); // Clear streaming parts - they're now in message history

          // Generate title with streaming if this is first message
          if (currentSessionId) {
            // Get fresh session from store (currentSession might be stale)
            const sessions = useAppStore.getState().sessions;
            const freshSession = sessions.find(s => s.id === currentSessionId);

            if (freshSession) {
              const userMessageCount = freshSession.messages.filter(m => m.role === 'user').length;
              const hasTitle = !!freshSession.title && freshSession.title !== 'New Chat';

              const isFirstMessage = userMessageCount === 1;
              if (isFirstMessage && !hasTitle) {
                const { generateSessionTitleWithStreaming } = await import('../../utils/session-title.js');
                const provider = freshSession.provider;
                const modelName = freshSession.model;
                const providerConfig = aiConfig?.providers?.[provider];

                if (providerConfig) {
                  setIsTitleStreaming(true);
                  setStreamingTitle('');

                  try {
                    const finalTitle = await generateSessionTitleWithStreaming(
                      userMessage,
                      provider,
                      modelName,
                      providerConfig,
                      (chunk) => {
                        setStreamingTitle(prev => prev + chunk);
                      }
                    );

                    setIsTitleStreaming(false);
                    updateSessionTitle(currentSessionId, finalTitle);
                  } catch (error) {
                    // Only log errors in debug mode
                    if (process.env.DEBUG) {
                      addLog(`[Title] Error: ${error instanceof Error ? error.message : 'Unknown'}`);
                    }
                    setIsTitleStreaming(false);
                    // Fallback to simple title
                    const { generateSessionTitle } = await import('../../utils/session-title.js');
                    const title = generateSessionTitle(userMessage);
                    updateSessionTitle(currentSessionId, title);
                  }
                }
              }
            }
          }
        },
        undefined, // onUserInputRequest
        attachments, // attachments
        // onReasoningStart
        () => {
          setStreamParts((prev) => [
            ...prev,
            { type: 'reasoning', content: '', startTime: Date.now() }
          ]);
        },
        // onReasoningDelta
        (text) => {
          setStreamParts((prev) => {
            const newParts = [...prev];
            const lastPart = newParts[newParts.length - 1];
            if (lastPart && lastPart.type === 'reasoning') {
              newParts[newParts.length - 1] = {
                ...lastPart,
                content: lastPart.content + text
              };
            }
            return newParts;
          });
        },
        // onReasoningEnd
        (duration) => {
          setStreamParts((prev) => {
            const newParts = [...prev];
            const lastPart = newParts[newParts.length - 1];
            if (lastPart && lastPart.type === 'reasoning') {
              newParts[newParts.length - 1] = {
                ...lastPart,
                completed: true,
                duration
              };
            }
            return newParts;
          });
        },
        // onToolError
        (toolCallId, toolName, error, duration) => {
          setStreamParts((prev) =>
            prev.map((part) =>
              part.type === 'tool' && part.toolId === toolCallId
                ? { ...part, status: 'failed', error, duration }
                : part
            )
          );
        },
        // onError
        (error) => {
          setStreamParts((prev) => [
            ...prev,
            { type: 'error', error }
          ]);
        },
        abortControllerRef.current.signal
      );
    } catch (error) {
      addLog(`[sendUserMessageToAI] Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsStreaming(false);
      setStreamParts([]);
    }
  }, [aiConfig, currentSessionId, sendMessage, addMessage, addLog, updateSessionTitle, notificationSettings]);

  // PERFORMANCE: Memoize handleSubmit to provide stable reference to child components
  const handleSubmit = useCallback(async (value: string) => {
    if (!value.trim()) return;

    // If already streaming, ignore submit (don't start new stream)
    if (isStreaming) {
      return;
    }

    // Handle pendingInput for text type
    if (pendingInput && pendingInput.type === 'text' && inputResolver.current) {
      addLog(`[handleSubmit] Resolving text input: ${value}`);

      // Add user's text input to chat history
      if (!commandSessionRef.current) {
        commandSessionRef.current = currentSessionId || createSession('openrouter', 'anthropic/claude-3.5-sonnet');
      }
      addMessage(commandSessionRef.current, 'user', value.trim());

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

    // Check if it's a command
    if (userMessage.startsWith('/')) {
      const parts = userMessage.split(' ');
      const commandName = parts[0];
      const args = parts.slice(1);

      // Find matching command
      const command = commands.find((cmd) => cmd.label === commandName);

      if (!command) {
        // Unknown command - add to conversation
        setInput('');
        if (!commandSessionRef.current) {
          commandSessionRef.current = currentSessionId || createSession('openrouter', 'anthropic/claude-3.5-sonnet');
        }
        addMessage(commandSessionRef.current, 'user', userMessage);
        addMessage(commandSessionRef.current, 'assistant', `Unknown command: ${commandName}. Type /help for available commands.`);
        return;
      }

      // Clear input immediately
      setInput('');

      // Add user command to conversation
      if (!commandSessionRef.current) {
        commandSessionRef.current = currentSessionId || createSession('openrouter', 'anthropic/claude-3.5-sonnet');
      }
      addMessage(commandSessionRef.current, 'user', userMessage);

      // Execute command - let command handle interaction via CommandContext
      try {
        const response = await command.execute(createCommandContext(args));

        // Add final response if any
        if (response) {
          addMessage(commandSessionRef.current, 'assistant', response);
        }
      } catch (error) {
        addMessage(commandSessionRef.current, 'assistant', `Error: ${error instanceof Error ? error.message : 'Command failed'}`);
      }

      setPendingCommand(null);
      return;
    }

    // For regular messages, clear input after getting the value
    setInput('');

    // Get attachments for this message
    const attachmentsForMessage: FileAttachment[] = [...pendingAttachments];

    // Clear pending attachments after capturing them
    clearAttachments();

    // Regular message - send to AI using shared helper
    await sendUserMessageToAI(userMessage, attachmentsForMessage);
  }, [
    isStreaming,
    pendingInput,
    inputResolver,
    commandSessionRef,
    currentSessionId,
    createSession,
    addMessage,
    filteredCommands,
    skipNextSubmit,
    addLog,
    clearAttachments,
    pendingAttachments,
    setInput,
    sendUserMessageToAI,
  ]);

  return (
    <Box flexDirection="row" flexGrow={1}>
      {/* Main chat area */}
      <Box flexDirection="column" flexGrow={1} width="70%">
        {/* App Header - Output once in Static */}
        <Static items={headerItems}>
          {() => (
            <Box paddingX={1} paddingY={1}>
              <Text bold color="#00D9FF">SYLPHX FLOW</Text>
              <Text dimColor> │ </Text>
              <Text dimColor>AI Development Assistant</Text>
            </Box>
          )}
        </Static>

        {/* Messages - All messages in Static, dynamic UI at bottom */}
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
        ) : (
          <>
            {/* Completed messages - using Static to keep them above */}
            {currentSession.messages.length > 0 && (
              <Static items={currentSession.messages}>
                {(msg, i) => (
                  <Box key={i} paddingX={1} paddingTop={1} flexDirection="column">
                    {msg.role === 'user' ? (
                      <>
                        <Box>
                          <Text color="#00D9FF">▌ YOU</Text>
                        </Box>
                        {/* Render content parts */}
                        {msg.content && Array.isArray(msg.content) ? (
                          msg.content.map((part, idx) => (
                            <MessagePart key={idx} part={part} />
                          ))
                        ) : (
                          <Box marginLeft={2}>
                            <Text>{String(msg.content || '')}</Text>
                          </Box>
                        )}
                        {/* Display attachments if any */}
                        {msg.attachments && msg.attachments.length > 0 ? (
                          <Box flexDirection="column" marginTop={1}>
                            {msg.attachments.map((att, attIdx) => (
                              <Box key={attIdx} marginLeft={2}>
                                <Text dimColor>Attached(</Text>
                                <Text color="#00D9FF">{att.relativePath}</Text>
                                <Text dimColor>)</Text>
                                {attachmentTokens.has(att.path) && (
                                  <>
                                    <Text dimColor> </Text>
                                    <Text dimColor>{formatTokenCount(attachmentTokens.get(att.path)!)} Tokens</Text>
                                  </>
                                )}
                              </Box>
                            ))}
                          </Box>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <Box>
                          <Text color="#00FF88">▌ SYLPHX</Text>
                        </Box>
                        {/* Render content parts */}
                        {msg.content && Array.isArray(msg.content) ? (
                          msg.content.map((part, idx) => (
                            <MessagePart key={idx} part={part} />
                          ))
                        ) : (
                          <Box marginLeft={2}>
                            <Text>{String(msg.content || '')}</Text>
                          </Box>
                        )}
                        {/* Show usage if available - simplified */}
                        {msg.usage && (
                          <Box marginLeft={2}>
                            <Text dimColor>
                              {msg.usage.promptTokens.toLocaleString()} → {msg.usage.completionTokens.toLocaleString()}
                            </Text>
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                )}
              </Static>
            )}

            {/* Currently streaming message - dynamic, stays at bottom */}
            {isStreaming && (
              <Box paddingTop={1} flexDirection="column">
                <Box>
                  <Text color="#00FF88">▌ SYLPHX</Text>
                </Box>

                {/* Show loading when no parts yet */}
                {streamParts.length === 0 && (
                  <Box marginLeft={2}>
                    <Spinner color="#FFD700" />
                    <Text dimColor> Thinking...</Text>
                  </Box>
                )}

                {/* Render parts in order */}
                {streamParts.map((part, idx) => {
                  const isLastPart = idx === streamParts.length - 1;
                  // Generate stable key based on part type and identity
                  const key = part.type === 'tool'
                    ? `tool-${part.toolId}`
                    : part.type === 'reasoning'
                    ? `reasoning-${part.startTime}`
                    : `${part.type}-${idx}`;

                  return (
                    <MessagePart
                      key={key}
                      part={part}
                      isLastInStream={isLastPart && part.type === 'text'}
                    />
                  );
                })}
              </Box>
            )}
          </>
        )}

        {/* Todo List - Always visible, positioned above input */}
        <TodoList />

        {/* LLM Status Indicator */}
        {isStreaming && (
          <Box paddingY={1}>
            <Spinner color="#FFD700" />
            {streamParts.length === 0 ? (
              <Text color="#FFD700"> AI is thinking...</Text>
            ) : streamParts.some(p => p.type === 'tool' && p.status === 'running') ? (
              <Text color="#FFD700"> Executing tools...</Text>
            ) : streamParts.some(p => p.type === 'reasoning') ? (
              <Text color="#FFD700"> Reasoning...</Text>
            ) : (
              <Text color="#FFD700"> AI is responding...</Text>
            )}
          </Box>
        )}

        {/* Input Area */}
        {/* Match padding with messages for visual consistency */}
        <Box
          flexDirection="column"
          flexShrink={0}
          paddingTop={1}
        >
          <Box>
            <Text color="#00D9FF">▌ YOU</Text>
          </Box>

          {/* PendingInput Mode - when command calls waitForInput */}
          {pendingInput && pendingInput.type === 'selection' ? (
            <SelectionUI
              pendingInput={pendingInput}
              multiSelectionPage={multiSelectionPage}
              multiSelectionAnswers={multiSelectionAnswers}
              multiSelectChoices={multiSelectChoices}
              selectionFilter={selectionFilter}
              isFilterMode={isFilterMode}
              selectedCommandIndex={selectedCommandIndex}
              askQueueLength={askQueueLength}
            />
          ) : /* Selection Mode - when a command is pending and needs args */
          pendingCommand ? (
            <PendingCommandSelection
              pendingCommand={pendingCommand}
              currentlyLoading={currentlyLoading}
              loadError={loadError}
              cachedOptions={cachedOptions}
              selectedCommandIndex={selectedCommandIndex}
              onSelect={async (option) => {
                const response = await pendingCommand.command.execute(createCommandContext([option.value || option.label]));
                if (currentSessionId) {
                  addMessage(currentSessionId, 'assistant', response);
                }
                setPendingCommand(null);
                setSelectedCommandIndex(0);
              }}
            />
          ) : isStreaming ? (
            <Box flexDirection="column">
              <Text dimColor>Waiting for response...</Text>
              <Box marginTop={1}>
                <Text color="yellow">Press ESC to cancel</Text>
              </Box>
            </Box>
          ) : (
            <>
              {/* Show pending attachments */}
              {pendingAttachments.length > 0 ? (
                <Box flexDirection="column" marginBottom={1}>
                  <Box marginBottom={1}>
                    <Text dimColor>Attachments ({pendingAttachments.length}):</Text>
                  </Box>
                  {pendingAttachments.map((att, idx) => (
                    <Box key={idx} marginLeft={2}>
                      <Text color="#00D9FF">{att.relativePath}</Text>
                      <Text dimColor> (</Text>
                      {att.size ? (
                        <>
                          <Text dimColor>{(att.size / 1024).toFixed(1)}KB</Text>
                          {attachmentTokens.has(att.path) && <Text dimColor>, </Text>}
                        </>
                      ) : null}
                      {attachmentTokens.has(att.path) ? (
                        <Text dimColor>{formatTokenCount(attachmentTokens.get(att.path)!)} Tokens</Text>
                      ) : null}
                      <Text dimColor>)</Text>
                    </Box>
                  ))}
                </Box>
              ) : null}

              {/* Show prompt for text input mode */}
              {pendingInput?.type === 'text' && pendingInput.prompt && (
                <Box marginBottom={1}>
                  <Text dimColor>{pendingInput.prompt}</Text>
                </Box>
              )}

              {/* Text Input with inline hint */}
              <Box marginLeft={2}>
                <TextInputWithHint
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
                  cursor={pendingInput?.type === 'selection' ? undefined : cursor}
                  onCursorChange={pendingInput?.type === 'selection' ? undefined : setCursor}
                  onSubmit={handleSubmit}
                  placeholder={
                    pendingInput?.type === 'selection'
                      ? 'Type to filter options...'
                      : pendingInput?.type === 'text'
                      ? (pendingInput.placeholder || 'Type your response...')
                      : 'Type your message, / for commands, @ for files...'
                  }
                  showCursor
                  hint={hintText}
                  validTags={validTags}
                  disableUpDownArrows={
                    // Disable up/down arrows when autocomplete is active
                    filteredFileInfo.hasAt ||
                    (input.startsWith('/') && filteredCommands.length > 0)
                  }
                />
              </Box>

              {/* ESC hint - shows after first ESC press */}
              {showEscHint && (
                <Box marginTop={1}>
                  <Text color="yellow">Press ESC again to clear input</Text>
                </Box>
              )}

              {/* File Autocomplete - Shows below input when typing @ */}
              {filteredFileInfo.hasAt ? (
                <FileAutocomplete
                  files={filteredFileInfo.files}
                  selectedFileIndex={selectedFileIndex}
                  filesLoading={filesLoading}
                />
              ) : null}

              {/* Command Autocomplete - Shows below input when typing / */}
              {input.startsWith('/') && !filteredFileInfo.hasAt && filteredCommands.length > 0 ? (
                <CommandAutocomplete
                  commands={filteredCommands}
                  selectedCommandIndex={selectedCommandIndex}
                  currentlyLoading={currentlyLoading}
                  loadError={loadError}
                />
              ) : null}
            </>
          )}
        </Box>

        {/* Status Bar - Fixed at bottom */}
        <Box flexShrink={0} paddingTop={1} flexDirection="row">
          {currentSession && (
            <StatusBar
              provider={currentSession.provider}
              model={currentSession.model}
              apiKey={aiConfig?.providers?.[currentSession.provider]?.apiKey}
              usedTokens={usedTokens}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}

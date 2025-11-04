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
import type { FileAttachment, TokenUsage } from '../../types/session.types.js';
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
import type { MessagePart as StreamPart } from '../../types/session.types.js';
import { getSessionRepository } from '../../db/database.js';

/**
 * StreamPart - Alias for MessagePart
 *
 * DESIGN DECISION: Unified type for streaming and persistence
 * ===========================================================
 *
 * MessagePart is used directly for both streaming and persistence:
 * - All parts have status field ('active' | 'completed' | 'error' | 'abort')
 * - No conversion needed between formats
 * - Streaming state stored in database message with status='active'
 * - Parts updated via updateMessageParts() during streaming
 * - Message status updated via updateMessageStatus() on completion
 *
 * This unification eliminates conversion overhead and simplifies recovery.
 */

interface ChatProps {
  commandFromPalette?: string | null;
}

/**
 * Generate stable key for a streaming part
 *
 * Key must remain stable as parts move between static/dynamic regions.
 * Uses global index in streamParts array to ensure consistency.
 */
function getStreamingPartKey(part: StreamPart, streamParts: StreamPart[]): string {
  const globalIdx = streamParts.indexOf(part);
  return part.type === 'tool'
    ? `stream-tool-${part.toolId}`
    : part.type === 'reasoning'
    ? `stream-reasoning-${part.startTime || globalIdx}`
    : part.type === 'error'
    ? `stream-error-${globalIdx}`
    : `stream-text-${globalIdx}`;
}

// Global debug flag - TODO: remove after debugging streaming issues
const SHOW_DEBUG_INDICATORS = false;  // Disabled after fixing

/**
 * Streaming Part Wrapper Component
 *
 * Renders a streaming part with consistent structure for both static and dynamic regions.
 * Ensures React can properly reuse components when parts move between regions.
 *
 * @param part - The streaming part to render
 * @param isLastInStream - Whether this is the last text part (shows cursor)
 * @param debugRegion - Debug flag to show which region this part is in (static/dynamic)
 */
function StreamingPartWrapper({
  part,
  isLastInStream = false,
  debugRegion,
}: {
  part: StreamPart;
  isLastInStream?: boolean;
  debugRegion?: 'static' | 'dynamic';
}) {
  // Get status with fallback for old messages without status field
  const status = 'status' in part ? part.status : 'completed';

  return (
    <Box paddingX={1} flexDirection="column">
      {(debugRegion || SHOW_DEBUG_INDICATORS) && (
        <Box>
          <Text
            backgroundColor={
              debugRegion === 'static' ? 'green' :
              debugRegion === 'dynamic' ? 'blue' :
              'gray'  // no debugRegion = completed message
            }
            color="black"
          >
            {' '}{part.type.toUpperCase()}: {status} {debugRegion ? `[${debugRegion.toUpperCase()}]` : ''}{' '}
          </Text>
        </Box>
      )}
      <MessagePart
        part={part}
        isLastInStream={isLastInStream}
      />
    </Box>
  );
}

/**
 * Helper to convert status strings between formats
 * Maps tool 'running'/'failed' to MessagePart 'active'/'error'
 */
function mapToolStatusToPart(status: 'running' | 'completed' | 'failed'): 'active' | 'completed' | 'error' {
  if (status === 'running') return 'active';
  if (status === 'failed') return 'error';
  return 'completed';
}

function mapPartStatusToTool(status: 'active' | 'completed' | 'error' | 'abort'): 'running' | 'completed' | 'failed' {
  if (status === 'active') return 'running';
  if (status === 'error' || status === 'abort') return 'failed';
  return 'completed';
}

export default function Chat({ commandFromPalette }: ChatProps) {
  const [input, setInput] = useState('');
  const [cursor, setCursor] = useState(0); // Controlled cursor position

  // Normalize cursor to valid range (防禦性：確保 cursor 始終在有效範圍內)
  const normalizedCursor = Math.max(0, Math.min(cursor, input.length));
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false); // Message streaming active
  const [isTitleStreaming, setIsTitleStreaming] = useState(false);
  const [streamingTitle, setStreamingTitle] = useState('');

  // Abort controller for cancelling AI stream
  const abortControllerRef = useRef<AbortController | null>(null);

  // Flag to track if user manually aborted (ESC pressed)
  const wasManuallyAbortedRef = useRef(false);

  // Store last error for onComplete handler
  const lastErrorRef = useRef<string | null>(null);

  // Store current streaming message ID for persistence
  const streamingMessageIdRef = useRef<string | null>(null);

  // Store usage and finishReason for onComplete
  const usageRef = useRef<TokenUsage | null>(null);
  const finishReasonRef = useRef<string | null>(null);

  // Optimized streaming: accumulate chunks in ref, update state in batches
  const streamBufferRef = useRef<{ chunks: string[]; timeout: NodeJS.Timeout | null }>({
    chunks: [],
    timeout: null
  });

  // Debounced database persistence
  // Reduces write frequency to avoid SQLITE_BUSY errors
  const dbWriteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDbContentRef = useRef<StreamPart[] | null>(null);
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

  // Helper to schedule a debounced database write
  // Reduces SQLITE_BUSY errors by batching writes
  const scheduleDatabaseWrite = useCallback((content: StreamPart[]) => {
    // Store pending content
    pendingDbContentRef.current = content;

    // Clear existing timer
    if (dbWriteTimerRef.current) {
      clearTimeout(dbWriteTimerRef.current);
    }

    // Schedule write after 500ms of inactivity
    dbWriteTimerRef.current = setTimeout(async () => {
      if (streamingMessageIdRef.current && pendingDbContentRef.current) {
        try {
          const repo = await getSessionRepository();
          await repo.updateMessageParts(streamingMessageIdRef.current, pendingDbContentRef.current);
          pendingDbContentRef.current = null;
        } catch (error) {
          if (process.env.DEBUG) {
            console.error(`Failed to persist parts: ${error}`);
          }
        }
      }
      dbWriteTimerRef.current = null;
    }, 500);
  }, []);

  // Helper to immediately flush pending database write
  // Used on message completion to ensure final state is saved
  const flushDatabaseWrite = useCallback(async () => {
    // Clear timer
    if (dbWriteTimerRef.current) {
      clearTimeout(dbWriteTimerRef.current);
      dbWriteTimerRef.current = null;
    }

    // Get content to persist
    let contentToWrite: StreamPart[] | null = pendingDbContentRef.current;

    // If no pending content, read from app store (handles abort/error cases)
    if (!contentToWrite && streamingMessageIdRef.current) {
      const state = useAppStore.getState();
      const session = state.sessions.find((s) => s.id === currentSessionId);
      if (session) {
        const activeMessage = session.messages.find((m) => m.status === 'active');
        if (activeMessage) {
          contentToWrite = activeMessage.content;
        }
      }
    }

    // ALWAYS write to database if we have a message ID
    // Even if content is empty, we need to save the final state
    if (streamingMessageIdRef.current && contentToWrite) {
      try {
        const repo = await getSessionRepository();
        await repo.updateMessageParts(streamingMessageIdRef.current, contentToWrite);
        pendingDbContentRef.current = null;
      } catch (error) {
        if (process.env.DEBUG) {
          console.error(`Failed to flush parts: ${error}`);
        }
      }
    }
  }, [currentSessionId]);

  // Helper to update active message content in session
  // Defined after currentSessionId to avoid initialization error
  // NOTE: Using immer-style mutations (immer middleware automatically creates new objects)
  const updateActiveMessageContent = useCallback((updater: (prev: StreamPart[]) => StreamPart[]) => {
    useAppStore.setState((state) => {
      const session = state.sessions.find((s) => s.id === currentSessionId);
      if (!session) return;

      const activeMessage = session.messages.find((m) => m.status === 'active');
      if (!activeMessage) return;

      // Update content using immer-style mutation
      const newContent = updater(activeMessage.content);
      activeMessage.content = newContent;

      // Schedule debounced database write (batched to reduce SQLITE_BUSY)
      scheduleDatabaseWrite(newContent);
    });
  }, [currentSessionId, scheduleDatabaseWrite]);

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

  /**
   * Effect: Restore streaming state on session switch
   *
   * NEW DESIGN: Message-based streaming state
   * ==========================================
   *
   * Streaming state is now stored in session.messages with status='active':
   * - UI directly reads from session.messages
   * - No separate streamParts state needed
   * - Just need to set isStreaming flag
   */
  useEffect(() => {
    if (!currentSessionId) {
      setIsStreaming(false);
      return;
    }

    // Find session in store
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) {
      setIsStreaming(false);
      return;
    }

    // Find active (streaming) message in session
    const activeMessage = session.messages.find(m => m.status === 'active');
    setIsStreaming(!!activeMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId]); // ONLY depend on currentSessionId (not sessions)

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
    cursor: normalizedCursor,
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
    wasManuallyAbortedRef,
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

    // Reset flags for new stream
    wasManuallyAbortedRef.current = false;
    lastErrorRef.current = null;
    usageRef.current = null;
    finishReasonRef.current = null;

    // Create abort controller for this stream
    abortControllerRef.current = new AbortController();

    // NOTE: Assistant message will be created on first streaming event
    // This ensures correct message order: [user, assistant]
    // (user added by sendMessage first, then assistant created)
    const repo = await getSessionRepository();
    const assistantTimestamp = Date.now();
    let assistantMessageCreated = false;

    // Helper to create assistant message on first streaming event
    const ensureAssistantMessage = async () => {
      if (assistantMessageCreated) return;
      assistantMessageCreated = true;

      // Create assistant message in database
      const messageId = await repo.addMessage(
        currentSessionId!,
        'assistant',
        [], // Start with empty parts
        undefined, // no attachments
        undefined, // no usage yet
        undefined, // no finishReason yet
        undefined, // no metadata
        undefined, // no todoSnapshot
        'active' // Mark as active for streaming
      );
      streamingMessageIdRef.current = messageId;

      // Sync to app store immediately
      useAppStore.setState((state) => {
        const session = state.sessions.find((s) => s.id === currentSessionId);
        if (session) {
          session.messages.push({
            role: 'assistant',
            content: [],
            timestamp: assistantTimestamp,
            status: 'active',
          });
        }
      });
    };

    // Helper to flush accumulated chunks
    // This updates the last text part (part-level streaming)
    const flushStreamBuffer = () => {
      const buffer = streamBufferRef.current;
      if (buffer.chunks.length === 0) return;

      const accumulatedText = buffer.chunks.join('');
      buffer.chunks = [];

      updateActiveMessageContent((prev) => {
        const newParts = [...prev];
        const lastPart = newParts[newParts.length - 1];

        // Part streaming: Add delta to last text part
        if (lastPart && lastPart.type === 'text' && lastPart.status === 'active') {
          newParts[newParts.length - 1] = {
            type: 'text',
            content: lastPart.content + accumulatedText,
            status: 'active' as const  // Text is active while streaming
          };
        } else {
          // No text part at end, create new one
          newParts.push({
            type: 'text',
            content: accumulatedText,
            status: 'active' as const
          });
        }

        return newParts;
      });
    };

    try {
      await sendMessage(userMessage, {
        attachments,
        abortSignal: abortControllerRef.current.signal,

        // onChunk - text streaming (batched for performance)
        onChunk: async (chunk) => {
          // Create assistant message on first streaming event
          await ensureAssistantMessage();

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
        onToolCall: async (toolCallId, toolName, args) => {
          // Create assistant message on first streaming event
          await ensureAssistantMessage();

          // Message streaming: New part (tool) being added
          // Can be parallel - multiple tools can be active simultaneously
          updateActiveMessageContent((prev) => [
            ...prev,
            { type: 'tool', toolId: toolCallId, name: toolName, status: 'active', args, startTime: Date.now() } as StreamPart
          ]);
        },

        // onToolResult - tool execution completed
        onToolResult: (toolCallId, toolName, result, duration) => {
          // Part streaming: Update tool status to completed
          updateActiveMessageContent((prev) =>
            prev.map((part) =>
              part.type === 'tool' && part.toolId === toolCallId
                ? { ...part, status: 'completed' as const, duration, result }
                : part
            )
          );
        },

        // onComplete - finalize message status
        onComplete: async () => {
          try {
            // NEW DESIGN: Message-based streaming
            // ====================================
            //
            // Message was created with status='active' when streaming started.
            // Parts were updated via updateMessageParts() during streaming.
            // Now just update message status to 'completed', 'abort', or 'error'.

            const wasAborted = wasManuallyAbortedRef.current;
            const hasError = lastErrorRef.current;

            // Flush any remaining buffered text chunks first
            if (streamBufferRef.current.timeout) {
              clearTimeout(streamBufferRef.current.timeout);
              streamBufferRef.current.timeout = null;
            }
            if (streamBufferRef.current.chunks.length > 0) {
              flushStreamBuffer();
            }
            streamBufferRef.current.chunks = [];

            // Flush pending database writes immediately
            // This ensures final message content is persisted before status update
            await flushDatabaseWrite();

            // Update message status in database
            // Note: finishReason is already saved by onFinish, don't pass it here
            const finalStatus = wasAborted ? 'abort' : hasError ? 'error' : 'completed';
            if (streamingMessageIdRef.current) {
              try {
                // If aborted, mark all active parts as 'abort' in database
                if (wasAborted) {
                  const state = useAppStore.getState();
                  const session = state.sessions.find((s) => s.id === currentSessionId);
                  if (session) {
                    const activeMessage = [...session.messages]
                      .reverse()
                      .find((m) => m.role === 'assistant' && m.status === 'active');
                    if (activeMessage) {
                      const updatedParts = activeMessage.content.map(part =>
                        part.status === 'active' ? { ...part, status: 'abort' as const } : part
                      );
                      await repo.updateMessageParts(streamingMessageIdRef.current, updatedParts);
                    }
                  }
                }

                await repo.updateMessageStatus(streamingMessageIdRef.current, finalStatus);
              } catch (error) {
                if (process.env.DEBUG) {
                  console.error(`Failed to update message status: ${error}`);
                }
                // Continue execution - status update failure shouldn't block UI cleanup
              }
            }

            // Update app store status (content was updated in real-time by callbacks)
            // NOTE: Using immer-style mutations (immer middleware automatically creates new objects)
            useAppStore.setState((state) => {
              const session = state.sessions.find((s) => s.id === currentSessionId);
              if (!session) return;

              // Find last active assistant message (messages can be added in any order)
              const activeMessage = [...session.messages]
                .reverse()
                .find((m) => m.role === 'assistant' && m.status === 'active');

              if (!activeMessage) return;

              // If aborted, mark all active parts as 'abort'
              if (wasAborted) {
                activeMessage.content.forEach(part => {
                  if (part.status === 'active') {
                    part.status = 'abort';
                  }
                });
                if (process.env.DEBUG) {
                  console.error(`[abort] Marked ${activeMessage.content.filter(p => p.status === 'abort').length} parts as abort`);
                }
              }

              // Update message status and metadata using immer-style mutation
              activeMessage.status = finalStatus;
              if (process.env.DEBUG) {
                console.error(`[abort] Message status updated to: ${finalStatus}`);
              }
              if (usageRef.current) {
                activeMessage.usage = usageRef.current;
              }
              if (finishReasonRef.current) {
                activeMessage.finishReason = finishReasonRef.current;
              }
            });
          } catch (error) {
            // Critical error in onComplete - log but don't throw
            if (process.env.DEBUG) {
              console.error(`Critical error in onComplete: ${error instanceof Error ? error.message : String(error)}`);
            }
          } finally {
            // ALWAYS cleanup state, even if there are errors
            // This prevents UI from getting stuck in streaming state

            // Reset flags
            wasManuallyAbortedRef.current = false;
            lastErrorRef.current = null;
            streamingMessageIdRef.current = null;
            usageRef.current = null;
            finishReasonRef.current = null;

            // Message streaming ended - all parts saved to message history
            setIsStreaming(false);
          }

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

        // onUserInputRequest - handle AI tool ask requests
        onUserInputRequest: async (request) => {
          // Use the same waitForInput mechanism as commands
          // The ask tool sends UserInputRequest which is compatible with WaitForInputOptions
          return new Promise((resolve) => {
            inputResolver.current = resolve;
            setPendingInput(request);

            // Reset multi-selection state
            if (request.questions.length > 1) {
              setMultiSelectionPage(0);
              setMultiSelectionAnswers({});
              // Initialize pre-selected choices for first question if multi-select
              const firstQuestion = request.questions[0];
              if (firstQuestion?.multiSelect && firstQuestion.preSelected) {
                setMultiSelectChoices(new Set(firstQuestion.preSelected));
              } else {
                setMultiSelectChoices(new Set());
              }
            }
          });
        },

        // onReasoningStart
        onReasoningStart: async () => {
          // Create assistant message on first streaming event
          await ensureAssistantMessage();

          // Message streaming: New part (reasoning) being added
          updateActiveMessageContent((prev) => [
            ...prev,
            { type: 'reasoning', content: '', status: 'active', startTime: Date.now() } as StreamPart
          ]);
        },

        // onReasoningDelta
        onReasoningDelta: (text) => {
          // Part streaming: Add delta to last reasoning part
          updateActiveMessageContent((prev) => {
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
        onReasoningEnd: (duration) => {
          // Part streaming: Mark reasoning as completed
          // Find the last active reasoning part (not necessarily the last part overall)
          updateActiveMessageContent((prev) => {
            const newParts = [...prev];

            // Find last active reasoning part (events can arrive out of order)
            const lastReasoningIndex = newParts.map((p, i) => ({ p, i }))
              .reverse()
              .find(({ p }) => p.type === 'reasoning' && p.status === 'active')?.i;

            if (lastReasoningIndex !== undefined) {
              const reasoningPart = newParts[lastReasoningIndex];
              if (reasoningPart.type === 'reasoning') {
                newParts[lastReasoningIndex] = {
                  ...reasoningPart,
                  status: 'completed',
                  duration
                };
              }
            }

            return newParts;
          });
        },

        // onTextEnd - mark text part as completed
        onTextEnd: () => {
          // Part streaming: Mark text as completed
          // Find the last active text part (not necessarily the last part overall)
          updateActiveMessageContent((prev) => {
            const newParts = [...prev];

            // Find last active text part (events can arrive out of order)
            const lastTextIndex = newParts.map((p, i) => ({ p, i }))
              .reverse()
              .find(({ p }) => p.type === 'text' && p.status === 'active')?.i;

            if (lastTextIndex !== undefined) {
              const textPart = newParts[lastTextIndex];
              if (textPart.type === 'text') {
                newParts[lastTextIndex] = {
                  ...textPart,
                  status: 'completed'
                };
              }
            }

            return newParts;
          });
        },

        // onToolInputStart - tool input streaming started
        onToolInputStart: (toolCallId, toolName) => {
          // Tool input streaming started - args will be streamed in deltas
          // No UI update needed
        },

        // onToolInputDelta - tool input streaming delta
        onToolInputDelta: (toolCallId, toolName, argsTextDelta) => {
          // Part streaming: Update tool args as they stream in
          updateActiveMessageContent((prev) =>
            prev.map((part) => {
              if (part.type === 'tool' && part.toolId === toolCallId) {
                // Append args delta to current args
                const currentArgs = typeof part.args === 'string' ? part.args : JSON.stringify(part.args || '');
                return { ...part, args: currentArgs + argsTextDelta };
              }
              return part;
            })
          );
        },

        // onToolInputEnd - tool input streaming completed
        onToolInputEnd: (toolCallId, toolName, args) => {
          // Part streaming: Finalize tool args
          updateActiveMessageContent((prev) =>
            prev.map((part) =>
              part.type === 'tool' && part.toolId === toolCallId
                ? { ...part, args }
                : part
            )
          );
        },

        // onToolError
        onToolError: (toolCallId, toolName, error, duration) => {
          // Part streaming: Update tool status to error
          updateActiveMessageContent((prev) =>
            prev.map((part) =>
              part.type === 'tool' && part.toolId === toolCallId
                ? { ...part, status: 'error' as const, error, duration }
                : part
            )
          );
        },

        // onError
        onError: async (error) => {
          // Create assistant message on first streaming event (even if it's an error)
          await ensureAssistantMessage();

          // Store error for onComplete handler
          lastErrorRef.current = error;
          updateActiveMessageContent((prev) => [
            ...prev,
            { type: 'error', error, status: 'completed' } as StreamPart
          ]);
        },

        // onFinish - save usage and finishReason
        onFinish: async (usage, finishReason) => {
          // Store for onComplete to update app store
          usageRef.current = usage;
          finishReasonRef.current = finishReason;

          // Save usage and finishReason to database
          if (streamingMessageIdRef.current) {
            try {
              // Save usage
              await repo.updateMessageUsage(streamingMessageIdRef.current, usage);

              // Save finishReason
              await repo.updateMessageStatus(
                streamingMessageIdRef.current,
                'active', // Keep status as active, will be updated in onComplete
                finishReason
              );
            } catch (error) {
              if (process.env.DEBUG) {
                console.error(`Failed to save usage/finishReason: ${error}`);
              }
            }
          }
        },
      });
    } catch (error) {
      addLog(`[sendUserMessageToAI] Error: ${error instanceof Error ? error.message : String(error)}`);

      // Store error for onComplete handler
      lastErrorRef.current = error instanceof Error ? error.message : String(error);

      // Note: onComplete will be called by useChat and will handle saving partial content

      setIsStreaming(false);
    }
  }, [aiConfig, currentSessionId, sendMessage, addMessage, addLog, updateSessionTitle, notificationSettings, flushDatabaseWrite]);

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
          {(item) => (
            <Box key={item} paddingX={1} paddingY={1}>
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
            {/**
             * COMPLETED MESSAGES: Entire message in Static
             *
             * Why: Ink auto-scroll only works with Static. Dynamic content = no scroll.
             * How: Completed messages never change → safe to freeze in Static.
             */}
            {(() => {
              // Filter to get only non-active messages for Static rendering
              const completedMessages = currentSession.messages.filter(
                m => m.status !== 'active'
              );

              return completedMessages.length > 0 && (
                <Static items={completedMessages}>
                  {(msg, i) => (
                    <Box key={`msg-${msg.timestamp}-${i}`} paddingTop={1} flexDirection="column">
                        {msg.role === 'user' ? (
                        <>
                          <Box paddingX={1}>
                            <Text color="#00D9FF">▌ YOU</Text>
                          </Box>
                          {/* Render content parts */}
                          {msg.content && Array.isArray(msg.content) ? (
                            msg.content.map((part, idx) => (
                              <StreamingPartWrapper
                                key={`msg-${msg.timestamp}-part-${idx}`}
                                part={part}
                              />
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
                                <Box key={`msg-${msg.timestamp}-att-${att.path}`} marginLeft={2}>
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
                          <Box paddingX={1}>
                            <Text color="#00FF88">▌ SYLPHX</Text>
                          </Box>
                          {/* Render content parts */}
                          {msg.content && Array.isArray(msg.content) ? (
                            msg.content.map((part, idx) => (
                              <StreamingPartWrapper
                                key={`msg-${msg.timestamp}-part-${idx}`}
                                part={part}
                              />
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
              );
            })()}

            {/* Active (streaming) message - render directly from session.messages */}
            {(() => {
              // Find active message in session
              const activeMessage = currentSession.messages.find(m => m.status === 'active');
              if (!activeMessage) return null;

              const streamParts = activeMessage.content;

              // Helper to check if part is completed
              const isPartCompleted = (part: StreamPart): boolean => {
                // All parts now have status field - check if it's completed
                return part.status === 'completed' || part.status === 'error' || part.status === 'abort';
              };

              // Find first non-completed part (this is the boundary)
              const firstIncompleteIndex = streamParts.findIndex(part => !isPartCompleted(part));

              // DEBUG: Log part completion status (only if DEBUG enabled)
              if (SHOW_DEBUG_INDICATORS && streamParts.length > 0) {
                console.error('[Static/Dynamic Split]');
                console.error('  Total parts:', streamParts.length);
                console.error('  First incomplete index:', firstIncompleteIndex);
                streamParts.forEach((part, idx) => {
                  const completed = isPartCompleted(part);
                  console.error(`  [${idx}] ${part.type}: ${completed ? 'COMPLETED' : 'INCOMPLETE'} status=${part.status}`);
                });
              }

              // Split into static and dynamic
              // Static: Continuous completed parts from start
              // Dynamic: First incomplete part onwards (even if later parts are completed)
              const staticParts = firstIncompleteIndex === -1
                ? streamParts  // All completed
                : streamParts.slice(0, firstIncompleteIndex);

              const dynamicParts = firstIncompleteIndex === -1
                ? []  // All in static
                : streamParts.slice(firstIncompleteIndex);

              return (
                <>
                  {/**
                   * ACTIVE MESSAGE HEADER: Must be in Static for auto-scroll
                   *
                   * Critical Ink behavior:
                   * - Static re-renders only when NEW items added to array
                   * - Updating existing item properties = no re-render
                   * - Terminal auto-scroll = Static only, not Dynamic
                   *
                   * Strategy:
                   * - Header in Static → renders once, triggers scroll
                   * - Content in Static (completed parts) + Dynamic (active parts)
                   * - Balance: performance (frozen) + real-time updates
                   *
                   * Failed alternatives:
                   * ❌ Header in Dynamic → no auto-scroll
                   * ❌ Entire message in Static → content doesn't update
                   */}
                  <Static items={[activeMessage]}>
                    {(msg) => (
                      <Box key={`active-header-${msg.timestamp}`} paddingX={1} paddingTop={1}>
                        <Text color="#00FF88">▌ SYLPHX</Text>
                      </Box>
                    )}
                  </Static>

                  {/* Static parts - continuous completed from start */}
                  {staticParts.length > 0 && (
                    <Static items={staticParts}>
                      {(part) => (
                        <StreamingPartWrapper
                          key={getStreamingPartKey(part, streamParts)}
                          part={part}
                          debugRegion="static"
                        />
                      )}
                    </Static>
                  )}

                  {/* Dynamic parts - first incomplete onwards */}
                  {dynamicParts.length > 0 ? (
                    <>
                      {dynamicParts.map((part, idx) => {
                        const isLastPart = idx === dynamicParts.length - 1;

                        return (
                          <StreamingPartWrapper
                            key={getStreamingPartKey(part, streamParts)}
                            part={part}
                            isLastInStream={isLastPart && part.type === 'text'}
                            debugRegion="dynamic"
                          />
                        );
                      })}
                    </>
                  ) : streamParts.length === 0 ? (
                    /* No parts yet - show waiting indicator */
                    <Box paddingX={1} marginLeft={2}>
                      <Text dimColor>...</Text>
                    </Box>
                  ) : null}
                </>
              );
            })()}
          </>
        )}

        {/* Status Indicator - Always present to prevent layout shift */}
        <Box paddingY={1}>
          {isStreaming ? (
            <>
              <Spinner color="#FFD700" />
              {(() => {
                const activeMessage = currentSession.messages.find(m => m.status === 'active');
                const streamParts = activeMessage?.content || [];

                if (streamParts.length === 0) {
                  return <Text color="#FFD700"> Thinking...</Text>;
                } else if (streamParts.some(p => p.type === 'tool' && p.status === 'active')) {
                  return <Text color="#FFD700"> Working...</Text>;
                } else if (streamParts.some(p => p.type === 'reasoning')) {
                  return <Text color="#FFD700"> Thinking...</Text>;
                } else {
                  return <Text color="#FFD700"> Typing...</Text>;
                }
              })()}
              <Text dimColor> (ESC to cancel)</Text>
            </>
          ) : (
            <Text> </Text>
          )}
        </Box>

        {/* Todo List - Always visible, positioned above input */}
        <TodoList />

        {/* Input Area */}
        <Box
          flexDirection="column"
          flexShrink={0}
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
          ) : (
            <>
              {/* Show pending attachments */}
              {pendingAttachments.length > 0 ? (
                <Box flexDirection="column" marginBottom={1}>
                  <Box marginBottom={1}>
                    <Text dimColor>Attachments ({pendingAttachments.length}):</Text>
                  </Box>
                  {pendingAttachments.map((att, idx) => (
                    <Box key={`pending-att-${att.path}`} marginLeft={2}>
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
                  key="main-input"
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
                  cursor={pendingInput?.type === 'selection' ? undefined : normalizedCursor}
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

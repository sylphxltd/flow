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
import type { StreamingPart } from '../../types/session.types.js';

/**
 * StreamPart - Internal streaming representation
 *
 * DESIGN DECISION: Why separate type from StreamingPart?
 * ========================================================
 *
 * StreamPart (internal, this file):
 * - Optimized for UI rendering during active streaming
 * - Uses 'completed' boolean for reasoning (simpler logic)
 * - Minimal fields for performance
 *
 * StreamingPart (persisted, session.types.ts):
 * - Standardized format for session persistence
 * - Explicit 'status' fields for all part types
 * - Includes 'aborted' state for recovery
 *
 * Conversion happens at persistence boundary:
 * - StreamPart → StreamingPart when saving to session
 * - StreamingPart → StreamPart when restoring from session
 *
 * This separation keeps streaming code simple while maintaining
 * rich persistence format for session recovery.
 */
type StreamPart =
  | { type: 'text'; content: string }
  | { type: 'reasoning'; content: string; completed?: boolean; duration?: number; startTime?: number }
  | { type: 'tool'; toolId: string; name: string; status: 'running' | 'completed' | 'failed'; duration?: number; args?: unknown; result?: unknown; error?: string; startTime?: number }
  | { type: 'error'; error: string };

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

/**
 * Streaming Part Wrapper Component
 *
 * Renders a streaming part with consistent structure for both static and dynamic regions.
 * Ensures React can properly reuse components when parts move between regions.
 *
 * @param part - The streaming part to render
 * @param isFirst - Whether this is the first part (shows "▌ SYLPHX" header)
 * @param isLastInStream - Whether this is the last text part (shows cursor)
 */
function StreamingPartWrapper({
  part,
  isFirst,
  isLastInStream = false,
}: {
  part: StreamPart;
  isFirst: boolean;
  isLastInStream?: boolean;
}) {
  return (
    <Box paddingX={1} paddingTop={isFirst ? 1 : 0} flexDirection="column">
      {isFirst && (
        <Box>
          <Text color="#00FF88">▌ SYLPHX</Text>
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
 * Convert internal StreamPart to persisted StreamingPart format
 *
 * DESIGN DECISION: Conversion strategy
 * ====================================
 *
 * Status mapping:
 * - text: always 'completed' (text parts are immutable once created)
 * - reasoning: completed=true → 'completed', completed=false/undefined → 'active'
 * - tool: maps status directly (running/completed/failed)
 * - error: always 'completed'
 *
 * Why this mapping?
 * - Preserves all runtime state for recovery
 * - Text parts don't need 'active' state (accumulated atomically)
 * - Reasoning and tools have clear active/completed lifecycle
 */
function toPersistentFormat(part: StreamPart): StreamingPart {
  if (part.type === 'text') {
    return {
      type: 'text',
      content: part.content,
      status: 'completed'
    };
  }
  if (part.type === 'reasoning') {
    const base: StreamingPart & { type: 'reasoning' } = {
      type: 'reasoning' as const,
      content: part.content,
      status: (part.completed ? 'completed' : 'active') as 'active' | 'completed' | 'aborted'
    };
    if (part.duration !== undefined) base.duration = part.duration;
    if (part.startTime !== undefined) base.startTime = part.startTime;
    return base;
  }
  if (part.type === 'tool') {
    const base: StreamingPart & { type: 'tool' } = {
      type: 'tool' as const,
      toolId: part.toolId,
      name: part.name,
      status: part.status as 'running' | 'completed' | 'failed' | 'aborted'
    };
    if (part.args !== undefined) base.args = part.args;
    if (part.result !== undefined) base.result = part.result;
    if (part.error !== undefined) base.error = part.error;
    if (part.duration !== undefined) base.duration = part.duration;
    if (part.startTime !== undefined) base.startTime = part.startTime;
    return base;
  }
  // error
  return {
    type: 'error',
    error: part.error,
    status: 'completed'
  };
}

/**
 * Convert persisted StreamingPart to internal StreamPart format
 *
 * DESIGN DECISION: Recovery strategy
 * ==================================
 *
 * Status mapping (reverse of toPersistentFormat):
 * - text: status ignored (always have content)
 * - reasoning: status 'completed' → completed=true, 'active'/'aborted' → completed=false
 * - tool: maps status directly, 'aborted' → 'failed' (treat aborted as failed for UI)
 * - error: status ignored
 *
 * Why treat 'aborted' as 'failed' for tools?
 * - UI rendering logic already handles 'failed' state
 * - Aborted tools can't be resumed, so treating as failed is appropriate
 * - Simplifies recovery logic
 */
function fromPersistentFormat(part: StreamingPart): StreamPart {
  if (part.type === 'text') {
    return {
      type: 'text',
      content: part.content
    };
  }
  if (part.type === 'reasoning') {
    const base: StreamPart & { type: 'reasoning' } = {
      type: 'reasoning' as const,
      content: part.content,
      completed: part.status === 'completed'
    };
    if (part.duration !== undefined) base.duration = part.duration;
    if (part.startTime !== undefined) base.startTime = part.startTime;
    return base;
  }
  if (part.type === 'tool') {
    const mappedStatus = part.status === 'aborted' ? 'failed' : part.status;
    const base: StreamPart & { type: 'tool' } = {
      type: 'tool' as const,
      toolId: part.toolId,
      name: part.name,
      status: mappedStatus as 'running' | 'completed' | 'failed'
    };
    if (part.args !== undefined) base.args = part.args;
    if (part.result !== undefined) base.result = part.result;
    if (part.error !== undefined) base.error = part.error;
    if (part.duration !== undefined) base.duration = part.duration;
    if (part.startTime !== undefined) base.startTime = part.startTime;
    return base;
  }
  // error
  return {
    type: 'error',
    error: part.error
  };
}

export default function Chat({ commandFromPalette }: ChatProps) {
  const [input, setInput] = useState('');
  const [cursor, setCursor] = useState(0); // Controlled cursor position

  // Normalize cursor to valid range (防禦性：確保 cursor 始終在有效範圍內)
  const normalizedCursor = Math.max(0, Math.min(cursor, input.length));
  // Two-level streaming state:
  // 1. Message streaming: New parts being added to message (can be parallel)
  // 2. Part streaming: Deltas being added to parts (can be multiple active parts)
  const [isStreaming, setIsStreaming] = useState(false); // Message streaming active
  const [streamParts, setStreamParts] = useState<StreamPart[]>([]); // All parts in message order
  const [isTitleStreaming, setIsTitleStreaming] = useState(false);
  const [streamingTitle, setStreamingTitle] = useState('');

  // Abort controller for cancelling AI stream
  const abortControllerRef = useRef<AbortController | null>(null);

  // Ref to track latest parts for error handling
  const streamPartsRef = useRef<StreamPart[]>([]);
  useEffect(() => {
    streamPartsRef.current = streamParts;
  }, [streamParts]);

  // Flag to track if user manually aborted (ESC pressed)
  const wasManuallyAbortedRef = useRef(false);

  // Store last error for onComplete handler
  const lastErrorRef = useRef<string | null>(null);

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
  const setStreamingState = useAppStore((state) => state.setStreamingState);

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
   * Effect: Sync streaming state to session (persistence)
   *
   * DESIGN DECISION: When to persist streaming state?
   * =================================================
   *
   * Persist on every streamParts or isStreaming change:
   * - Ensures session always has latest streaming state
   * - Enables instant recovery on session switch
   * - Database writes are async (optimistic update pattern)
   *
   * Why not debounce?
   * - streamParts changes are already batched (50ms debounce in flushStreamBuffer)
   * - Tool/reasoning updates are infrequent (seconds apart)
   * - Extra writes are cheap (in-memory + async disk)
   * - Guarantees zero data loss on crash/switch
   *
   * Performance: ~10-50 writes per second during active streaming
   * Impact: Negligible (batched text updates, async DB writes)
   */
  useEffect(() => {
    if (!currentSessionId) return;

    // Convert internal format to persistent format
    const persistentParts = streamParts.map(toPersistentFormat);

    // Update session (optimistic in-memory + async to database)
    setStreamingState(currentSessionId, isStreaming, persistentParts);
  }, [currentSessionId, isStreaming, streamParts, setStreamingState]);

  /**
   * Effect: Restore streaming state on session switch
   *
   * DESIGN DECISION: How to handle state restoration?
   * =================================================
   *
   * On session switch (currentSessionId changes):
   * 1. Check if new session has persisted streaming state
   * 2. If yes: restore isStreaming and streamParts from session
   * 3. If no: keep current state (empty)
   *
   * Why restore from session instead of current state?
   * - User may switch between multiple streaming sessions
   * - Each session must maintain independent streaming state
   * - Current state belongs to previous session
   *
   * Edge cases handled:
   * - Session A streaming → switch to B → B has no state → show empty
   * - Session A streaming → switch to B streaming → restore B's state
   * - New session → no streaming state → normal empty state
   *
   * Abort controller handling:
   * - NOT restored (can't resume network request)
   * - User must re-send message to continue
   * - This is intentional: network state is not serializable
   *
   * CRITICAL: Only runs when currentSessionId changes (session switch)
   * - NOT on every sessions array update (would cause infinite loop)
   * - Reads session.streamingParts from the sessions array snapshot
   */
  useEffect(() => {
    if (!currentSessionId) {
      setIsStreaming(false);
      setStreamParts([]);
      return;
    }

    // Find session
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) {
      setIsStreaming(false);
      setStreamParts([]);
      return;
    }

    // Restore streaming state if exists
    if (session.streamingParts && session.streamingParts.length > 0) {
      setIsStreaming(session.isStreaming || false);
      setStreamParts(session.streamingParts.map(fromPersistentFormat));
    } else if (session.isStreaming === false || session.isStreaming === undefined) {
      // Session has no streaming state, clear current state
      setIsStreaming(false);
      setStreamParts([]);
    }
    // Note: We don't clear state if session.isStreaming is true but no parts
    // This handles edge case where streaming just started
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
    setStreamParts([]);
    addLog('Starting message send...');

    // Reset flags for new stream
    wasManuallyAbortedRef.current = false;
    lastErrorRef.current = null;

    // Create abort controller for this stream
    abortControllerRef.current = new AbortController();

    // Helper to flush accumulated chunks
    // This updates the last text part (part-level streaming)
    const flushStreamBuffer = () => {
      const buffer = streamBufferRef.current;
      if (buffer.chunks.length === 0) return;

      const accumulatedText = buffer.chunks.join('');
      buffer.chunks = [];

      setStreamParts((prev) => {
        const newParts = [...prev];
        const lastPart = newParts[newParts.length - 1];

        // Part streaming: Add delta to last text part
        if (lastPart && lastPart.type === 'text') {
          newParts[newParts.length - 1] = {
            type: 'text',
            content: lastPart.content + accumulatedText
          };
        } else {
          // No text part at end, create new one
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
          // Message streaming: New part (tool) being added
          // Can be parallel - multiple tools can be active simultaneously
          setStreamParts((prev) => [
            ...prev,
            { type: 'tool', toolId: toolCallId, name: toolName, status: 'running', args, startTime: Date.now() }
          ]);
        },
        // onToolResult - tool execution completed
        (toolCallId, toolName, result, duration) => {
          // Part streaming: Update tool status to completed
          // Keep in parts array - may not be movable to static yet
          setStreamParts((prev) =>
            prev.map((part) =>
              part.type === 'tool' && part.toolId === toolCallId
                ? { ...part, status: 'completed' as const, duration, result }
                : part
            )
          );
        },
        // onComplete - always check if we need to save content
        async () => {
          // Philosophy: ALL LLM-generated content belongs in conversation history.
          // Check if streamParts content is already saved (by checking last message).
          // If not saved yet, save it now.

          // Get all parts
          const allParts = streamPartsRef.current;
          const hasContent = allParts.length > 0;

          if (hasContent && currentSessionId) {
            // Build content from all parts + buffer
            const bufferedText = streamBufferRef.current.chunks.join('');
            let content = '';
            for (const part of allParts) {
              if (part.type === 'text') {
                content += part.content;
              } else if (part.type === 'tool' && part.result) {
                content += `\n[Tool: ${part.name}]\n`;
              }
            }
            content += bufferedText;

            if (content.trim()) {
              // Check if this content is already saved (check last assistant message)
              const sessions = useAppStore.getState().sessions;
              const session = sessions.find(s => s.id === currentSessionId);
              let alreadySaved = false;

              if (session && session.messages.length > 0) {
                const lastMessage = session.messages[session.messages.length - 1];
                if (lastMessage.role === 'assistant') {
                  // Extract text content from last message
                  const lastContent = lastMessage.content
                    .filter(p => p.type === 'text')
                    .map(p => (p as any).content)
                    .join('');

                  // If content matches (or is prefix), it's already saved
                  alreadySaved = lastContent.includes(content.trim());
                }
              }

              // Save if not already saved
              if (!alreadySaved) {
                // Only add note if actually interrupted
                // Normal completion: useChat already saved, no note needed
                let note = '';
                if (wasManuallyAbortedRef.current) {
                  note = '\n\n[Response cancelled by user]';
                } else if (lastErrorRef.current) {
                  note = `\n\n[Error: ${lastErrorRef.current}]`;
                }
                // No "else" - if neither abort nor error, don't add any note
                addMessage(currentSessionId, 'assistant', content + note);
              }
            }
          }

          // Flush any remaining buffered chunks
          if (streamBufferRef.current.timeout) {
            clearTimeout(streamBufferRef.current.timeout);
            streamBufferRef.current.timeout = null;
          }
          streamBufferRef.current.chunks = [];

          // Reset flags
          wasManuallyAbortedRef.current = false;
          lastErrorRef.current = null;

          // Message streaming ended - all parts saved to message history
          setIsStreaming(false);
          setStreamParts([]); // Clear all parts

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
          // Message streaming: New part (reasoning) being added
          setStreamParts((prev) => [
            ...prev,
            { type: 'reasoning', content: '', startTime: Date.now() }
          ]);
        },
        // onReasoningDelta
        (text) => {
          // Part streaming: Add delta to last reasoning part
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
          // Part streaming: Mark reasoning as completed
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
          // Part streaming: Update tool status to failed
          setStreamParts((prev) =>
            prev.map((part) =>
              part.type === 'tool' && part.toolId === toolCallId
                ? { ...part, status: 'failed' as const, error, duration }
                : part
            )
          );
        },
        // onError
        (error) => {
          // Store error for onComplete handler
          lastErrorRef.current = error;
          setStreamParts((prev) => [
            ...prev,
            { type: 'error', error }
          ]);
        },
        abortControllerRef.current.signal
      );
    } catch (error) {
      addLog(`[sendUserMessageToAI] Error: ${error instanceof Error ? error.message : String(error)}`);

      // Store error for onComplete handler
      lastErrorRef.current = error instanceof Error ? error.message : String(error);

      // Note: onComplete will be called by useChat and will handle saving partial content

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
            {/* Completed messages - using Static to keep them above */}
            {currentSession.messages.length > 0 && (
              <Static items={currentSession.messages}>
                {(msg, i) => (
                  <Box key={`msg-${msg.timestamp}-${i}`} paddingX={1} paddingTop={1} flexDirection="column">
                    {msg.role === 'user' ? (
                      <>
                        <Box>
                          <Text color="#00D9FF">▌ YOU</Text>
                        </Box>
                        {/* Render content parts */}
                        {msg.content && Array.isArray(msg.content) ? (
                          msg.content.map((part, idx) => (
                            <MessagePart key={`msg-${msg.timestamp}-part-${idx}`} part={part} />
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
                        <Box>
                          <Text color="#00FF88">▌ SYLPHX</Text>
                        </Box>
                        {/* Render content parts */}
                        {msg.content && Array.isArray(msg.content) ? (
                          msg.content.map((part, idx) => (
                            <MessagePart key={`msg-${msg.timestamp}-part-${idx}`} part={part} />
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

            {/* Message streaming: Parts being added to message */}
            {isStreaming && (() => {
              // Helper to check if part is completed
              const isPartCompleted = (part: StreamPart): boolean => {
                if (part.type === 'tool') {
                  return part.status === 'completed' || part.status === 'failed';
                }
                if (part.type === 'reasoning') {
                  return part.completed === true;
                }
                // Text and error parts are immediately completed
                return true;
              };

              // Find first non-completed part (this is the boundary)
              const firstIncompleteIndex = streamParts.findIndex(part => !isPartCompleted(part));

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
                  {/* Static parts - continuous completed from start */}
                  {staticParts.length > 0 && (
                    <Static items={staticParts}>
                      {(part, idx) => (
                        <StreamingPartWrapper
                          key={getStreamingPartKey(part, streamParts)}
                          part={part}
                          isFirst={idx === 0}
                        />
                      )}
                    </Static>
                  )}

                  {/* Dynamic parts - first incomplete onwards */}
                  {(dynamicParts.length > 0 || staticParts.length === 0) && (
                    <>
                      {streamParts.length === 0 && (
                        <Box paddingX={1} paddingTop={1} flexDirection="column">
                          <Box>
                            <Text color="#00FF88">▌ SYLPHX</Text>
                          </Box>
                          <Box marginLeft={2}>
                            <Text dimColor>...</Text>
                          </Box>
                        </Box>
                      )}

                      {dynamicParts.map((part, idx) => {
                        const isFirstDynamic = idx === 0 && staticParts.length === 0;
                        const isLastPart = idx === dynamicParts.length - 1;

                        return (
                          <StreamingPartWrapper
                            key={getStreamingPartKey(part, streamParts)}
                            part={part}
                            isFirst={isFirstDynamic}
                            isLastInStream={isLastPart && part.type === 'text'}
                          />
                        );
                      })}
                    </>
                  )}
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
              {streamParts.length === 0 ? (
                <Text color="#FFD700"> Thinking...</Text>
              ) : streamParts.some(p => p.type === 'tool' && p.status === 'running') ? (
                <Text color="#FFD700"> Working...</Text>
              ) : streamParts.some(p => p.type === 'reasoning') ? (
                <Text color="#FFD700"> Thinking...</Text>
              ) : (
                <Text color="#FFD700"> Typing...</Text>
              )}
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

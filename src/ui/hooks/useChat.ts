/**
 * Chat Hook
 * Handle AI chat with streaming support and tool execution
 */

import { useAppStore } from '../stores/app-store.js';
import { getProvider } from '../../providers/index.js';
import {
  createAIStream,
  getSystemStatus,
  buildSystemStatusFromMetadata,
  injectSystemStatusToOutput,
  buildTodoContext,
  type SystemStatus,
} from '../../core/ai-sdk.js';
import { processStream } from '../../core/stream-handler.js';
import {
  setUserInputHandler,
  clearUserInputHandler,
  type UserInputRequest
} from '../../tools/interaction.js';
import type { ModelMessage } from 'ai';
import { sendNotification } from '../../utils/notifications.js';
import { generateSessionTitle, generateSessionTitleWithStreaming } from '../../utils/session-title.js';

// Optimized LRU cache for file attachments with mtime validation
// Prevents re-reading same files from disk multiple times
// Validates cache entries against file modification time to prevent stale data
// Uses proper LRU with O(1) eviction instead of O(n log n) sorting
class FileContentCache {
  private cache = new Map<string, { content: string; size: number; mtime: number }>();
  private accessOrder = new Set<string>(); // Track LRU order
  private maxSize = 50 * 1024 * 1024; // 50MB total cache size
  private currentSize = 0;

  async get(path: string): Promise<string | null> {
    const entry = this.cache.get(path);
    if (!entry) {
      return null;
    }

    // Validate cache: check if file was modified since cached
    try {
      const { stat } = await import('node:fs/promises');
      const stats = await stat(path);
      const currentMtime = stats.mtimeMs;

      if (currentMtime !== entry.mtime) {
        // File was modified, invalidate cache entry
        this.cache.delete(path);
        this.accessOrder.delete(path);
        this.currentSize -= entry.size;
        return null;
      }

      // Cache valid, update access order for LRU (O(1) operation)
      this.accessOrder.delete(path); // Remove from current position
      this.accessOrder.add(path); // Add to end (most recently used)
      return entry.content;
    } catch {
      // File doesn't exist or can't be read, invalidate cache
      this.cache.delete(path);
      this.accessOrder.delete(path);
      this.currentSize -= entry.size;
      return null;
    }
  }

  async set(path: string, content: string): Promise<void> {
    const size = content.length;

    // Don't cache files larger than 10MB
    if (size > 10 * 1024 * 1024) {
      return;
    }

    // Get file mtime for validation
    let mtime: number;
    try {
      const { stat } = await import('node:fs/promises');
      const stats = await stat(path);
      mtime = stats.mtimeMs;
    } catch {
      // Can't get mtime, don't cache
      return;
    }

    // Evict oldest entries if cache is full (O(1) operation)
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      // Get first item from accessOrder (least recently used)
      const oldestKey = this.accessOrder.values().next().value;
      
      if (oldestKey) {
        const removed = this.cache.get(oldestKey);
        if (removed) {
          this.currentSize -= removed.size;
        }
        this.cache.delete(oldestKey);
        this.accessOrder.delete(oldestKey);
      } else {
        break;
      }
    }

    this.cache.set(path, { content, size, mtime });
    this.accessOrder.add(path); // Add to end (most recently used)
    this.currentSize += size;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.currentSize = 0;
  }
}

const fileContentCache = new FileContentCache();

export function useChat() {
  const aiConfig = useAppStore((state) => state.aiConfig);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  // Optimized: select only current session instead of entire sessions array
  // This prevents re-renders when other sessions change
  const currentSession = useAppStore((state) =>
    state.sessions.find((s) => s.id === state.currentSessionId)
  );
  const addMessage = useAppStore((state) => state.addMessage);
  const setError = useAppStore((state) => state.setError);
  const addDebugLog = useAppStore((state) => state.addDebugLog);
  const notificationSettings = useAppStore((state) => state.notificationSettings);

  /**
   * Send message and stream response
   * @param abortSignal - Optional abort signal to cancel the stream
   */
  interface SendMessageOptions {
    // Data
    attachments?: FileAttachment[];
    abortSignal?: AbortSignal;

    // Lifecycle callbacks (required/optional)
    onChunk: (chunk: string) => void;
    onComplete?: () => void;
    onError?: (error: string) => void;

    // Tool streaming callbacks
    onToolCall?: (toolCallId: string, toolName: string, args: unknown) => void;
    onToolResult?: (toolCallId: string, toolName: string, result: unknown, duration: number) => void;
    onToolInputStart?: (toolCallId: string, toolName: string) => void;
    onToolInputDelta?: (toolCallId: string, toolName: string, argsTextDelta: string) => void;
    onToolInputEnd?: (toolCallId: string, toolName: string, args: unknown) => void;
    onToolError?: (toolCallId: string, toolName: string, error: string, duration: number) => void;

    // Reasoning streaming callbacks
    onReasoningStart?: () => void;
    onReasoningDelta?: (text: string) => void;
    onReasoningEnd?: (duration: number) => void;

    // Text streaming callbacks
    onTextEnd?: () => void;

    // User interaction
    onUserInputRequest?: (request: UserInputRequest) => Promise<string>;
  }

  const sendMessage = async (
    message: string,
    options: SendMessageOptions
  ) => {
    // Destructure options for easier access
    const {
      attachments,
      abortSignal,
      onChunk,
      onComplete,
      onError,
      onToolCall,
      onToolResult,
      onToolInputStart,
      onToolInputDelta,
      onToolInputEnd,
      onToolError,
      onReasoningStart,
      onReasoningDelta,
      onReasoningEnd,
      onTextEnd,
      onUserInputRequest,
    } = options;
    if (!currentSession || !currentSessionId) {
      // Don't use setError - this should never happen in normal flow
      console.error('[useChat] No active session');
      return;
    }

    const provider = currentSession.provider;
    const modelName = currentSession.model;
    const providerConfig = aiConfig?.providers?.[provider];

    // Handle configuration errors as assistant messages
    if (!providerConfig) {
      addMessage(currentSessionId, 'assistant', [
        { type: 'text', content: '[ERROR] Provider not configured\n\nPlease configure your provider using the /provider command.' }
      ]);
      onComplete?.();
      return;
    }

    // Check if provider is properly configured using provider's own logic
    const providerInstance = getProvider(provider);
    if (!providerInstance.isConfigured(providerConfig)) {
      addMessage(currentSessionId, 'assistant', [
        { type: 'text', content: `[ERROR] ${providerInstance.name} is not properly configured\n\nPlease check your settings with the /provider command.` }
      ]);
      onComplete?.();
      return;
    }

    try {
      // Set up user input handler for AI tools
      if (onUserInputRequest) {
        setUserInputHandler(onUserInputRequest);
      }

      // ⚠️ CRITICAL: Capture context ONCE at message creation time
      // This data is stored and NEVER changes (important for prompt cache)
      const systemStatus = getSystemStatus();

      // Capture full todo state snapshot at message creation time
      // Store Todo[] (structured data) for rewind capability
      const currentSession = useAppStore.getState().sessions.find((s) => s.id === currentSessionId);
      const todoSnapshot = currentSession?.todos ? [...currentSession.todos] : [];

      // Add user message to session
      // Design decisions:
      // - content: What user actually typed (shown in UI)
      // - metadata: System resource context (cpu, memory) - for LLM, not UI
      // - todoSnapshot: Full todo state - enables rewind, sent to LLM as context
      addMessage(
        currentSessionId,
        'user',
        [{ type: 'text', content: message }],
        attachments,
        undefined, // usage (only for assistant messages)
        undefined, // finishReason (only for assistant messages)
        {
          cpu: systemStatus.cpu,
          memory: systemStatus.memory,
        },
        todoSnapshot // Full todo state snapshot
      );

      // Get updated session (after addMessage)
      // ⚠️ IMPORTANT: Must get fresh state from store, not use hook's sessions variable
      // The sessions variable is stale - it was captured at hook render time
      const freshSessions = useAppStore.getState().sessions;
      const updatedSession = freshSessions.find((s) => s.id === currentSessionId);
      if (!updatedSession) {
        console.error('[useChat] Session not found after addMessage');
        return;
      }

      // Generate title for first message if enabled
      if (updatedSession.messages.length === 1 && !updatedSession.title) {
        const updateSessionTitle = useAppStore.getState().updateSessionTitle;
        const autoGenerateTitle = notificationSettings.autoGenerateTitle;

        if (autoGenerateTitle) {
          // Generate title with LLM streaming
          let accumulatedTitle = '';
          generateSessionTitleWithStreaming(
            message,
            provider,
            modelName,
            providerConfig,
            (chunk) => {
              // Accumulate chunks and update title in real-time
              accumulatedTitle += chunk;
              updateSessionTitle(currentSessionId, accumulatedTitle);
            }
          ).then((finalTitle) => {
            // Update with final cleaned title
            updateSessionTitle(currentSessionId, finalTitle);
          }).catch(() => {
            // Fallback to simple title on error
            const simpleTitle = generateSessionTitle(message);
            updateSessionTitle(currentSessionId, simpleTitle);
          });
        } else {
          // Simple title generation (truncate first message)
          const simpleTitle = generateSessionTitle(message);
          updateSessionTitle(currentSessionId, simpleTitle);
        }
      }

      // Build ModelMessage[] from SessionMessage[] for LLM
      //
      // ⚠️ CRITICAL: This is where SessionMessage (UI) transforms to ModelMessage (LLM)
      //
      // Key transformation:
      // 1. System status: Built from STORED metadata, NOT current values (prompt cache!)
      // 2. File attachments: Read fresh from disk (files can change between requests)
      // 3. Content: Extract text from MessagePart[] format
      //
      // Why use stored metadata?
      // - Historical messages must be IMMUTABLE for prompt cache
      // - buildSystemStatusFromMetadata uses msg.metadata (captured at creation)
      // - NEVER use getSystemStatus() here (would use current values → cache miss)
      //
      const messages: ModelMessage[] = await Promise.all(
        updatedSession.messages.map(async (msg) => {
          // User messages: inject system status from metadata + extract text + add file attachments
          if (msg.role === 'user') {
            const contentParts: any[] = [];

            // 1. Inject context from STORED data (not current values!)
            //    ⚠️ Using stored data preserves prompt cache - messages stay immutable

            // System status from metadata
            if (msg.metadata) {
              const systemStatusString = buildSystemStatusFromMetadata({
                timestamp: new Date(msg.timestamp).toISOString(),
                cpu: msg.metadata.cpu || 'N/A',
                memory: msg.metadata.memory || 'N/A',
              });
              contentParts.push({
                type: 'text',
                text: systemStatusString,
              });
            }

            // Todo context from todoSnapshot (full structured state)
            // Build context string from snapshot, not current todos
            if (msg.todoSnapshot && msg.todoSnapshot.length > 0) {
              const todoContext = buildTodoContext(msg.todoSnapshot);
              contentParts.push({
                type: 'text',
                text: todoContext,
              });
            }

            // 2. Extract text parts from content (user message)
            const textParts = msg.content.filter((part) => part.type === 'text');
            for (const part of textParts) {
              contentParts.push({
                type: 'text',
                text: (part as any).content,
              });
            }

            // 3. Add file attachments as file parts (use cache with mtime validation)
            if (msg.attachments && msg.attachments.length > 0) {
              try {
                const attachmentStartTime = Date.now();
                const { readFile } = await import('node:fs/promises');
                const fileContents = await Promise.all(
                  msg.attachments.map(async (att) => {
                    try {
                      // Check cache first (validates mtime)
                      let content = await fileContentCache.get(att.path);
                      if (content === null) {
                        // Not in cache or stale, read from disk
                        content = await readFile(att.path, 'utf8');
                        // Add to cache for future use
                        await fileContentCache.set(att.path, content);
                      }
                      return {
                        type: 'text',
                        text: `\n\n<file path="${att.relativePath}">\n${content}\n</file>`,
                      };
                    } catch {
                      return {
                        type: 'text',
                        text: `\n\n<file path="${att.relativePath}">\n[Error reading file]\n</file>`,
                      };
                    }
                  })
                );
                const attachmentDuration = Date.now() - attachmentStartTime;
                addDebugLog(`[useChat] attachments processed: ${msg.attachments.length} files, ${attachmentDuration}ms`);
                contentParts.push(...fileContents);
              } catch (error) {
                console.error('Failed to read attachments:', error);
              }
            }

            return {
              role: 'user' as const,
              content: contentParts,
            };
          }

          // Assistant messages: convert parts to AI SDK format
          const textParts = msg.content
            .filter((part) => part.type === 'text')
            .map((part: any) => part.content)
            .join('\n');

          return {
            role: msg.role as 'assistant',
            content: textParts,
          };
        })
      );

      // Get model using provider registry with full config
      const model = providerInstance.createClient(providerConfig, modelName);

      // Create AI stream with context injection callbacks
      //
      // Why we use callbacks instead of hardcoded injection:
      // - Keeps createAIStream reusable (can be used for title generation, etc.)
      // - Allows different contexts for different use cases
      // - Separates concerns: ai-sdk.ts handles streaming, useChat handles context
      //
      // Note: Todo context is now stored in metadata (like system status)
      // It's injected when building ModelMessage, not here in onPrepareMessages
      // This ensures prompt cache effectiveness (historical messages immutable)
      //
      const stream = createAIStream({
        model,
        messages,
        abortSignal, // Pass abort signal for cancellation

        // onTransformToolResult: Inject system status into tool outputs
        //
        // Called after each tool execution, before saving result to history.
        // Allows LLM to see system state after tool execution.
        //
        // ⚠️ Note: Uses CURRENT system status (getSystemStatus), not stored metadata
        // This is OK because tool results are part of the current step, not historical.
        //
        onTransformToolResult: (output: LanguageModelV2ToolResultOutput, toolName: string) => {
          const systemStatus = getSystemStatus();
          return injectSystemStatusToOutput(output, systemStatus);
        },
      });

      // Process stream with unified handler
      const { fullResponse, messageParts, usage, finishReason } = await processStream(stream, {
        onTextStart: () => {
          addDebugLog(`[useChat] text-start`);
          // Text generation started - could show typing indicator
        },
        onTextDelta: (text) => {
          addDebugLog(`[useChat] text-delta: ${text.substring(0, 50)}`);
          onChunk(text);
        },
        onTextEnd: () => {
          addDebugLog(`[useChat] text-end`);
          onTextEnd?.();
        },
        onReasoningStart: () => {
          addDebugLog(`[useChat] reasoning-start`);
          onReasoningStart?.();
        },
        onReasoningDelta: (text) => {
          addDebugLog(`[useChat] reasoning-delta: ${text.substring(0, 50)}`);
          onReasoningDelta?.(text);
        },
        onReasoningEnd: (duration) => {
          addDebugLog(`[useChat] reasoning-end: ${duration}ms`);
          onReasoningEnd?.(duration);
        },
        onToolCall: (toolCallId, toolName, args) => {
          addDebugLog(`[useChat] tool-call: ${toolName} (${toolCallId})`);
          onToolCall?.(toolCallId, toolName, args);
        },
        onToolInputStart: (toolCallId, toolName) => {
          addDebugLog(`[useChat] tool-input-start: ${toolName} (${toolCallId})`);
          onToolInputStart?.(toolCallId, toolName);
        },
        onToolInputDelta: (toolCallId, toolName, argsTextDelta) => {
          addDebugLog(`[useChat] tool-input-delta: ${toolName} (${toolCallId}) +${argsTextDelta.length} chars`);
          onToolInputDelta?.(toolCallId, toolName, argsTextDelta);
        },
        onToolInputEnd: (toolCallId, toolName, args) => {
          addDebugLog(`[useChat] tool-input-end: ${toolName} (${toolCallId})`);
          onToolInputEnd?.(toolCallId, toolName, args);
        },
        onToolResult: (toolCallId, toolName, result, duration) => {
          addDebugLog(`[useChat] tool-result: ${toolName} (${toolCallId}, ${duration}ms)`);
          onToolResult?.(toolCallId, toolName, result, duration);
        },
        onToolError: (toolCallId, toolName, error, duration) => {
          addDebugLog(`[useChat] tool-error: ${toolName} (${toolCallId}, ${duration}ms) - ${error}`);
          onToolError?.(toolCallId, toolName, error, duration);
        },
        onError: (error) => {
          addDebugLog(`[useChat] error: ${error}`);
          onError?.(error);
        },
      });

      addDebugLog('[useChat] stream complete');

      // Add assistant message to session with parts and usage
      addMessage(currentSessionId, 'assistant', messageParts, undefined, usage, finishReason);

      // Then trigger UI update and send notification
      onComplete?.();
      
      // Send notification when AI response is complete
      const responsePreview = fullResponse.length > 100 
        ? fullResponse.substring(0, 97) + '...' 
        : fullResponse;
      
      sendNotification(
        'AI Response Complete',
        responsePreview,
        {
          osNotification: notificationSettings.osNotifications,
          terminalNotification: notificationSettings.terminalNotifications,
          sound: notificationSettings.sound
        }
      );
    } catch (error) {
      addDebugLog('[useChat] ERROR CAUGHT!');
      addDebugLog(`[useChat] Error: ${error instanceof Error ? error.message : String(error)}`);

      // Don't add error message here - let Chat.tsx handle it
      // Chat.tsx has access to streamParts and will save partial content
      // with appropriate error note

      // Just trigger completion to cleanup UI state
      onComplete?.();
      addDebugLog('[useChat] onComplete called');
    } finally {
      // Clean up user input handler
      clearUserInputHandler();
    }
  };

  return {
    sendMessage,
    currentSession,
  };
}

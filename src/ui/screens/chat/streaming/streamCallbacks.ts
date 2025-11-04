/**
 * Stream Callbacks Factory
 * Creates all streaming callbacks for AI message processing
 *
 * Extracted from Chat.tsx to separate streaming logic from UI concerns
 *
 * @example
 * ```typescript
 * // In sendUserMessageToAI function:
 * const callbacks = createStreamCallbacks({
 *   updateActiveMessageContent,
 *   flushDatabaseWrite,
 *   getSessionRepository,
 *   wasAbortedRef,
 *   lastErrorRef,
 *   usageRef,
 *   finishReasonRef,
 *   streamingMessageIdRef,
 *   setIsStreaming,
 *   setPendingInput,
 *   setMultiSelectionPage,
 *   setMultiSelectionAnswers,
 *   setMultiSelectChoices,
 *   currentSessionId,
 *   inputResolver,
 *   ensureAssistantMessage,
 * });
 *
 * // Use with sendMessage:
 * await sendMessage(userMessage, {
 *   attachments,
 *   abortSignal: abortControllerRef.current.signal,
 *   ...callbacks,
 * });
 * ```
 */

import type { MessagePart, TokenUsage } from '../../../../types/session.types.js';
import type { UserInputRequest } from '../../../../tools/interaction.js';
import type { StreamCallbacks } from '../../../../core/stream-handler.js';
import { useAppStore } from '../../../stores/app-store.js';
import { getSessionRepository } from '../../../../db/database.js';

/**
 * Extended StreamCallbacks with onUserInputRequest
 * This is used by useChat's sendMessage function
 */
export interface ExtendedStreamCallbacks extends StreamCallbacks {
  onUserInputRequest?: (request: UserInputRequest) => Promise<string | Record<string, string | string[]>>;
}

/**
 * Parameters needed by streaming callbacks
 */
export interface StreamCallbackParams {
  // Functions
  updateActiveMessageContent: (updater: (prev: MessagePart[]) => MessagePart[]) => void;
  flushDatabaseWrite: () => Promise<void>;
  getSessionRepository: typeof getSessionRepository;

  // Refs
  wasAbortedRef: React.MutableRefObject<boolean>;
  lastErrorRef: React.MutableRefObject<string | null>;
  usageRef: React.MutableRefObject<TokenUsage | null>;
  finishReasonRef: React.MutableRefObject<string | null>;
  streamingMessageIdRef: React.MutableRefObject<string | null>;

  // State setters
  setIsStreaming: (value: boolean) => void;
  setPendingInput: (value: any) => void;
  setMultiSelectionPage: (value: number) => void;
  setMultiSelectionAnswers: (value: Record<string, string | string[]>) => void;
  setMultiSelectChoices: (value: Set<string>) => void;

  // Session info
  currentSessionId: string | null;

  // Input resolver ref
  inputResolver: React.MutableRefObject<((value: string | Record<string, string | string[]>) => void) | null>;

  // Assistant message creation helper
  ensureAssistantMessage: () => Promise<void>;
}

/**
 * Factory function to create all streaming callbacks
 *
 * Returns ExtendedStreamCallbacks object with all handlers configured
 * Extracted from sendUserMessageToAI in Chat.tsx (lines 788-1204)
 */
export function createStreamCallbacks(params: StreamCallbackParams): ExtendedStreamCallbacks {
  const {
    updateActiveMessageContent,
    flushDatabaseWrite,
    getSessionRepository,
    wasAbortedRef,
    lastErrorRef,
    usageRef,
    finishReasonRef,
    streamingMessageIdRef,
    setIsStreaming,
    setPendingInput,
    setMultiSelectionPage,
    setMultiSelectionAnswers,
    setMultiSelectChoices,
    currentSessionId,
    inputResolver,
    ensureAssistantMessage,
  } = params;

  return {
    // onTextStart - text generation started, create text part
    onTextStart: async () => {
      // Create assistant message on first streaming event
      await ensureAssistantMessage();

      // Message streaming: New part (text) being added
      updateActiveMessageContent((prev) => [
        ...prev,
        { type: 'text', content: '', status: 'active' } as MessagePart
      ]);
    },

    // onTextDelta - text streaming
    onTextDelta: async (text) => {
      // Part streaming: Add delta to last text part
      updateActiveMessageContent((prev) => {
        const newParts = [...prev];
        const lastPart = newParts[newParts.length - 1];

        if (lastPart && lastPart.type === 'text' && lastPart.status === 'active') {
          // Append to existing active text part
          newParts[newParts.length - 1] = {
            type: 'text',
            content: lastPart.content + text,
            status: 'active' as const
          };
        } else {
          // This shouldn't happen if onTextStart was called first
          console.warn('[onTextDelta] No active text part found, creating new one');
          newParts.push({
            type: 'text',
            content: text,
            status: 'active' as const
          });
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
          if (textPart && textPart.type === 'text') {
            newParts[lastTextIndex] = {
              ...textPart,
              status: 'completed'
            } as MessagePart;
          }
        }

        return newParts;
      });
    },

    // onToolCall - tool execution started
    onToolCall: async (toolCallId, toolName, args) => {
      // Create assistant message on first streaming event
      await ensureAssistantMessage();

      // Message streaming: New part (tool) being added
      // Can be parallel - multiple tools can be active simultaneously
      updateActiveMessageContent((prev) => [
        ...prev,
        { type: 'tool', toolId: toolCallId, name: toolName, status: 'active', args, startTime: Date.now() } as MessagePart
      ]);
    },

    // onToolResult - tool execution completed
    onToolResult: (toolCallId, _toolName, result, duration) => {
      // Part streaming: Update tool status to completed
      updateActiveMessageContent((prev) =>
        prev.map((part) =>
          part.type === 'tool' && part.toolId === toolCallId
            ? { ...part, status: 'completed' as const, duration, result }
            : part
        )
      );
    },

    // onToolError
    onToolError: (toolCallId, _toolName, error, duration) => {
      // Part streaming: Update tool status to error
      updateActiveMessageContent((prev) =>
        prev.map((part) =>
          part.type === 'tool' && part.toolId === toolCallId
            ? { ...part, status: 'error' as const, error, duration }
            : part
        )
      );
    },

    // onToolInputStart - tool input streaming started
    onToolInputStart: (_toolCallId, _toolName) => {
      // Tool input streaming started - args will be streamed in deltas
      // No UI update needed
    },

    // onToolInputDelta - tool input streaming delta
    onToolInputDelta: (toolCallId, _toolName, argsTextDelta) => {
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
    onToolInputEnd: (toolCallId, _toolName, args) => {
      // Part streaming: Finalize tool args
      updateActiveMessageContent((prev) =>
        prev.map((part) =>
          part.type === 'tool' && part.toolId === toolCallId
            ? { ...part, args }
            : part
        )
      );
    },

    // onReasoningStart
    onReasoningStart: async () => {
      // Create assistant message on first streaming event
      await ensureAssistantMessage();

      // Message streaming: New part (reasoning) being added
      updateActiveMessageContent((prev) => [
        ...prev,
        { type: 'reasoning', content: '', status: 'active', startTime: Date.now() } as MessagePart
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
          if (reasoningPart && reasoningPart.type === 'reasoning') {
            newParts[lastReasoningIndex] = {
              ...reasoningPart,
              status: 'completed',
              duration
            } as MessagePart;
          }
        }

        return newParts;
      });
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

        const wasAborted = wasAbortedRef.current;
        const hasError = lastErrorRef.current;

        // Flush pending database writes immediately
        // This ensures final message content is persisted before status update
        await flushDatabaseWrite();

        // Update message status in database
        // Note: finishReason is already saved by onFinish, don't pass it here
        const finalStatus = wasAborted ? 'abort' : hasError ? 'error' : 'completed';
        if (streamingMessageIdRef.current) {
          try {
            const repo = await getSessionRepository();

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
        wasAbortedRef.current = false;
        lastErrorRef.current = null;
        streamingMessageIdRef.current = null;
        usageRef.current = null;
        finishReasonRef.current = null;

        // Message streaming ended - all parts saved to message history
        setIsStreaming(false);
      }
    },

    // onUserInputRequest - handle AI tool ask requests
    onUserInputRequest: async (request: UserInputRequest) => {
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

    // onAbort - stream was aborted by user
    onAbort: async () => {
      // Create assistant message on first streaming event
      await ensureAssistantMessage();

      // Mark as aborted for onComplete handler
      wasAbortedRef.current = true;
    },

    // onError
    onError: async (error) => {
      // Create assistant message on first streaming event (even if it's an error)
      await ensureAssistantMessage();

      // Store error for onComplete handler
      lastErrorRef.current = error;
      updateActiveMessageContent((prev) => [
        ...prev,
        { type: 'error', error, status: 'completed' } as MessagePart
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
          const repo = await getSessionRepository();

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
  };
}

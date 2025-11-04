/**
 * Message Streaming Module
 * Factory function for creating the sendUserMessageToAI callback
 *
 * Extracted from Chat.tsx (lines 720-1216) to separate message streaming logic
 * from UI concerns.
 *
 * @example
 * ```typescript
 * const sendUserMessageToAI = createSendUserMessageToAI({
 *   aiConfig,
 *   currentSessionId,
 *   sendMessage,
 *   addMessage,
 *   addLog,
 *   updateSessionTitle,
 *   flushDatabaseWrite,
 *   abortControllerRef,
 *   wasAbortedRef,
 *   lastErrorRef,
 *   usageRef,
 *   finishReasonRef,
 *   streamingMessageIdRef,
 *   setIsStreaming,
 *   setIsTitleStreaming,
 *   setStreamingTitle,
 *   updateActiveMessageContent,
 *   createStreamCallbacks,
 * });
 *
 * // Use in handleSubmit:
 * await sendUserMessageToAI(userMessage, attachments);
 * ```
 */

import type React from 'react';
import type { AIConfig } from '../../../../config/ai-config.js';
import type { FileAttachment, TokenUsage } from '../../../../types/session.types.js';
import { getSessionRepository } from '../../../../db/database.js';
import { useAppStore } from '../../../stores/app-store.js';
import { createStreamCallbacks, type StreamCallbackParams, type ExtendedStreamCallbacks } from './streamCallbacks.js';

/**
 * Parameters required to create sendUserMessageToAI callback
 */
export interface MessageStreamingParams {
  // Configuration
  aiConfig: AIConfig | null;
  currentSessionId: string | null;

  // Functions from hooks/store
  sendMessage: (
    message: string,
    options: {
      attachments?: FileAttachment[];
      abortSignal?: AbortSignal;
    } & ExtendedStreamCallbacks
  ) => Promise<void>;
  addMessage: (sessionId: string, role: 'user' | 'assistant', content: string, attachments?: FileAttachment[]) => void;
  addLog: (message: string) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  flushDatabaseWrite: () => Promise<void>;

  // Refs for streaming state
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  wasAbortedRef: React.MutableRefObject<boolean>;
  lastErrorRef: React.MutableRefObject<string | null>;
  usageRef: React.MutableRefObject<TokenUsage | null>;
  finishReasonRef: React.MutableRefObject<string | null>;
  streamingMessageIdRef: React.MutableRefObject<string | null>;

  // State setters
  setIsStreaming: (value: boolean) => void;
  setIsTitleStreaming: (value: boolean) => void;
  setStreamingTitle: React.Dispatch<React.SetStateAction<string>>;

  // Content update function
  updateActiveMessageContent: (updater: (prev: import('../../../../types/session.types.js').MessagePart[]) => import('../../../../types/session.types.js').MessagePart[]) => void;
}

/**
 * Creates the sendUserMessageToAI callback function
 *
 * This function handles:
 * 1. Checking if AI provider is configured
 * 2. Setting streaming state
 * 3. Resetting flags for new stream
 * 4. Creating abort controller
 * 5. Creating assistant message on first event
 * 6. Calling sendMessage with callbacks from createStreamCallbacks
 * 7. Handling errors
 * 8. Generating session title after completion
 *
 * Extracted from Chat.tsx lines 721-1216
 */
export function createSendUserMessageToAI(params: MessageStreamingParams) {
  const {
    aiConfig,
    currentSessionId,
    sendMessage,
    addMessage,
    addLog,
    updateSessionTitle,
    flushDatabaseWrite,
    abortControllerRef,
    wasAbortedRef,
    lastErrorRef,
    usageRef,
    finishReasonRef,
    streamingMessageIdRef,
    setIsStreaming,
    setIsTitleStreaming,
    setStreamingTitle,
    updateActiveMessageContent,
  } = params;

  return async (userMessage: string, attachments?: FileAttachment[]) => {
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
    wasAbortedRef.current = false;
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

    // Create streaming callbacks using factory
    const baseCallbacks = createStreamCallbacks({
      updateActiveMessageContent,
      flushDatabaseWrite,
      getSessionRepository,
      wasAbortedRef,
      lastErrorRef,
      usageRef,
      finishReasonRef,
      streamingMessageIdRef,
      setIsStreaming,
      setPendingInput: () => {}, // Not used in this context
      setMultiSelectionPage: () => {}, // Not used in this context
      setMultiSelectionAnswers: () => {}, // Not used in this context
      setMultiSelectChoices: () => {}, // Not used in this context
      currentSessionId,
      inputResolver: { current: null }, // Not used in this context
      ensureAssistantMessage,
    });

    // Wrap onComplete to add title generation logic
    const originalOnComplete = baseCallbacks.onComplete;
    const callbacks: ExtendedStreamCallbacks = {
      ...baseCallbacks,
      onComplete: async () => {
        // Call original onComplete first (handles message status, cleanup, etc.)
        await originalOnComplete?.();

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
              const { generateSessionTitleWithStreaming } = await import('../../../../utils/session-title.js');
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
                  const { generateSessionTitle } = await import('../../../../utils/session-title.js');
                  const title = generateSessionTitle(userMessage);
                  updateSessionTitle(currentSessionId, title);
                }
              }
            }
          }
        }
      },
    };

    try {
      await sendMessage(userMessage, {
        ...callbacks,
        ...(attachments ? { attachments } : {}),
        abortSignal: abortControllerRef.current.signal,
      });
    } catch (error) {
      addLog(`[sendUserMessageToAI] Error: ${error instanceof Error ? error.message : String(error)}`);

      // Store error for onComplete handler
      lastErrorRef.current = error instanceof Error ? error.message : String(error);

      // Note: onComplete will be called by useChat and will handle saving partial content

      setIsStreaming(false);
    }
  };
}

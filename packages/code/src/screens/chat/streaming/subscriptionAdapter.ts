/**
 * Subscription Adapter for tRPC Streaming
 * Converts tRPC subscription events to UI updates
 *
 * This adapter bridges the new tRPC subscription architecture with the existing UI.
 * It maintains the same interface as the old sendUserMessageToAI function but uses
 * the new unified subscription backend.
 *
 * Architecture:
 * - TUI: Uses in-process subscription link (zero overhead)
 * - Web: Will use httpSubscriptionLink (SSE over network)
 * - Same interface for both!
 */

import { getTRPCClient, useAppStore } from '@sylphx/code-client';
import type React from 'react';
import type { AIConfig } from '../../../../config/ai-config.js';
import type { StreamEvent } from '../../../../server/trpc/routers/message.router.js';
import type { FileAttachment, MessagePart, TokenUsage } from '../../../../types/session.types.js';

/**
 * Parameters for subscription adapter
 */
export interface SubscriptionAdapterParams {
  // Configuration
  aiConfig: AIConfig | null;
  currentSessionId: string | null;

  // Functions from hooks/store
  addMessage: (
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    attachments?: FileAttachment[]
  ) => void;
  addLog: (message: string) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  notificationSettings: { notifyOnCompletion: boolean; notifyOnError: boolean };

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
}

/**
 * Helper to update active message content in Zustand store
 */
function updateActiveMessageContent(
  currentSessionId: string | null,
  updater: (prev: MessagePart[]) => MessagePart[]
) {
  useAppStore.setState((state) => {
    const session = state.currentSession;
    if (!session || session.id !== currentSessionId) return;

    const activeMessage = session.messages.find((m) => m.status === 'active');
    if (!activeMessage) return;

    activeMessage.content = updater(activeMessage.content);
  });
}

/**
 * Creates sendUserMessageToAI function using tRPC subscription
 *
 * Maintains same interface as old implementation but uses new subscription backend.
 */
export function createSubscriptionSendUserMessageToAI(params: SubscriptionAdapterParams) {
  const {
    aiConfig,
    currentSessionId,
    addMessage,
    addLog,
    updateSessionTitle,
    notificationSettings,
    abortControllerRef,
    wasAbortedRef,
    lastErrorRef,
    usageRef,
    finishReasonRef,
    streamingMessageIdRef,
    setIsStreaming,
    setIsTitleStreaming,
    setStreamingTitle,
  } = params;

  return async (userMessage: string, attachments?: FileAttachment[]) => {
    // Block if no provider configured
    if (!aiConfig?.defaultProvider || !aiConfig?.defaultModel) {
      if (currentSessionId) {
        addMessage(currentSessionId, 'user', userMessage, attachments);
        addMessage(
          currentSessionId,
          'assistant',
          'No AI provider configured. Use /provider to configure a provider first.'
        );
      }
      return;
    }

    if (!currentSessionId) {
      addLog('[subscriptionAdapter] No current session');
      return;
    }

    // Add user message to Zustand store immediately (optimistic update)
    // Backend will persist it to database with system status and todo snapshot
    const { getSystemStatus } = await import('@sylphx/code-core');
    const systemStatus = getSystemStatus();
    const currentSession = useAppStore.getState().currentSession;
    const todoSnapshot = currentSession?.todos ? [...currentSession.todos] : [];

    addMessage(
      currentSessionId,
      'user',
      userMessage,
      attachments,
      undefined, // usage (only for assistant messages)
      undefined, // finishReason (only for assistant messages)
      {
        cpu: systemStatus.cpu,
        memory: systemStatus.memory,
      },
      todoSnapshot
    );

    setIsStreaming(true);

    // Reset flags for new stream
    wasAbortedRef.current = false;
    lastErrorRef.current = null;
    usageRef.current = null;
    finishReasonRef.current = null;
    streamingMessageIdRef.current = null;

    // Create abort controller for this stream
    abortControllerRef.current = new AbortController();

    try {
      // Get tRPC caller (in-process client)
      const caller = await getTRPCClient();

      // Call subscription procedure (returns Observable)
      const observable = await caller.message.streamResponse({
        sessionId: currentSessionId,
        userMessage,
        attachments,
      });

      // Subscribe to observable
      const subscription = observable.subscribe({
        next: (event: StreamEvent) => {
          handleStreamEvent(event, {
            currentSessionId,
            updateSessionTitle,
            setIsTitleStreaming,
            setStreamingTitle,
            streamingMessageIdRef,
            usageRef,
            finishReasonRef,
            lastErrorRef,
            addLog,
            aiConfig,
            userMessage,
            notificationSettings,
          });
        },
        error: (error: any) => {
          addLog(`[Subscription] Error: ${error.message || String(error)}`);
          lastErrorRef.current = error.message || String(error);

          // Add error message part to UI
          updateActiveMessageContent(currentSessionId, (prev) => [
            ...prev,
            {
              type: 'error',
              error: error.message || String(error),
              status: 'completed',
            } as MessagePart,
          ]);

          // Cleanup
          cleanupAfterStream({
            currentSessionId,
            wasAbortedRef,
            lastErrorRef,
            usageRef,
            finishReasonRef,
            streamingMessageIdRef,
            setIsStreaming,
            notificationSettings,
          });
        },
        complete: () => {
          addLog('[Subscription] Complete');

          // Cleanup
          cleanupAfterStream({
            currentSessionId,
            wasAbortedRef,
            lastErrorRef,
            usageRef,
            finishReasonRef,
            streamingMessageIdRef,
            setIsStreaming,
            notificationSettings,
          });
        },
      });

      // Handle abort
      abortControllerRef.current.signal.addEventListener('abort', () => {
        addLog('[Subscription] Aborted by user');
        wasAbortedRef.current = true;
        subscription.unsubscribe();

        // Mark active parts as aborted
        updateActiveMessageContent(currentSessionId, (prev) =>
          prev.map((part) =>
            part.status === 'active' ? { ...part, status: 'abort' as const } : part
          )
        );

        // Cleanup
        cleanupAfterStream({
          currentSessionId,
          wasAbortedRef,
          lastErrorRef,
          usageRef,
          finishReasonRef,
          streamingMessageIdRef,
          setIsStreaming,
          notificationSettings,
        });
      });
    } catch (error) {
      addLog(
        `[subscriptionAdapter] Error: ${error instanceof Error ? error.message : String(error)}`
      );
      lastErrorRef.current = error instanceof Error ? error.message : String(error);
      setIsStreaming(false);
    }
  };
}

/**
 * Handle individual stream events
 */
function handleStreamEvent(
  event: StreamEvent,
  context: {
    currentSessionId: string | null;
    updateSessionTitle: (sessionId: string, title: string) => void;
    setIsTitleStreaming: (value: boolean) => void;
    setStreamingTitle: React.Dispatch<React.SetStateAction<string>>;
    streamingMessageIdRef: React.MutableRefObject<string | null>;
    usageRef: React.MutableRefObject<TokenUsage | null>;
    finishReasonRef: React.MutableRefObject<string | null>;
    lastErrorRef: React.MutableRefObject<string | null>;
    addLog: (message: string) => void;
    aiConfig: AIConfig | null;
    userMessage: string;
    notificationSettings: { notifyOnCompletion: boolean; notifyOnError: boolean };
  }
) {
  const { currentSessionId } = context;

  switch (event.type) {
    case 'session-created':
      // New session was created - this is handled in the component, not here
      // The component should update currentSessionId
      context.addLog(`[Session] Created: ${event.sessionId}`);
      break;

    case 'session-title-start':
      context.setIsTitleStreaming(true);
      context.setStreamingTitle('');
      break;

    case 'session-title-delta':
      context.setStreamingTitle((prev) => prev + event.text);
      break;

    case 'session-title-complete':
      context.setIsTitleStreaming(false);
      if (currentSessionId) {
        context.updateSessionTitle(currentSessionId, event.title);
      }
      break;

    case 'assistant-message-created':
      // Backend created assistant message, store the ID
      context.streamingMessageIdRef.current = event.messageId;

      // Sync to Zustand store
      useAppStore.setState((state) => {
        const session = state.currentSession;
        if (session && session.id === currentSessionId) {
          session.messages.push({
            role: 'assistant',
            content: [],
            timestamp: Date.now(),
            status: 'active',
          });
        }
      });
      break;

    case 'reasoning-start':
      updateActiveMessageContent(currentSessionId, (prev) => [
        ...prev,
        { type: 'reasoning', content: '', status: 'active', startTime: Date.now() } as MessagePart,
      ]);
      break;

    case 'reasoning-delta':
      updateActiveMessageContent(currentSessionId, (prev) => {
        const newParts = [...prev];
        const lastPart = newParts[newParts.length - 1];
        if (lastPart && lastPart.type === 'reasoning') {
          newParts[newParts.length - 1] = {
            ...lastPart,
            content: lastPart.content + event.text,
          };
        }
        return newParts;
      });
      break;

    case 'reasoning-end':
      updateActiveMessageContent(currentSessionId, (prev) => {
        const newParts = [...prev];
        const lastReasoningIndex = newParts
          .map((p, i) => ({ p, i }))
          .reverse()
          .find(({ p }) => p.type === 'reasoning' && p.status === 'active')?.i;

        if (lastReasoningIndex !== undefined) {
          const reasoningPart = newParts[lastReasoningIndex];
          if (reasoningPart && reasoningPart.type === 'reasoning') {
            newParts[lastReasoningIndex] = {
              ...reasoningPart,
              status: 'completed',
              duration: event.duration,
            } as MessagePart;
          }
        }
        return newParts;
      });
      break;

    case 'text-start':
      updateActiveMessageContent(currentSessionId, (prev) => [
        ...prev,
        { type: 'text', content: '', status: 'active' } as MessagePart,
      ]);
      break;

    case 'text-delta':
      updateActiveMessageContent(currentSessionId, (prev) => {
        const newParts = [...prev];
        const lastPart = newParts[newParts.length - 1];

        if (lastPart && lastPart.type === 'text' && lastPart.status === 'active') {
          newParts[newParts.length - 1] = {
            type: 'text',
            content: lastPart.content + event.text,
            status: 'active' as const,
          };
        } else {
          console.warn('[text-delta] No active text part found, creating new one');
          newParts.push({
            type: 'text',
            content: event.text,
            status: 'active' as const,
          });
        }

        return newParts;
      });
      break;

    case 'text-end':
      updateActiveMessageContent(currentSessionId, (prev) => {
        const newParts = [...prev];
        const lastTextIndex = newParts
          .map((p, i) => ({ p, i }))
          .reverse()
          .find(({ p }) => p.type === 'text' && p.status === 'active')?.i;

        if (lastTextIndex !== undefined) {
          const textPart = newParts[lastTextIndex];
          if (textPart && textPart.type === 'text') {
            newParts[lastTextIndex] = {
              ...textPart,
              status: 'completed',
            } as MessagePart;
          }
        }

        return newParts;
      });
      break;

    case 'tool-call':
      updateActiveMessageContent(currentSessionId, (prev) => [
        ...prev,
        {
          type: 'tool',
          toolId: event.toolCallId,
          name: event.toolName,
          status: 'active',
          args: event.args,
          startTime: Date.now(),
        } as MessagePart,
      ]);
      break;

    case 'tool-result':
      updateActiveMessageContent(currentSessionId, (prev) =>
        prev.map((part) =>
          part.type === 'tool' && part.toolId === event.toolCallId
            ? {
                ...part,
                status: 'completed' as const,
                duration: event.duration,
                result: event.result,
              }
            : part
        )
      );
      break;

    case 'tool-error':
      updateActiveMessageContent(currentSessionId, (prev) =>
        prev.map((part) =>
          part.type === 'tool' && part.toolId === event.toolCallId
            ? { ...part, status: 'error' as const, error: event.error, duration: event.duration }
            : part
        )
      );
      break;

    case 'complete':
      // Store usage and finishReason
      if (event.usage) {
        context.usageRef.current = event.usage;
      }
      if (event.finishReason) {
        context.finishReasonRef.current = event.finishReason;
      }

      // Generate title if this is the first message
      generateTitleIfNeeded(context);
      break;

    case 'error':
      context.lastErrorRef.current = event.error;
      updateActiveMessageContent(currentSessionId, (prev) => [
        ...prev,
        { type: 'error', error: event.error, status: 'completed' } as MessagePart,
      ]);
      break;

    case 'abort':
      context.addLog('[StreamEvent] Stream aborted');
      break;
  }
}

/**
 * Generate session title if this is the first message
 */
async function generateTitleIfNeeded(context: {
  currentSessionId: string | null;
  updateSessionTitle: (sessionId: string, title: string) => void;
  setIsTitleStreaming: (value: boolean) => void;
  setStreamingTitle: React.Dispatch<React.SetStateAction<string>>;
  addLog: (message: string) => void;
  aiConfig: AIConfig | null;
  userMessage: string;
}) {
  if (!context.currentSessionId) return;

  // Get fresh session from store
  const freshSession = useAppStore.getState().currentSession;
  if (!freshSession || freshSession.id !== context.currentSessionId) return;

  const userMessageCount = freshSession.messages.filter((m) => m.role === 'user').length;
  const hasTitle = !!freshSession.title && freshSession.title !== 'New Chat';

  const isFirstMessage = userMessageCount === 1;
  if (isFirstMessage && !hasTitle) {
    const { generateSessionTitleWithStreaming } = await import('@sylphx/code-core');
    const provider = freshSession.provider;
    const modelName = freshSession.model;
    const providerConfig = context.aiConfig?.providers?.[provider];

    if (providerConfig) {
      context.setIsTitleStreaming(true);
      context.setStreamingTitle('');

      try {
        const finalTitle = await generateSessionTitleWithStreaming(
          context.userMessage,
          provider,
          modelName,
          providerConfig,
          (chunk) => {
            context.setStreamingTitle((prev) => prev + chunk);
          }
        );

        context.setIsTitleStreaming(false);
        context.updateSessionTitle(context.currentSessionId, finalTitle);
      } catch (error) {
        // Only log errors in debug mode
        if (process.env.DEBUG) {
          context.addLog(`[Title] Error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
        context.setIsTitleStreaming(false);

        // Fallback to simple title
        const { generateSessionTitle } = await import('@sylphx/code-core');
        const title = generateSessionTitle(context.userMessage);
        context.updateSessionTitle(context.currentSessionId, title);
      }
    }
  }
}

/**
 * Cleanup after stream completes or errors
 */
function cleanupAfterStream(context: {
  currentSessionId: string | null;
  wasAbortedRef: React.MutableRefObject<boolean>;
  lastErrorRef: React.MutableRefObject<string | null>;
  usageRef: React.MutableRefObject<TokenUsage | null>;
  finishReasonRef: React.MutableRefObject<string | null>;
  streamingMessageIdRef: React.MutableRefObject<string | null>;
  setIsStreaming: (value: boolean) => void;
  notificationSettings: { notifyOnCompletion: boolean; notifyOnError: boolean };
}) {
  const wasAborted = context.wasAbortedRef.current;
  const hasError = context.lastErrorRef.current;

  // Update message status in Zustand store
  const finalStatus = wasAborted ? 'abort' : hasError ? 'error' : 'completed';

  useAppStore.setState((state) => {
    const session = state.currentSession;
    if (!session || session.id !== context.currentSessionId) return;

    const activeMessage = [...session.messages]
      .reverse()
      .find((m) => m.role === 'assistant' && m.status === 'active');

    if (!activeMessage) return;

    // Update message status and metadata
    activeMessage.status = finalStatus;
    if (context.usageRef.current) {
      activeMessage.usage = context.usageRef.current;
    }
    if (context.finishReasonRef.current) {
      activeMessage.finishReason = context.finishReasonRef.current;
    }
  });

  // Send notifications
  if (context.notificationSettings.notifyOnCompletion && !wasAborted && !hasError) {
    // TODO: Send notification (platform-specific)
  }
  if (context.notificationSettings.notifyOnError && hasError) {
    // TODO: Send error notification (platform-specific)
  }

  // Reset flags
  context.wasAbortedRef.current = false;
  context.lastErrorRef.current = null;
  context.streamingMessageIdRef.current = null;
  context.usageRef.current = null;
  context.finishReasonRef.current = null;

  // Message streaming ended
  context.setIsStreaming(false);
}

/**
 * Chat Hook
 * Handle AI chat with streaming support via tRPC
 *
 * Architecture: Thin client calling server-side streaming
 * - Server: Handles all AI logic (createAIStream, processStream, providers)
 * - Client: Subscribes to streaming events and updates UI
 */

import { useCallback } from 'react';
import { useAppStore } from '../stores/app-store.js';
import { getTRPCClient } from '../trpc-provider.js';
import type { FileAttachment, TokenUsage } from '@sylphx/code-core';

/**
 * Options for sending a message
 */
export interface SendMessageOptions {
  // Data
  attachments?: FileAttachment[];

  // Lifecycle callbacks
  onComplete?: () => void;
  onAbort?: () => void;
  onError?: (error: string) => void;
  onFinish?: (usage?: TokenUsage, finishReason?: string) => void;

  // Tool streaming callbacks
  onToolCall?: (toolCallId: string, toolName: string, args: unknown) => void;
  onToolResult?: (toolCallId: string, toolName: string, result: unknown, duration: number) => void;
  onToolError?: (toolCallId: string, toolName: string, error: string, duration: number) => void;

  // Reasoning streaming callbacks
  onReasoningStart?: () => void;
  onReasoningDelta?: (text: string) => void;
  onReasoningEnd?: (duration: number) => void;

  // Text streaming callbacks
  onTextStart?: () => void;
  onTextDelta?: (text: string) => void;
  onTextEnd?: () => void;

  // Session events
  onSessionCreated?: (sessionId: string, provider: string, model: string) => void;
  onSessionTitleStart?: () => void;
  onSessionTitleDelta?: (text: string) => void;
  onSessionTitleComplete?: (title: string) => void;

  // Message events
  onAssistantMessageCreated?: (messageId: string) => void;

  // Ask tool events (client-server architecture)
  onAskQuestion?: (questionId: string, questions: Array<{
    question: string;
    header: string;
    multiSelect: boolean;
    options: Array<{
      label: string;
      description: string;
    }>;
  }>) => void;
}

export function useChat() {
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const currentSession = useAppStore((state) => state.currentSession);
  const setError = useAppStore((state) => state.setError);

  const sendMessage = useCallback(async (
    message: string,
    options: SendMessageOptions = {}
  ) => {
    const {
      attachments = [],
      onComplete,
      onAbort,
      onError,
      onFinish,
      onToolCall,
      onToolResult,
      onToolError,
      onReasoningStart,
      onReasoningDelta,
      onReasoningEnd,
      onTextStart,
      onTextDelta,
      onTextEnd,
      onSessionCreated,
      onSessionTitleStart,
      onSessionTitleDelta,
      onSessionTitleComplete,
      onAssistantMessageCreated,
      onAskQuestion,
    } = options;

    if (!currentSession || !currentSessionId) {
      console.error('[useChat] No active session');
      return;
    }

    try {
      const client = getTRPCClient();

      // Subscribe to streaming response
      const subscription = client.message.streamResponse.subscribe(
        {
          sessionId: currentSessionId,
          userMessage: message,
          attachments,
        },
        {
          onData: (event: any) => {
            // Handle streaming events from server
            switch (event.type) {
              case 'session-created':
                onSessionCreated?.(event.sessionId, event.provider, event.model);
                break;

              case 'session-title-start':
                onSessionTitleStart?.();
                break;

              case 'session-title-delta':
                onSessionTitleDelta?.(event.text);
                break;

              case 'session-title-complete':
                onSessionTitleComplete?.(event.title);
                break;

              case 'assistant-message-created':
                onAssistantMessageCreated?.(event.messageId);
                break;

              case 'text-start':
                onTextStart?.();
                break;

              case 'text-delta':
                onTextDelta?.(event.text);
                break;

              case 'text-end':
                onTextEnd?.();
                break;

              case 'reasoning-start':
                onReasoningStart?.();
                break;

              case 'reasoning-delta':
                onReasoningDelta?.(event.text);
                break;

              case 'reasoning-end':
                onReasoningEnd?.(event.duration);
                break;

              case 'tool-call':
                onToolCall?.(event.toolCallId, event.toolName, event.args);
                break;

              case 'tool-result':
                onToolResult?.(event.toolCallId, event.toolName, event.result, event.duration);
                break;

              case 'tool-error':
                onToolError?.(event.toolCallId, event.toolName, event.error, event.duration);
                break;

              case 'ask-question':
                onAskQuestion?.(event.questionId, event.questions);
                break;

              case 'complete':
                onFinish?.(event.usage, event.finishReason);
                onComplete?.();
                break;

              case 'error':
                onError?.(event.error);
                setError(event.error);
                break;

              case 'abort':
                onAbort?.();
                break;
            }
          },
          onError: (error: any) => {
            const errorMessage = error instanceof Error ? error.message : 'Streaming error';
            onError?.(errorMessage);
            setError(errorMessage);
          },
          onComplete: () => {
            // Subscription completed
          },
        }
      );

      // Return unsubscribe function
      return () => subscription.unsubscribe();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      onError?.(errorMessage);
      setError(errorMessage);
    }
  }, [currentSessionId, currentSession, setError]);

  return { sendMessage };
}

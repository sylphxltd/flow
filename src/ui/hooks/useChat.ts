/**
 * Chat Hook
 * Handle AI chat with streaming support and tool execution
 */

import { useAppStore } from '../stores/app-store.js';
import { getProvider } from '../../providers/index.js';
import { createAIStream } from '../../core/ai-sdk.js';
import { processStream } from '../../core/stream-handler.js';
import {
  setUserInputHandler,
  clearUserInputHandler,
  type UserInputRequest
} from '../../tools/interaction.js';

export function useChat() {
  const aiConfig = useAppStore((state) => state.aiConfig);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const sessions = useAppStore((state) => state.sessions);
  const addMessage = useAppStore((state) => state.addMessage);
  const setError = useAppStore((state) => state.setError);
  const addDebugLog = useAppStore((state) => state.addDebugLog);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  /**
   * Send message and stream response
   */
  const sendMessage = async (
    message: string,
    onChunk: (chunk: string) => void,
    onToolCall?: (toolName: string, args: unknown) => void,
    onToolResult?: (toolName: string, result: unknown, duration: number) => void,
    onComplete?: () => void,
    onUserInputRequest?: (request: UserInputRequest) => Promise<string>
  ) => {
    if (!currentSession || !currentSessionId) {
      setError('No active session');
      return;
    }

    const provider = currentSession.provider;
    const modelName = currentSession.model;
    const providerConfig = aiConfig?.providers?.[provider];

    if (!providerConfig?.apiKey) {
      setError('API key not configured');
      return;
    }

    try {
      // Set up user input handler for AI tools
      if (onUserInputRequest) {
        setUserInputHandler(onUserInputRequest);
      }

      // Add user message
      addMessage(currentSessionId, 'user', message);

      // Get all messages for context
      const messages = [
        ...currentSession.messages,
        { role: 'user' as const, content: message, timestamp: Date.now() },
      ];

      // Get model using provider registry
      const providerInstance = getProvider(provider);
      const model = providerInstance.createClient(providerConfig.apiKey, modelName);

      // Create AI stream
      const stream = createAIStream({
        model,
        messages: messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      // Process stream with unified handler
      const { fullResponse, messageParts } = await processStream(stream, {
        onTextDelta: (text) => {
          addDebugLog(`[useChat] text-delta: ${text.substring(0, 50)}`);
          onChunk(text);
        },
        onToolCall: (toolName, args) => {
          addDebugLog(`[useChat] tool-call: ${toolName}`);
          onToolCall?.(toolName, args);
        },
        onToolResult: (toolName, result, duration) => {
          addDebugLog(`[useChat] tool-result: ${toolName} (${duration}ms)`);
          onToolResult?.(toolName, result, duration);
        },
        onComplete: () => {
          addDebugLog('[useChat] stream complete');
          onComplete?.();
        },
      });

      // Add assistant message to session with parts
      addMessage(currentSessionId, 'assistant', fullResponse, messageParts);
    } catch (error) {
      console.error('[Chat Error]:', error);

      // Format error message for display
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      const displayError = `❌ Error: ${errorMessage}\n\n${
        error instanceof Error && 'statusCode' in error && (error as any).statusCode === 401
          ? 'This usually means:\n• Invalid or missing API key\n• API key has expired\n\nPlease check your provider configuration with /provider command.'
          : 'Please try again or check your configuration.'
      }`;

      // Add error as assistant message so user can see it in chat
      addMessage(currentSessionId, 'assistant', displayError);

      setError(errorMessage);
      onComplete?.();
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

/**
 * Chat Hook
 * Handle AI chat with streaming support and tool execution
 */

import { useAppStore } from '../stores/app-store.js';
import { getProvider } from '../../providers/index.js';
import { createAIStream } from '../../core/ai-sdk.js';

export function useChat() {
  const aiConfig = useAppStore((state) => state.aiConfig);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const sessions = useAppStore((state) => state.sessions);
  const addMessage = useAppStore((state) => state.addMessage);
  const setError = useAppStore((state) => state.setError);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  /**
   * Send message and stream response
   */
  const sendMessage = async (
    message: string,
    onChunk: (chunk: string) => void,
    onToolCall?: (toolName: string, args: unknown) => void,
    onToolResult?: (toolName: string, result: unknown, duration: number) => void,
    onComplete?: () => void
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

      let fullResponse = '';
      const activeTools = new Map<string, number>(); // Track tool start times

      // Create AI stream using our SDK and stream chunks
      for await (const chunk of createAIStream({
        model,
        messages: messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      })) {
        if (chunk.type === 'text-delta') {
          fullResponse += chunk.textDelta;
          onChunk(chunk.textDelta);
        } else if (chunk.type === 'reasoning') {
          fullResponse += chunk.text;
          onChunk(chunk.text);
        } else if (chunk.type === 'tool-call') {
          activeTools.set(chunk.toolCallId, Date.now());
          onToolCall?.(chunk.toolName, chunk.args);
        } else if (chunk.type === 'tool-result') {
          const startTime = activeTools.get(chunk.toolCallId);
          const duration = startTime ? Date.now() - startTime : 0;
          activeTools.delete(chunk.toolCallId);
          onToolResult?.(chunk.toolName, chunk.result, duration);
        }
      }

      // Add assistant message to session
      addMessage(currentSessionId, 'assistant', fullResponse);
      onComplete?.();
    } catch (error) {
      console.error('[Chat Error]:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      onComplete?.();
    }
  };

  return {
    sendMessage,
    currentSession,
  };
}

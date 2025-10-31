/**
 * Chat Hook
 * Handle AI chat with streaming support
 */

import { streamText } from 'ai';
import { useAppStore } from '../stores/app-store.js';
import { getProvider } from '../../providers/index.js';

const SYSTEM_PROMPT = `You are a helpful coding assistant. You help users with programming tasks, code review, debugging, and software development.

Key capabilities:
- Write clean, functional code
- Explain complex concepts clearly
- Debug issues systematically
- Follow best practices
- Provide examples and documentation`;

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
    onComplete: () => void
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

      // Stream response
      const { textStream } = streamText({
        model,
        system: SYSTEM_PROMPT,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      let fullResponse = '';

      for await (const chunk of textStream) {
        fullResponse += chunk;
        onChunk(chunk);
      }

      // Add assistant message to session
      addMessage(currentSessionId, 'assistant', fullResponse);
      onComplete();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send message');
      onComplete();
    }
  };

  return {
    sendMessage,
    currentSession,
  };
}

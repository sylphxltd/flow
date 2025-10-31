/**
 * Chat Hook
 * Handle AI chat with streaming support
 */

import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import type { LanguageModelV1 } from 'ai';
import { useAppStore } from '../stores/app-store.js';
import { AI_PROVIDERS, type ProviderId } from '../../config/ai-config.js';

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
   * Get AI model instance
   */
  const getModel = (provider: ProviderId, apiKey: string, modelName: string): LanguageModelV1 => {
    switch (provider) {
      case 'anthropic':
        return anthropic(modelName, { apiKey });

      case 'openai':
        return openai(modelName, { apiKey });

      case 'google':
        return google(modelName, { apiKey });

      case 'openrouter': {
        const openrouter = createOpenRouter({ apiKey });
        return openrouter(modelName);
      }

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  };

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

      // Get model
      const model = getModel(provider, providerConfig.apiKey, modelName);

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

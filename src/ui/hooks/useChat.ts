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
    onUserInputRequest?: (request: UserInputRequest) => Promise<string>,
    attachments?: Array<{ path: string; relativePath: string; size?: number }>
  ) => {
    if (!currentSession || !currentSessionId) {
      setError('No active session');
      return;
    }

    const provider = currentSession.provider;
    const modelName = currentSession.model;
    const providerConfig = aiConfig?.providers?.[provider];

    if (!providerConfig) {
      setError('Provider not configured');
      return;
    }

    // Check if provider is properly configured using provider's own logic
    const providerInstance = getProvider(provider);
    if (!providerInstance.isConfigured(providerConfig)) {
      setError(`${providerInstance.name} is not properly configured. Please check your settings with /provider command.`);
      return;
    }

    try {
      // Set up user input handler for AI tools
      if (onUserInputRequest) {
        setUserInputHandler(onUserInputRequest);
      }

      // Read file contents if attachments provided
      let messageForLLM = message;
      if (attachments && attachments.length > 0) {
        try {
          const { readFile } = await import('node:fs/promises');
          const fileContents = await Promise.all(
            attachments.map(async (att) => {
              try {
                const content = await readFile(att.path, 'utf8');
                return { path: att.relativePath, content, success: true };
              } catch (error) {
                return {
                  path: att.relativePath,
                  content: `[Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}]`,
                  success: false
                };
              }
            })
          );

          // Format message with file contents for LLM
          const fileContentsText = fileContents
            .map((f) => `\n\n<file path="${f.path}">\n${f.content}\n</file>`)
            .join('');

          messageForLLM = `${message}${fileContentsText}`;
        } catch (error) {
          console.error('Failed to read attachments:', error);
        }
      }

      // Add user message to session (original message without file contents)
      addMessage(currentSessionId, 'user', message, undefined, attachments);

      // Get all messages for context
      // For messages with attachments, we need to read files and add content
      const messages = await Promise.all(
        [...currentSession.messages, { role: 'user' as const, content: message, timestamp: Date.now(), attachments }].map(async (msg) => {
          if (msg.attachments && msg.attachments.length > 0) {
            // Read file contents for this message
            try {
              const { readFile } = await import('node:fs/promises');
              const fileContents = await Promise.all(
                msg.attachments.map(async (att) => {
                  try {
                    const content = await readFile(att.path, 'utf8');
                    return { path: att.relativePath, content };
                  } catch {
                    return { path: att.relativePath, content: '[Error reading file]' };
                  }
                })
              );

              const fileContentsText = fileContents
                .map((f) => `\n\n<file path="${f.path}">\n${f.content}\n</file>`)
                .join('');

              return {
                role: msg.role as 'user' | 'assistant',
                content: `${msg.content}${fileContentsText}`,
              };
            } catch {
              return {
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
              };
            }
          }

          return {
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          };
        })
      );

      // Get model using provider registry with full config
      const model = providerInstance.createClient(providerConfig, modelName);

      // Create AI stream
      const stream = createAIStream({
        model,
        messages,
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
      });

      addDebugLog('[useChat] stream complete');

      // Add assistant message to session with parts first
      addMessage(currentSessionId, 'assistant', fullResponse, messageParts);

      // Then trigger UI update
      onComplete?.();
    } catch (error) {
      addDebugLog('[useChat] ERROR CAUGHT!');
      console.error('[Chat Error]:', error);

      if (!currentSessionId) {
        addDebugLog('[useChat] ERROR: No currentSessionId!');
        setError('No active session');
        onComplete?.();
        return;
      }

      // Format error message for display
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      addDebugLog(`[useChat] Adding error message to session: ${currentSessionId}`);

      const displayError = `❌ Error: ${errorMessage}\n\n${
        error instanceof Error && 'statusCode' in error && (error as any).statusCode === 401
          ? 'This usually means:\n• Invalid or missing API key\n• API key has expired\n\nPlease check your provider configuration with /provider command.'
          : 'Please try again or check your configuration.'
      }`;

      // Add error as assistant message so user can see it in chat
      addMessage(currentSessionId, 'assistant', displayError);
      addDebugLog('[useChat] Error message added, calling onComplete');

      // Trigger UI update after adding error message
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

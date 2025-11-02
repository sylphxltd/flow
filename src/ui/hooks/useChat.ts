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
    onToolCall?: (toolCallId: string, toolName: string, args: unknown) => void,
    onToolResult?: (toolCallId: string, toolName: string, result: unknown, duration: number) => void,
    onComplete?: () => void,
    onUserInputRequest?: (request: UserInputRequest) => Promise<string>,
    attachments?: Array<{ path: string; relativePath: string; size?: number }>,
    onReasoningStart?: () => void,
    onReasoningDelta?: (text: string) => void,
    onReasoningEnd?: (duration: number) => void,
    onToolError?: (toolCallId: string, toolName: string, error: string, duration: number) => void,
    onError?: (error: string) => void
  ) => {
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
        { type: 'text', content: '❌ Error: Provider not configured\n\nPlease configure your provider using the /provider command.' }
      ]);
      onComplete?.();
      return;
    }

    // Check if provider is properly configured using provider's own logic
    const providerInstance = getProvider(provider);
    if (!providerInstance.isConfigured(providerConfig)) {
      addMessage(currentSessionId, 'assistant', [
        { type: 'text', content: `❌ Error: ${providerInstance.name} is not properly configured\n\nPlease check your settings with the /provider command.` }
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
      const updatedSession = sessions.find((s) => s.id === currentSessionId);
      if (!updatedSession) {
        console.error('[useChat] Session not found after addMessage');
        return;
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

            // 3. Add file attachments as file parts (read fresh from disk)
            if (msg.attachments && msg.attachments.length > 0) {
              try {
                const { readFile } = await import('node:fs/promises');
                const fileContents = await Promise.all(
                  msg.attachments.map(async (att) => {
                    try {
                      const content = await readFile(att.path, 'utf8');
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

      // Debug: Log messages being sent to LLM
      addDebugLog('[useChat] Messages to LLM: ' + JSON.stringify(messages.map(m => ({
        role: m.role,
        contentLength: Array.isArray(m.content) ? m.content.length : typeof m.content === 'string' ? m.content.length : 0,
        contentPreview: Array.isArray(m.content)
          ? m.content.slice(0, 2).map((p: any) => ({ type: p.type, textPreview: p.text?.substring(0, 100) }))
          : typeof m.content === 'string' ? m.content.substring(0, 100) : 'unknown'
      })), null, 2));

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
          // Text generation finished
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

      // Then trigger UI update
      onComplete?.();
    } catch (error) {
      addDebugLog('[useChat] ERROR CAUGHT!');
      // Don't log to console - error will be shown as assistant message
      addDebugLog(`[useChat] Error: ${error instanceof Error ? error.message : String(error)}`);

      // Get fresh session ID in case it changed
      const sessionId = currentSessionId || useAppStore.getState().currentSessionId;

      if (!sessionId) {
        addDebugLog('[useChat] ERROR: No sessionId available!');
        console.error('[useChat] Cannot display error - no active session');
        return;
      }

      // Format error message for display
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      addDebugLog(`[useChat] Adding error message to session: ${sessionId}`);

      const displayError = `❌ Error: ${errorMessage}\n\n${
        error instanceof Error && 'statusCode' in error && (error as any).statusCode === 401
          ? 'This usually means:\n• Invalid or missing API key\n• API key has expired\n\nPlease check your provider configuration with /provider command.'
          : 'Please try again or check your configuration.'
      }`;

      // Add error as assistant message so user can see it in chat
      addMessage(sessionId, 'assistant', [
        { type: 'error', error: displayError }
      ]);
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

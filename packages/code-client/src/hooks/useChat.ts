/**
 * Chat Hook
 * Handle AI chat with streaming support and tool execution
 */

import { useAppStore } from '../stores/app-store.js';
import { getProvider } from '@sylphx/code-core';
import {
  createAIStream,
  getSystemStatus,
  injectSystemStatusToOutput,
  type SystemStatus,
} from '@sylphx/code-core';
import { processStream } from '@sylphx/code-core';
import {
  setUserInputHandler,
  clearUserInputHandler,
  type UserInputRequest
} from '@sylphx/code-core';
import type { ModelMessage } from 'ai';
import { sendNotification } from '@sylphx/code-core';
import { generateSessionTitle, generateSessionTitleWithStreaming } from '@sylphx/code-core';
import { MessageTransformerService } from '@sylphx/code-core';

// Create singleton MessageTransformer instance with file caching
const messageTransformer = new MessageTransformerService();

export function useChat() {
  const aiConfig = useAppStore((state) => state.aiConfig);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  // tRPC: currentSession cached in store, no need to search array
  const currentSession = useAppStore((state) => state.currentSession);
  const addMessage = useAppStore((state) => state.addMessage);
  const setError = useAppStore((state) => state.setError);
  const addDebugLog = useAppStore((state) => state.addDebugLog);
  const notificationSettings = useAppStore((state) => state.notificationSettings);

  /**
   * Send message and stream response
   * @param abortSignal - Optional abort signal to cancel the stream
   */
  interface SendMessageOptions {
    // Data
    attachments?: FileAttachment[];
    abortSignal?: AbortSignal;

    // Lifecycle callbacks (required/optional)
    onComplete?: () => void;
    onAbort?: () => void;
    onError?: (error: string) => void;
    onFinish?: (usage: TokenUsage, finishReason: string) => void;

    // Tool streaming callbacks
    onToolCall?: (toolCallId: string, toolName: string, args: unknown) => void;
    onToolResult?: (toolCallId: string, toolName: string, result: unknown, duration: number) => void;
    onToolInputStart?: (toolCallId: string, toolName: string) => void;
    onToolInputDelta?: (toolCallId: string, toolName: string, argsTextDelta: string) => void;
    onToolInputEnd?: (toolCallId: string, toolName: string, args: unknown) => void;
    onToolError?: (toolCallId: string, toolName: string, error: string, duration: number) => void;

    // Reasoning streaming callbacks
    onReasoningStart?: () => void;
    onReasoningDelta?: (text: string) => void;
    onReasoningEnd?: (duration: number) => void;

    // Text streaming callbacks
    onTextStart?: () => void;
    onTextDelta?: (text: string) => void;
    onTextEnd?: () => void;

    // User interaction
    onUserInputRequest?: (request: UserInputRequest) => Promise<string>;
  }

  const sendMessage = async (
    message: string,
    options: SendMessageOptions
  ) => {
    // Destructure options for easier access
    const {
      attachments,
      abortSignal,
      onComplete,
      onAbort,
      onError,
      onFinish,
      onToolCall,
      onToolResult,
      onToolInputStart,
      onToolInputDelta,
      onToolInputEnd,
      onToolError,
      onReasoningStart,
      onReasoningDelta,
      onReasoningEnd,
      onTextStart,
      onTextDelta,
      onTextEnd,
      onUserInputRequest,
    } = options;
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
        { type: 'text', text: '[ERROR] Provider not configured\n\nPlease configure your provider using the /provider command.' } // FIX: Use 'text' field
      ]);
      onComplete?.();
      return;
    }

    // Check if provider is properly configured using provider's own logic
    const providerInstance = getProvider(provider);
    if (!providerInstance.isConfigured(providerConfig)) {
      addMessage(currentSessionId, 'assistant', [
        { type: 'text', text: `[ERROR] ${providerInstance.name} is not properly configured\n\nPlease check your settings with the /provider command.` } // FIX: Use 'text' field
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
      const currentSession = useAppStore.getState().currentSession;
      const todoSnapshot = currentSession?.todos ? [...currentSession.todos] : [];

      // Add user message to session
      // Design decisions:
      // - content: What user actually typed (shown in UI)
      // - metadata: System resource context (cpu, memory) - for LLM, not UI
      // - todoSnapshot: Full todo state - enables rewind, sent to LLM as context
      addMessage(
        currentSessionId,
        'user',
        [{ type: 'text', text: message }], // FIX: Use 'text' field
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
      // tRPC: currentSession is always fresh in store
      const updatedSession = useAppStore.getState().currentSession;
      if (!updatedSession) {
        console.error('[useChat] Session not found after addMessage');
        return;
      }

      // Generate title for first message if enabled
      if (updatedSession.messages.length === 1 && !updatedSession.title) {
        const updateSessionTitle = useAppStore.getState().updateSessionTitle;
        const autoGenerateTitle = notificationSettings.autoGenerateTitle;

        if (autoGenerateTitle) {
          // Generate title with LLM streaming
          let accumulatedTitle = '';
          generateSessionTitleWithStreaming(
            message,
            provider,
            modelName,
            providerConfig,
            (chunk) => {
              // Accumulate chunks and update title in real-time
              accumulatedTitle += chunk;
              updateSessionTitle(currentSessionId, accumulatedTitle);
            }
          ).then((finalTitle) => {
            // Update with final cleaned title
            updateSessionTitle(currentSessionId, finalTitle);
          }).catch(() => {
            // Fallback to simple title on error
            const simpleTitle = generateSessionTitle(message);
            updateSessionTitle(currentSessionId, simpleTitle);
          });
        } else {
          // Simple title generation (truncate first message)
          const simpleTitle = generateSessionTitle(message);
          updateSessionTitle(currentSessionId, simpleTitle);
        }
      }

      // Transform SessionMessage[] to ModelMessage[] using core service
      // This handles:
      // 1. System status injection from STORED metadata (preserves prompt cache)
      // 2. Todo context injection from snapshots
      // 3. File attachment reading with intelligent caching
      // 4. Content format conversion
      // 5. Status annotations
      const messages: ModelMessage[] = await messageTransformer.transformMessages(updatedSession.messages);

      // Get model using provider registry with full config
      const model = providerInstance.createClient(providerConfig, modelName);

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
        // Only pass abortSignal if provided (exactOptionalPropertyTypes compliance)
        ...(abortSignal ? { abortSignal } : {}),

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
          onTextStart?.();
        },
        onTextDelta: (text) => {
          addDebugLog(`[useChat] text-delta: ${text.substring(0, 50)}`);
          onTextDelta?.(text);
        },
        onTextEnd: () => {
          addDebugLog(`[useChat] text-end`);
          onTextEnd?.();
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
        onToolInputStart: (toolCallId, toolName) => {
          addDebugLog(`[useChat] tool-input-start: ${toolName} (${toolCallId})`);
          onToolInputStart?.(toolCallId, toolName);
        },
        onToolInputDelta: (toolCallId, toolName, argsTextDelta) => {
          addDebugLog(`[useChat] tool-input-delta: ${toolName} (${toolCallId}) +${argsTextDelta.length} chars`);
          onToolInputDelta?.(toolCallId, toolName, argsTextDelta);
        },
        onToolInputEnd: (toolCallId, toolName, args) => {
          addDebugLog(`[useChat] tool-input-end: ${toolName} (${toolCallId})`);
          onToolInputEnd?.(toolCallId, toolName, args);
        },
        onToolResult: (toolCallId, toolName, result, duration) => {
          addDebugLog(`[useChat] tool-result: ${toolName} (${toolCallId}, ${duration}ms)`);
          onToolResult?.(toolCallId, toolName, result, duration);
        },
        onToolError: (toolCallId, toolName, error, duration) => {
          addDebugLog(`[useChat] tool-error: ${toolName} (${toolCallId}, ${duration}ms) - ${error}`);
          onToolError?.(toolCallId, toolName, error, duration);
        },
        onAbort: () => {
          addDebugLog(`[useChat] abort`);
          onAbort?.();
        },
        onError: (error) => {
          addDebugLog(`[useChat] error: ${error}`);
          onError?.(error);
        },
        onFinish: (usage, finishReason) => {
          addDebugLog(`[useChat] finish: ${finishReason}, tokens: ${usage.totalTokens}`);
          onFinish?.(usage, finishReason);
        },
      });

      addDebugLog('[useChat] stream complete');

      // NOTE: Message is already created and updated by Chat.tsx during streaming
      // No need to addMessage here - would create duplicate message
      // Chat.tsx handles:
      // - Message creation (with status='active')
      // - Real-time part updates (via onReasoningEnd, onTextEnd, etc.)
      // - Status update (via onComplete -> updateMessageStatus)
      // - Usage/finishReason update (via onFinish)

      // Just trigger UI completion
      onComplete?.();
      
      // Send notification when AI response is complete
      const responsePreview = fullResponse.length > 100 
        ? fullResponse.substring(0, 97) + '...' 
        : fullResponse;
      
      sendNotification(
        'AI Response Complete',
        responsePreview,
        {
          osNotification: notificationSettings.osNotifications,
          terminalNotification: notificationSettings.terminalNotifications,
          sound: notificationSettings.sound
        }
      );
    } catch (error) {
      addDebugLog('[useChat] ERROR CAUGHT!');
      addDebugLog(`[useChat] Error: ${error instanceof Error ? error.message : String(error)}`);

      // Don't add error message here - let Chat.tsx handle it
      // Chat.tsx has access to streamParts and will save partial content
      // with appropriate error note

      // Just trigger completion to cleanup UI state
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

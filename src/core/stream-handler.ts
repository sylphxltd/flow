/**
 * Stream Handler
 * Unified stream processing for both headless and TUI modes
 */

import type { StreamChunk } from './ai-sdk.js';
import type { MessagePart, TokenUsage } from '../types/session.types.js';

/**
 * Callbacks for stream events
 */
export interface StreamCallbacks {
  onTextStart?: () => void;
  onTextDelta?: (text: string) => void;
  onTextEnd?: () => void;
  onReasoningStart?: () => void;
  onReasoningDelta?: (text: string) => void;
  onReasoningEnd?: (duration: number) => void;
  onToolCall?: (toolCallId: string, toolName: string, args: unknown) => void;
  onToolInputStart?: (toolCallId: string, toolName: string) => void;
  onToolInputDelta?: (toolCallId: string, toolName: string, argsTextDelta: string) => void;
  onToolInputEnd?: (toolCallId: string, toolName: string, args: unknown) => void;
  onToolResult?: (toolCallId: string, toolName: string, result: unknown, duration: number) => void;
  onToolError?: (toolCallId: string, toolName: string, error: string, duration: number) => void;
  onError?: (error: string) => void;
  onFinish?: (usage: TokenUsage, finishReason: string) => void;
  onComplete?: () => void;
}

/**
 * Stream processing result
 */
export interface StreamResult {
  fullResponse: string;
  messageParts: MessagePart[];
  usage?: TokenUsage;
  finishReason?: string;
}

/**
 * Process AI stream and collect response with parts
 */
export async function processStream(
  stream: AsyncIterable<StreamChunk>,
  callbacks: StreamCallbacks = {}
): Promise<StreamResult> {
  const { onTextStart, onTextDelta, onTextEnd, onReasoningStart, onReasoningDelta, onReasoningEnd, onToolCall, onToolInputStart, onToolInputDelta, onToolInputEnd, onToolResult, onToolError, onError, onFinish, onComplete } = callbacks;

  let fullResponse = '';
  const messageParts: MessagePart[] = [];
  const activeTools = new Map<string, { name: string; startTime: number; args: unknown }>();
  let currentTextContent = '';
  let currentReasoningContent = '';
  let reasoningStartTime: number | null = null;
  let usage: TokenUsage | undefined;
  let finishReason: string | undefined;

  for await (const chunk of stream) {
    switch (chunk.type) {
      case 'text-start': {
        // Text generation started - notify immediately
        onTextStart?.();
        break;
      }

      case 'text-delta': {
        fullResponse += chunk.textDelta;
        currentTextContent += chunk.textDelta;
        onTextDelta?.(chunk.textDelta);
        break;
      }

      case 'text-end': {
        // Text generation finished - save text part if any
        if (currentTextContent) {
          messageParts.push({ type: 'text', content: currentTextContent, status: 'completed' });
          currentTextContent = '';
        }
        onTextEnd?.();
        break;
      }

      case 'reasoning-start': {
        // Save current text part if any
        if (currentTextContent) {
          messageParts.push({ type: 'text', content: currentTextContent, status: 'completed' });
          currentTextContent = '';
        }
        reasoningStartTime = Date.now();
        onReasoningStart?.();
        break;
      }

      case 'reasoning-delta': {
        currentReasoningContent += chunk.textDelta;
        onReasoningDelta?.(chunk.textDelta);
        break;
      }

      case 'reasoning-end': {
        // Save reasoning part with duration
        const duration = reasoningStartTime ? Date.now() - reasoningStartTime : 0;
        if (currentReasoningContent || reasoningStartTime) {
          messageParts.push({
            type: 'reasoning',
            content: currentReasoningContent,
            status: 'completed',  // All saved parts are completed
            duration
          });
          currentReasoningContent = '';
          reasoningStartTime = null;
        }
        // Pass duration to callback so UI can display it
        onReasoningEnd?.(duration);
        break;
      }

      case 'tool-call': {
        // Save current text part if any
        if (currentTextContent) {
          messageParts.push({ type: 'text', content: currentTextContent, status: 'completed' });
          currentTextContent = '';
        }

        // Add tool part (may not have complete args yet if streaming)
        messageParts.push({
          type: 'tool',
          toolId: chunk.toolCallId,
          name: chunk.toolName,
          status: 'active',  // Match MessagePart type
          args: chunk.args,
        });

        // Track tool start time
        activeTools.set(chunk.toolCallId, {
          name: chunk.toolName,
          startTime: Date.now(),
          args: chunk.args,
        });

        onToolCall?.(chunk.toolCallId, chunk.toolName, chunk.args);
        break;
      }

      case 'tool-input-start': {
        // Tool input streaming started - notify callback
        onToolInputStart?.(chunk.toolCallId, chunk.toolName);
        break;
      }

      case 'tool-input-delta': {
        // Update tool args as they stream in
        // Find the active tool part and update its args
        const toolPart = messageParts.find(
          (p) => p.type === 'tool' && p.name === chunk.toolName && p.status === 'active'
        );

        if (toolPart && toolPart.type === 'tool') {
          // Append args delta (args are streaming as JSON text)
          const currentArgsText = typeof toolPart.args === 'string' ? toolPart.args : '';
          toolPart.args = currentArgsText + chunk.argsTextDelta;
        }

        // Notify callback for real-time UI update
        onToolInputDelta?.(chunk.toolCallId, chunk.toolName, chunk.argsTextDelta);
        break;
      }

      case 'tool-input-end': {
        // Tool input streaming complete - args are ready
        // Find tool part to get final args
        const toolPart = messageParts.find(
          (p) => p.type === 'tool' && p.name === chunk.toolName && p.status === 'active'
        );

        if (toolPart && toolPart.type === 'tool') {
          onToolInputEnd?.(chunk.toolCallId, chunk.toolName, toolPart.args);
        }
        break;
      }

      case 'tool-result': {
        const tool = activeTools.get(chunk.toolCallId);
        if (tool) {
          const duration = Date.now() - tool.startTime;
          activeTools.delete(chunk.toolCallId);

          // Update tool part status and result
          const toolPart = messageParts.find(
            (p) => p.type === 'tool' && p.name === chunk.toolName && p.status === 'active'
          );

          if (toolPart && toolPart.type === 'tool') {
            toolPart.status = 'completed';
            toolPart.duration = duration;
            toolPart.result = chunk.result;
          }

          onToolResult?.(chunk.toolCallId, chunk.toolName, chunk.result, duration);
        }
        break;
      }

      case 'tool-error': {
        // Save current text part if any
        if (currentTextContent) {
          messageParts.push({ type: 'text', content: currentTextContent, status: 'completed' });
          currentTextContent = '';
        }

        const tool = activeTools.get(chunk.toolCallId);
        if (tool) {
          const duration = Date.now() - tool.startTime;
          activeTools.delete(chunk.toolCallId);

          // Update tool part status and error
          const toolPart = messageParts.find(
            (p) => p.type === 'tool' && p.name === chunk.toolName && p.status === 'active'
          );

          if (toolPart && toolPart.type === 'tool') {
            toolPart.status = 'error';
            toolPart.duration = duration;
            toolPart.error = chunk.error;
          }

          // Notify callback
          onToolError?.(chunk.toolCallId, chunk.toolName, chunk.error, duration);
        }
        break;
      }

      case 'abort': {
        // Save current text part if any
        if (currentTextContent) {
          messageParts.push({ type: 'text', content: currentTextContent, status: 'completed' });
          currentTextContent = '';
        }

        // Mark all active parts as 'abort'
        messageParts.forEach(part => {
          if (part.status === 'active') {
            part.status = 'abort';
          }
        });

        // Don't add error part - abort is not an error
        break;
      }

      case 'error': {
        // Save current text part if any
        if (currentTextContent) {
          messageParts.push({ type: 'text', content: currentTextContent, status: 'completed' });
          currentTextContent = '';
        }

        // Add error part
        messageParts.push({ type: 'error', error: chunk.error, status: 'completed' });

        // Notify callback
        onError?.(chunk.error);
        break;
      }

      case 'finish': {
        usage = chunk.usage;
        finishReason = chunk.finishReason;
        onFinish?.(chunk.usage, chunk.finishReason);
        break;
      }
    }
  }

  // Save final text part if any
  if (currentTextContent) {
    messageParts.push({ type: 'text', content: currentTextContent, status: 'completed' });
  }

  return {
    fullResponse,
    messageParts,
    usage,
    finishReason,
  };
}

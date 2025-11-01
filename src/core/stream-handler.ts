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
  onTextDelta?: (text: string) => void;
  onReasoningStart?: () => void;
  onReasoningDelta?: (text: string) => void;
  onReasoningEnd?: () => void;
  onToolCall?: (toolCallId: string, toolName: string, args: unknown) => void;
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
  const { onTextDelta, onReasoningStart, onReasoningDelta, onReasoningEnd, onToolCall, onToolResult, onToolError, onError, onFinish, onComplete } = callbacks;

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
      case 'text-delta': {
        fullResponse += chunk.textDelta;
        currentTextContent += chunk.textDelta;
        onTextDelta?.(chunk.textDelta);
        break;
      }

      case 'reasoning-start': {
        // Save current text part if any
        if (currentTextContent) {
          messageParts.push({ type: 'text', content: currentTextContent });
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
        if (currentReasoningContent) {
          const duration = reasoningStartTime ? Date.now() - reasoningStartTime : undefined;
          messageParts.push({
            type: 'reasoning',
            content: currentReasoningContent,
            duration
          });
          currentReasoningContent = '';
          reasoningStartTime = null;
        }
        onReasoningEnd?.();
        break;
      }

      case 'tool-call': {
        // Save current text part if any
        if (currentTextContent) {
          messageParts.push({ type: 'text', content: currentTextContent });
          currentTextContent = '';
        }

        // Add tool part (may not have complete args yet if streaming)
        messageParts.push({
          type: 'tool',
          name: chunk.toolName,
          status: 'running',
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

      case 'tool-call-delta': {
        // Update tool args as they stream in
        // Find the running tool part and update its args
        const toolPart = messageParts.find(
          (p) => p.type === 'tool' && p.name === chunk.toolName && p.status === 'running'
        );

        if (toolPart && toolPart.type === 'tool') {
          // Append args delta (args are streaming as JSON text)
          const currentArgsText = typeof toolPart.args === 'string' ? toolPart.args : '';
          toolPart.args = currentArgsText + chunk.argsTextDelta;
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
            (p) => p.type === 'tool' && p.name === chunk.toolName && p.status === 'running'
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
          messageParts.push({ type: 'text', content: currentTextContent });
          currentTextContent = '';
        }

        const tool = activeTools.get(chunk.toolCallId);
        if (tool) {
          const duration = Date.now() - tool.startTime;
          activeTools.delete(chunk.toolCallId);

          // Update tool part status and error
          const toolPart = messageParts.find(
            (p) => p.type === 'tool' && p.name === chunk.toolName && p.status === 'running'
          );

          if (toolPart && toolPart.type === 'tool') {
            toolPart.status = 'failed';
            toolPart.duration = duration;
            toolPart.error = chunk.error;
          }

          // Notify callback
          onToolError?.(chunk.toolCallId, chunk.toolName, chunk.error, duration);
        }
        break;
      }

      case 'error': {
        // Save current text part if any
        if (currentTextContent) {
          messageParts.push({ type: 'text', content: currentTextContent });
          currentTextContent = '';
        }

        // Add error part
        messageParts.push({ type: 'error', error: chunk.error });

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
    messageParts.push({ type: 'text', content: currentTextContent });
  }

  return {
    fullResponse,
    messageParts,
    usage,
    finishReason,
  };
}

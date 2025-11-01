/**
 * Stream Handler
 * Unified stream processing for both headless and TUI modes
 */

import type { StreamChunk } from './ai-sdk.js';
import type { MessagePart } from '../types/session.types.js';

/**
 * Callbacks for stream events
 */
export interface StreamCallbacks {
  onTextDelta?: (text: string) => void;
  onToolCall?: (toolName: string, args: unknown) => void;
  onToolResult?: (toolName: string, result: unknown, duration: number) => void;
  onComplete?: () => void;
}

/**
 * Stream processing result
 */
export interface StreamResult {
  fullResponse: string;
  messageParts: MessagePart[];
}

/**
 * Process AI stream and collect response with parts
 */
export async function processStream(
  stream: AsyncIterable<StreamChunk>,
  callbacks: StreamCallbacks = {}
): Promise<StreamResult> {
  const { onTextDelta, onToolCall, onToolResult, onComplete } = callbacks;

  let fullResponse = '';
  const messageParts: MessagePart[] = [];
  const activeTools = new Map<string, { name: string; startTime: number; args: unknown }>();
  let currentTextContent = '';

  for await (const chunk of stream) {
    switch (chunk.type) {
      case 'text-delta':
      case 'reasoning-delta': {
        fullResponse += chunk.textDelta;
        currentTextContent += chunk.textDelta;
        onTextDelta?.(chunk.textDelta);
        break;
      }

      case 'tool-call': {
        // Save current text part if any
        if (currentTextContent) {
          messageParts.push({ type: 'text', content: currentTextContent });
          currentTextContent = '';
        }

        // Add tool part
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

        onToolCall?.(chunk.toolName, chunk.args);
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

          onToolResult?.(chunk.toolName, chunk.result, duration);
        }
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
  };
}

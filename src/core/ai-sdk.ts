/**
 * Sylphx Flow AI SDK
 * Unified AI streaming interface with tool support
 * Content parts based design - own type system with proper conversion
 */

import { streamText, stepCountIs } from 'ai';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import { getAISDKTools } from '../tools/index.js';

const SYSTEM_PROMPT = `You are a helpful coding assistant.

You help users with:
- Programming tasks and code review
- Debugging and troubleshooting
- File operations and system tasks
- Software development best practices

Guidelines:
- Write clean, functional, well-documented code
- Use tools proactively when needed to complete tasks
- Explain complex concepts clearly
- Follow language-specific best practices
- Test and verify your work when possible`;

/**
 * Our own Language Model interface
 */
export interface SylphxLanguageModel {
  readonly specificationVersion: string;
  readonly provider: string;
  readonly modelId: string;
}

/**
 * Our own Message interface
 */
export interface SylphxMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Stream chunk types (our own)
 */
export type TextDeltaChunk = {
  type: 'text-delta';
  textDelta: string;
};

export type ReasoningStartChunk = {
  type: 'reasoning-start';
};

export type ReasoningDeltaChunk = {
  type: 'reasoning-delta';
  textDelta: string;
};

export type ReasoningEndChunk = {
  type: 'reasoning-end';
};

export type ToolCallChunk = {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: unknown;
};

export type ToolResultChunk = {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: unknown;
};

export type FinishChunk = {
  type: 'finish';
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export type StreamChunk =
  | TextDeltaChunk
  | ReasoningStartChunk
  | ReasoningDeltaChunk
  | ReasoningEndChunk
  | ToolCallChunk
  | ToolResultChunk
  | FinishChunk;

/**
 * Step info (our own)
 */
export interface StepInfo {
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  text: string;
  toolCalls: Array<{
    toolCallId: string;
    toolName: string;
    args: unknown;
  }>;
  toolResults: Array<{
    toolCallId: string;
    toolName: string;
    result: unknown;
  }>;
}

/**
 * Create AI stream options (our own)
 */
export interface CreateAIStreamOptions {
  model: SylphxLanguageModel | LanguageModelV2;
  messages: SylphxMessage[];
  systemPrompt?: string;
  onStepFinish?: (step: StepInfo) => void;
}

/**
 * Convert our language model to AI SDK format
 * We accept either our interface or the actual LanguageModelV2
 */
function toAISDKModel(model: SylphxLanguageModel | LanguageModelV2): LanguageModelV2 {
  // If it's already a LanguageModelV2, return it
  if ('doStream' in model) {
    return model;
  }
  // Otherwise it's our interface wrapper, cast it
  return model as unknown as LanguageModelV2;
}

/**
 * Convert our messages to AI SDK format
 */
function toAISDKMessages(messages: SylphxMessage[]) {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Create AI stream with Sylphx tools pre-configured
 */
export async function* createAIStream(
  options: CreateAIStreamOptions
): AsyncIterable<StreamChunk> {
  const { systemPrompt = SYSTEM_PROMPT, model, messages, onStepFinish } = options;

  // Convert our types to AI SDK types
  const aiModel = toAISDKModel(model);
  const aiMessages = toAISDKMessages(messages);

  // Call AI SDK - errors from the API call will propagate naturally
  const result = streamText({
    model: aiModel,
    messages: aiMessages,
    system: systemPrompt,
    tools: getAISDKTools(),
    stopWhen: stepCountIs(1000),
    onError: (_) => {
      return;
    },
    ...(onStepFinish && {
      onStepFinish: (step) => {
        const usage = step.usage;
        onStepFinish({
          finishReason: step.finishReason,
          usage: {
            promptTokens: usage.inputTokens ?? 0,
            completionTokens: usage.outputTokens ?? 0,
            totalTokens: usage.totalTokens ?? 0,
          },
          text: step.text ?? '',
          toolCalls: (step.toolCalls ?? []).map((call) => ({
            toolCallId: call.toolCallId,
            toolName: call.toolName,
            args: call.input,
          })),
          toolResults: (step.toolResults ?? []).map((result) => ({
            toolCallId: result.toolCallId,
            toolName: result.toolName,
            result: result.output,
          })),
        });
      },
    }),
  });

  // Destructure to get fullStream
  const { fullStream } = result;

  // Convert AI SDK chunks to our chunk format
  // Handle all chunk types to ensure proper error flow
  for await (const chunk of fullStream) {
    switch (chunk.type) {
      case 'text-delta':
        yield {
          type: 'text-delta',
          textDelta: chunk.text,
        };
        break;

      case 'reasoning-start':
        yield {
          type: 'reasoning-start',
        };
        break;

      case 'reasoning-delta':
        yield {
          type: 'reasoning-delta',
          textDelta: chunk.text,
        };
        break;

      case 'reasoning-end':
        yield {
          type: 'reasoning-end',
        };
        break;

      case 'tool-call':
        yield {
          type: 'tool-call',
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          args: chunk.input,
        };
        break;

      case 'tool-result':
        yield {
          type: 'tool-result',
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          result: chunk.output,
        };
        break;

      case 'finish':
        // Final usage statistics
        yield {
          type: 'finish',
          finishReason: chunk.finishReason,
          usage: {
            promptTokens: chunk.totalUsage.inputTokens ?? 0,
            completionTokens: chunk.totalUsage.outputTokens ?? 0,
            totalTokens: chunk.totalUsage.totalTokens ?? 0,
          },
        };
        break;

      case 'error':
        // Stream error - throw to propagate to caller's try-catch
        throw chunk.error instanceof Error ? chunk.error : new Error(String(chunk.error));

      case 'tool-error':
        // Tool execution error - throw to propagate to caller's try-catch
        throw chunk.error instanceof Error ? chunk.error : new Error(`Tool error: ${String(chunk.error)}`);

      case 'abort':
        // Stream aborted - throw to propagate to caller's try-catch
        throw new Error('Stream aborted');

      // Ignore other chunk types (text-start, text-end, etc.)
      // They don't affect our streaming output
      default:
        break;
    }
  }
}

/**
 * Export system prompt and tools getter
 */
export { SYSTEM_PROMPT, getAISDKTools };

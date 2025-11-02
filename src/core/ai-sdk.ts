/**
 * Sylphx Flow AI SDK
 * Unified AI streaming interface with tool support
 * Content parts based design - own type system with proper conversion
 */

import { streamText, stepCountIs } from 'ai';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import * as os from 'node:os';
import { getAISDKTools } from '../tools/index.js';
import { getCurrentSystemPrompt } from './agent-manager.js';
import { getEnabledRulesContent } from './rule-manager.js';
import { useAppStore } from '../ui/stores/app-store.js';
import { buildTodoContext } from '../utils/todo-context.js';

// Legacy system prompt - kept for backwards compatibility and fallback
const LEGACY_SYSTEM_PROMPT = `You are a helpful coding assistant.

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
 * Base system prompt - introduces Sylphx
 */
const BASE_SYSTEM_PROMPT = `You are Sylphx, an AI development assistant.`;

/**
 * Get the system prompt to use (combines base + rules + agent)
 */
export function getSystemPrompt(): string {
  const parts: string[] = [];

  // 1. Base prompt (introduces Sylphx)
  parts.push(BASE_SYSTEM_PROMPT);

  // 2. Enabled rules (shared across all agents)
  try {
    const rulesContent = getEnabledRulesContent();
    if (rulesContent) {
      parts.push(rulesContent);
    }
  } catch {
    // Rule manager not initialized or no rules enabled
  }

  // 3. Agent-specific prompt
  try {
    const agentPrompt = getCurrentSystemPrompt();
    parts.push(agentPrompt);
  } catch {
    // Fallback to legacy if agent manager not initialized
    parts.push(LEGACY_SYSTEM_PROMPT);
  }

  return parts.join('\n\n');
}

// Export for backwards compatibility
export const SYSTEM_PROMPT = LEGACY_SYSTEM_PROMPT;

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
 * Content Part Types - Our own type system
 */
export interface TextPart {
  type: 'text';
  text: string;
}

export interface FilePart {
  type: 'file';
  name: string;
  mimeType: string;
  data: string; // base64 or URL
}

export interface ReasoningPart {
  type: 'reasoning';
  reasoning: string;
}

export interface SourcePart {
  type: 'source';
  name: string;
  content: string;
}

export interface ToolCallPart {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: unknown;
}

export interface ToolResultPart {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: unknown;
}

export interface ToolErrorPart {
  type: 'tool-error';
  toolCallId: string;
  toolName: string;
  error: string;
}

/**
 * Content part types - all possible parts in LLM response
 */
export type ContentPart =
  | TextPart
  | FilePart
  | ReasoningPart
  | SourcePart
  | ToolCallPart
  | ToolResultPart
  | ToolErrorPart;

/**
 * Stream chunk types (our own)
 */
export type TextStartChunk = {
  type: 'text-start';
};

export type TextDeltaChunk = {
  type: 'text-delta';
  textDelta: string;
};

export type TextEndChunk = {
  type: 'text-end';
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

export type ToolInputStartChunk = {
  type: 'tool-input-start';
  toolCallId: string;
  toolName: string;
};

export type ToolInputDeltaChunk = {
  type: 'tool-input-delta';
  toolCallId: string;
  argsTextDelta: string;
};

export type ToolInputEndChunk = {
  type: 'tool-input-end';
  toolCallId: string;
};

export type ToolResultChunk = {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: unknown;
};

export type ToolErrorChunk = {
  type: 'tool-error';
  toolCallId: string;
  toolName: string;
  error: string;
};

export type StreamErrorChunk = {
  type: 'error';
  error: string;
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
  | TextStartChunk
  | TextDeltaChunk
  | TextEndChunk
  | ReasoningStartChunk
  | ReasoningDeltaChunk
  | ReasoningEndChunk
  | ToolCallChunk
  | ToolInputStartChunk
  | ToolInputDeltaChunk
  | ToolInputEndChunk
  | ToolResultChunk
  | ToolErrorChunk
  | StreamErrorChunk
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
  content: ContentPart[];
}

/**
 * Extended message with timestamp
 */
export interface TimestampedMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: any;
  timestamp?: string;
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
 * Get system status for context injection
 */
function getSystemStatus(): string {
  const timestamp = new Date().toISOString();

  // Get memory usage
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsageGB = (usedMem / 1024 / 1024 / 1024).toFixed(1);
  const totalMemGB = (totalMem / 1024 / 1024 / 1024).toFixed(1);

  // Get CPU usage (average load)
  const cpus = os.cpus();
  const cpuCount = cpus.length;

  // Calculate average CPU usage from all cores
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  });

  const cpuUsage = (100 - (100 * totalIdle) / totalTick).toFixed(1);

  return `<system_status>
Time: ${timestamp}
CPU: ${cpuUsage}% (${cpuCount} cores)
Memory: ${memUsageGB}GB/${totalMemGB}GB
</system_status>`;
}

/**
 * Inject system status into tool result output
 * Convert all types to content type and prepend system status as text part
 */
function injectSystemStatusToOutput(output: any, systemStatus: string): any {
  if (!output || typeof output !== 'object') {
    return output;
  }

  // Convert to content type if not already
  let contentValue: any[];

  if (output.type === 'content') {
    // Already content type
    contentValue = output.value;
  } else if (output.type === 'text' || output.type === 'error-text') {
    // Convert text to content
    contentValue = [
      {
        type: 'text',
        text: output.value,
      },
    ];
  } else if (output.type === 'json' || output.type === 'error-json') {
    // Convert JSON to content (stringify)
    contentValue = [
      {
        type: 'text',
        text: JSON.stringify(output.value, null, 2),
      },
    ];
  } else {
    // Unknown type, keep as is
    return output;
  }

  // Prepend system status as text part
  return {
    type: 'content',
    value: [
      {
        type: 'text',
        text: systemStatus,
      },
      ...contentValue,
    ],
  };
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
 * Convert AI SDK content to our ContentPart types
 */
function fromAISDKContent(aiContent: any[]): ContentPart[] {
  return aiContent.map((part: any): ContentPart => {
    switch (part.type) {
      case 'text':
        return {
          type: 'text',
          text: part.text,
        };

      case 'file':
        return {
          type: 'file',
          name: part.file?.name || 'unknown',
          mimeType: part.file?.mimeType || 'application/octet-stream',
          data: part.file?.data || '',
        };

      case 'reasoning':
        return {
          type: 'reasoning',
          reasoning: part.reasoning || part.text || '',
        };

      case 'source':
        return {
          type: 'source',
          name: part.name || 'unknown',
          content: part.content || '',
        };

      case 'tool-call':
        return {
          type: 'tool-call',
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          args: part.args || part.input,
        };

      case 'tool-result':
        return {
          type: 'tool-result',
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          result: part.result || part.output,
        };

      case 'tool-error':
        return {
          type: 'tool-error',
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          error: part.error instanceof Error ? part.error.message : String(part.error),
        };

      default:
        // Fallback: treat unknown parts as text
        return {
          type: 'text',
          text: JSON.stringify(part),
        };
    }
  });
}

/**
 * Create AI stream with Sylphx tools pre-configured
 * Uses manual loop to control message history with timestamps
 */
export async function* createAIStream(
  options: CreateAIStreamOptions
): AsyncIterable<StreamChunk> {
  const { systemPrompt = getSystemPrompt(), model, messages: initialMessages, onStepFinish } = options;

  // Convert our types to AI SDK types
  const aiModel = toAISDKModel(model);

  // Message history that we control - add system status to initial messages
  const systemStatus = getSystemStatus();
  const messageHistory: any[] = toAISDKMessages(initialMessages).map((msg: any) => {
    if (msg.role === 'user') {
      // Convert content to array format and prepend system status
      let contentArray: any[];

      if (typeof msg.content === 'string') {
        // Convert string to TextPart array
        contentArray = [
          {
            type: 'text',
            text: msg.content,
          },
        ];
      } else {
        // Already array (TextPart | ImagePart | FilePart)
        contentArray = msg.content;
      }

      // Prepend system status as TextPart
      return {
        ...msg,
        content: [
          {
            type: 'text',
            text: systemStatus,
          },
          ...contentArray,
        ],
      };
    }
    return msg;
  });

  let stepNumber = 0;
  const MAX_STEPS = 1000;

  while (stepNumber < MAX_STEPS) {
    // Emit step-start event
    yield {
      type: 'step-start' as any,
      stepNumber,
    };
    // Get current todos and build context
    const todos = useAppStore.getState().todos;
    const todoContext = buildTodoContext(todos);

    // Temporarily inject todo context (not saved to history)
    const messagesWithContext = [
      ...messageHistory,
      {
        role: 'system' as const,
        content: [
          {
            type: 'text',
            text: todoContext,
          },
        ],
      },
    ];

    // Call AI SDK with single step
    const { fullStream, response, finishReason, usage, toolCalls, toolResults, content } = streamText({
      model: aiModel,
      messages: messagesWithContext,
      system: systemPrompt,
      tools: getAISDKTools(),
      onError: (_) => {
        return;
      },
    });

    // Stream all chunks to user
    for await (const chunk of fullStream) {
      switch (chunk.type) {
        case 'text-start':
          yield { type: 'text-start' };
          break;

        case 'text-delta':
          yield { type: 'text-delta', textDelta: chunk.text };
          break;

        case 'text-end':
          yield { type: 'text-end' };
          break;

        case 'reasoning-start':
          yield { type: 'reasoning-start' };
          break;

        case 'reasoning-delta':
          yield { type: 'reasoning-delta', textDelta: chunk.text };
          break;

        case 'reasoning-end':
          yield { type: 'reasoning-end' };
          break;

        case 'tool-call':
          yield {
            type: 'tool-call',
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            args: chunk.input,
          };
          break;

        case 'tool-input-start':
          yield {
            type: 'tool-input-start',
            toolCallId: chunk.id,
            toolName: chunk.toolName,
          };
          break;

        case 'tool-input-delta':
          yield {
            type: 'tool-input-delta',
            toolCallId: chunk.id,
            argsTextDelta: chunk.delta,
          };
          break;

        case 'tool-input-end':
          yield {
            type: 'tool-input-end',
            toolCallId: chunk.id,
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
          yield {
            type: 'error',
            error: chunk.error instanceof Error ? chunk.error.message : String(chunk.error),
          };
          break;

        case 'tool-error':
          yield {
            type: 'tool-error',
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            error: chunk.error instanceof Error ? chunk.error.message : String(chunk.error),
          };
          break;

        case 'abort':
          yield {
            type: 'error',
            error: 'Stream aborted',
          };
          break;

        default:
          break;
      }
    }

    // Call onStepFinish callback if provided
    if (onStepFinish) {
      const stepInfo: StepInfo = {
        finishReason: await finishReason,
        usage: {
          promptTokens: (await usage).inputTokens ?? 0,
          completionTokens: (await usage).outputTokens ?? 0,
          totalTokens: (await usage).totalTokens ?? 0,
        },
        content: fromAISDKContent(await content),
      };
      onStepFinish(stepInfo);
    }

    // Save LLM response messages to history (with system status)
    const stepSystemStatus = getSystemStatus();
    const responseMessages = (await response).messages;

    for (const msg of responseMessages) {
      // Add system status (timestamp, CPU, memory) to tool messages
      if (msg.role === 'tool') {
        messageHistory.push({
          ...msg,
          content: msg.content.map((part: any) => ({
            ...part,
            output: injectSystemStatusToOutput(part.output, stepSystemStatus),
          })),
        });
      } else {
        messageHistory.push(msg);
      }
    }

    const currentFinishReason = await finishReason;

    // Emit step-end event
    yield {
      type: 'step-end' as any,
      stepNumber,
      finishReason: currentFinishReason,
    };

    // Check if we should continue the loop
    if (currentFinishReason !== 'tool-calls') {
      // No more tool calls, exit loop
      break;
    }

    stepNumber++;
  }
}

/**
 * Export tools getter for backwards compatibility
 * SYSTEM_PROMPT and getSystemPrompt are exported earlier in the file
 */
export { getAISDKTools };

/**
 * Sylphx Flow AI SDK
 * Unified AI streaming interface with tool support
 * Content parts based design - own type system with proper conversion
 */

import { streamText, stepCountIs, type UserContent, type AssistantContent, type DataContent, type ModelMessage } from 'ai';
import type { LanguageModelV2, LanguageModelV2ToolResultOutput } from '@ai-sdk/provider';
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
  content: AssistantContent[];
}

/**
 * Create AI stream options
 */
export interface CreateAIStreamOptions {
  model: LanguageModelV2;
  messages: ModelMessage[];
  systemPrompt?: string;
  onStepFinish?: (step: StepInfo) => void;
  /**
   * Called before each step to prepare messages
   * Can be used to inject context (e.g., todo list, system status)
   * @param messages - Current message history
   * @param stepNumber - Current step number
   * @returns Modified messages array
   */
  onPrepareMessages?: (messages: ModelMessage[], stepNumber: number) => ModelMessage[];
  /**
   * Called to transform tool result output before saving to history
   * Can be used to inject metadata (e.g., system status, timestamp)
   * @param output - Tool result output
   * @param toolName - Name of the tool
   * @returns Modified output
   */
  onTransformToolResult?: (
    output: LanguageModelV2ToolResultOutput,
    toolName: string
  ) => LanguageModelV2ToolResultOutput;
}

/**
 * System status object (captured at message creation time)
 *
 * Design: Separation of capture vs construction
 * ==============================================
 *
 * Why we have TWO functions (getSystemStatus + buildSystemStatusFromMetadata):
 *
 * 1. getSystemStatus() - Captures CURRENT system state
 *    - Called when creating a NEW message
 *    - Returns object { timestamp, cpu, memory }
 *    - Stored in SessionMessage.metadata
 *    - NEVER called again for historical messages
 *
 * 2. buildSystemStatusFromMetadata() - Constructs string from STORED values
 *    - Called when building ModelMessage from SessionMessage
 *    - Uses HISTORICAL values from metadata (never current values)
 *    - Ensures prompt cache works (historical messages never change)
 *
 * ⚠️ CRITICAL for prompt cache:
 * - Historical messages must be IMMUTABLE
 * - If we use current values, messages change every request → cache miss
 * - Using stored metadata values → messages stay same → cache hit ✅
 *
 * Example timeline:
 * T1: User sends "hi"
 *     → getSystemStatus() returns { cpu: "45%", memory: "4.2GB" }
 *     → Store in message.metadata
 * T2: User sends "bye" (10 minutes later)
 *     → getSystemStatus() returns { cpu: "67%", memory: "5.1GB" } for NEW message
 *     → buildSystemStatusFromMetadata(T1.metadata) still returns "45%, 4.2GB" for T1 ✅
 *     → Prompt cache recognizes T1 message as unchanged → cache hit!
 */
export interface SystemStatus {
  timestamp: string;  // ISO format
  cpu: string;        // e.g., "45.3% (8 cores)"
  memory: string;     // e.g., "4.2GB/16.0GB"
}

/**
 * Get CURRENT system status (called only when creating NEW messages)
 *
 * ⚠️ IMPORTANT: Never call this for historical messages!
 * Use buildSystemStatusFromMetadata() instead to preserve prompt cache.
 */
function getSystemStatus(): SystemStatus {
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

  return {
    timestamp,
    cpu: `${cpuUsage}% (${cpuCount} cores)`,
    memory: `${memUsageGB}GB/${totalMemGB}GB`,
  };
}

/**
 * Build system status string from STORED metadata (not current values)
 *
 * ⚠️ CRITICAL: This function MUST use the metadata parameter values,
 * NEVER call getSystemStatus() or use current system values!
 *
 * Why: Prompt cache requires historical messages to be immutable.
 * Using stored metadata ensures the same message always produces the same output.
 *
 * Called by:
 * - useChat when building ModelMessage from SessionMessage (historical messages)
 * - Tool result injection (for current step's system status)
 *
 * @param metadata - Stored SystemStatus from SessionMessage.metadata
 * @returns Formatted system status string for LLM
 */
function buildSystemStatusFromMetadata(metadata: SystemStatus): string {
  return `<system_status>
Time: ${metadata.timestamp}
CPU: ${metadata.cpu}
Memory: ${metadata.memory}
</system_status>`;
}

/**
 * Inject system status into tool result output
 * Convert all types to content type and prepend system status as text part
 */
function injectSystemStatusToOutput(output: LanguageModelV2ToolResultOutput, systemStatus: SystemStatus): Extract<
  LanguageModelV2ToolResultOutput,
  { type: 'content' }
> {
  if (!output || typeof output !== 'object') {
    return output;
  }

  // Convert to content type if not already
  const content: Extract<
    LanguageModelV2ToolResultOutput,
    { type: 'content' }
  > = {
    type: 'content',
    value: [],
  }

  if (output.type === 'content') {
    // Already content type
    content.value = output.value;
  } else if (output.type === 'text' || output.type === 'error-text') {
    content.value.push({
        type: 'text',
        text: output.value,
    });
  } else if (output.type === 'json' || output.type === 'error-json') {
    // Convert JSON to content (stringify)
    content.value.push({
        type: 'text',
        text: JSON.stringify(output.value, null, 2),
    });
  }

  // Prepend system status as text part
  const systemStatusString = buildSystemStatusFromMetadata(systemStatus);

  content.value.unshift({
      type: 'text',
      text: systemStatusString,
  })
  return content;
}

/**
 * Normalize content to modern array format
 * Converts legacy string content to Array<TextPart | ImagePart | FilePart | ... >
 */
function normalizeMessage(message: ModelMessage): ModelMessage {
  const content = message.content;
  if (typeof content === 'string') {
    // Legacy string format → convert to TextPart array
    message.content =  [
      {
        type: 'text',
        text: content,
      },
    ];
  }

  // Already array format (or other object)
  return message;
}

/**
 * Create AI stream with Sylphx tools pre-configured
 * Uses manual loop to control message history with timestamps
 */
export async function* createAIStream(
  options: CreateAIStreamOptions
): AsyncIterable<StreamChunk> {
  const {
    systemPrompt = getSystemPrompt(),
    model,
    messages: initialMessages,
    onStepFinish,
    onPrepareMessages,
    onTransformToolResult,
  } = options;

  // Normalize all messages to array format
  let messageHistory = initialMessages.map(normalizeMessage);

  let stepNumber = 0;
  const MAX_STEPS = 1000;

  while (stepNumber < MAX_STEPS) {
    // Emit step-start event
    yield {
      type: 'step-start' as any,
      stepNumber,
    };

    // Prepare messages for this step (caller can inject context)
    const preparedMessages = onPrepareMessages
      ? onPrepareMessages(messageHistory, stepNumber)
      : messageHistory;

    // Call AI SDK with single step
    const { fullStream, response, finishReason, usage, content } = streamText({
      model,
      messages: preparedMessages,
      system: systemPrompt,
      tools: getAISDKTools(),
      // Don't handle errors here - let them propagate to the caller
      // onError callback is for non-fatal errors, fatal ones should throw
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
        content: await content,
      };
      onStepFinish(stepInfo);
    }

    // Save LLM response messages to history
    const responseMessages = (await response).messages;

    for (const msg of responseMessages) {
      // Transform tool result output if callback provided
      if (msg.role === 'tool' && onTransformToolResult) {
        messageHistory.push({
          ...msg,
          content: msg.content.map((part) => ({
            ...part,
            output: onTransformToolResult(part.output, part.toolName),
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
 * Export helper functions
 */
export { getAISDKTools, getSystemStatus, buildSystemStatusFromMetadata, injectSystemStatusToOutput, buildTodoContext, normalizeMessage };

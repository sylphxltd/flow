/**
 * Sylphx Flow AI SDK
 * Unified AI streaming interface with tool support
 * Content parts based design - own type system with proper conversion
 */
import { type AssistantContent, type ModelMessage } from 'ai';
import type { LanguageModelV2, LanguageModelV2ToolResultOutput } from '@ai-sdk/provider';
import { getAISDKTools } from '../tools/index.js';
import { buildTodoContext } from '../utils/todo-context.js';
/**
 * Get the system prompt to use (combines base + rules + agent)
 */
export declare function getSystemPrompt(): string;
export declare const SYSTEM_PROMPT = "You are a helpful coding assistant.\n\nYou help users with:\n- Programming tasks and code review\n- Debugging and troubleshooting\n- File operations and system tasks\n- Software development best practices\n\nGuidelines:\n- Write clean, functional, well-documented code\n- Use tools proactively when needed to complete tasks\n- Explain complex concepts clearly\n- Follow language-specific best practices\n- Test and verify your work when possible";
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
export type AbortChunk = {
    type: 'abort';
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
export type StreamChunk = TextStartChunk | TextDeltaChunk | TextEndChunk | ReasoningStartChunk | ReasoningDeltaChunk | ReasoningEndChunk | ToolCallChunk | ToolInputStartChunk | ToolInputDeltaChunk | ToolInputEndChunk | ToolResultChunk | ToolErrorChunk | StreamErrorChunk | AbortChunk | FinishChunk;
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
    /**
     * Optional abort signal to cancel the stream
     */
    abortSignal?: AbortSignal;
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
    onTransformToolResult?: (output: LanguageModelV2ToolResultOutput, toolName: string) => LanguageModelV2ToolResultOutput;
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
    timestamp: string;
    cpu: string;
    memory: string;
}
/**
 * Get CURRENT system status (called only when creating NEW messages)
 *
 * ⚠️ IMPORTANT: Never call this for historical messages!
 * Use buildSystemStatusFromMetadata() instead to preserve prompt cache.
 */
declare function getSystemStatus(): SystemStatus;
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
declare function buildSystemStatusFromMetadata(metadata: SystemStatus): string;
/**
 * Inject system status into tool result output
 * Convert all types to content type and prepend system status as text part
 */
declare function injectSystemStatusToOutput(output: LanguageModelV2ToolResultOutput, systemStatus: SystemStatus): Extract<LanguageModelV2ToolResultOutput, {
    type: 'content';
}>;
/**
 * Normalize content to modern array format
 * Converts legacy string content to Array<TextPart | ImagePart | FilePart | ... >
 */
declare function normalizeMessage(message: ModelMessage): ModelMessage;
/**
 * Create AI stream with Sylphx tools pre-configured
 * Uses manual loop to control message history with timestamps
 */
export declare function createAIStream(options: CreateAIStreamOptions): AsyncIterable<StreamChunk>;
/**
 * Export helper functions
 */
export { getAISDKTools, getSystemStatus, buildSystemStatusFromMetadata, injectSystemStatusToOutput, buildTodoContext, normalizeMessage };
//# sourceMappingURL=ai-sdk.d.ts.map
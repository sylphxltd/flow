/**
 * Sylphx Flow AI SDK
 * Unified AI streaming interface with tool support
 * Content parts based design - own type system with proper conversion
 */
import { streamText } from 'ai';
import * as os from 'node:os';
import { getAISDKTools } from '../tools/index.js';
import { hasUserInputHandler } from '../tools/interaction.js';
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
 * @deprecated Use buildSystemPrompt(agentId) instead for stateless architecture
 */
export function getSystemPrompt() {
    // Fallback to legacy for backwards compatibility
    // New code should use buildSystemPrompt(agentId) from system-prompt-builder.ts
    return LEGACY_SYSTEM_PROMPT;
}
// Export for backwards compatibility
export const SYSTEM_PROMPT = LEGACY_SYSTEM_PROMPT;
/**
 * Get CURRENT system status (called only when creating NEW messages)
 *
 * ⚠️ IMPORTANT: Never call this for historical messages!
 * Use buildSystemStatusFromMetadata() instead to preserve prompt cache.
 */
function getSystemStatus() {
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
            totalTick += cpu.times[type];
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
function buildSystemStatusFromMetadata(metadata) {
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
function injectSystemStatusToOutput(output, systemStatus) {
    if (!output || typeof output !== 'object') {
        return output;
    }
    // Convert to content type if not already
    const content = {
        type: 'content',
        value: [],
    };
    if (output.type === 'content') {
        // Already content type
        content.value = output.value;
    }
    else if (output.type === 'text' || output.type === 'error-text') {
        content.value.push({
            type: 'text',
            text: output.value,
        });
    }
    else if (output.type === 'json' || output.type === 'error-json') {
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
    });
    return content;
}
/**
 * Normalize content to modern array format
 * Converts legacy string content to Array<TextPart | ImagePart | FilePart | ... >
 */
function normalizeMessage(message) {
    const content = message.content;
    if (typeof content === 'string') {
        // Legacy string format → convert to TextPart array
        message.content = [
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
export async function* createAIStream(options) {
    const { systemPrompt = getSystemPrompt(), model, messages: initialMessages, abortSignal, onStepFinish, onPrepareMessages, onTransformToolResult, } = options;
    // Normalize all messages to array format
    let messageHistory = initialMessages.map(normalizeMessage);
    let stepNumber = 0;
    const MAX_STEPS = 1000;
    while (stepNumber < MAX_STEPS) {
        // Emit step-start event
        yield {
            type: 'step-start',
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
            tools: getAISDKTools({ interactive: hasUserInputHandler() }),
            // Only pass abortSignal if provided (exactOptionalPropertyTypes compliance)
            ...(abortSignal ? { abortSignal } : {}),
            // Don't handle errors here - let them propagate to the caller
            // onError callback is for non-fatal errors, fatal ones should throw
        });
        // Stream all chunks to user
        for await (const chunk of fullStream) {
            // DEBUG: Log every chunk
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
                        type: 'abort',
                    };
                    break;
                default:
                    break;
            }
        }
        // Call onStepFinish callback if provided
        if (onStepFinish) {
            const stepInfo = {
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
            }
            else {
                messageHistory.push(msg);
            }
        }
        const currentFinishReason = await finishReason;
        // Emit step-end event
        yield {
            type: 'step-end',
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
//# sourceMappingURL=ai-sdk.js.map
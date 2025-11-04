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
    onAbort?: () => void;
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
export declare function processStream(stream: AsyncIterable<StreamChunk>, callbacks?: StreamCallbacks): Promise<StreamResult>;
//# sourceMappingURL=stream-handler.d.ts.map
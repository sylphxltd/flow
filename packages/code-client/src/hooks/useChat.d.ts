/**
 * Chat Hook
 * Handle AI chat with streaming support and tool execution
 */
import { type FileAttachment, type TokenUsage } from '@sylphx/code-core';
import { type UserInputRequest } from '@sylphx/code-core';
/**
 * Options for sending a message
 */
export interface SendMessageOptions {
    attachments?: FileAttachment[];
    abortSignal?: AbortSignal;
    onComplete?: () => void;
    onAbort?: () => void;
    onError?: (error: string) => void;
    onFinish?: (usage: TokenUsage, finishReason: string) => void;
    onToolCall?: (toolCallId: string, toolName: string, args: unknown) => void;
    onToolResult?: (toolCallId: string, toolName: string, result: unknown, duration: number) => void;
    onToolInputStart?: (toolCallId: string, toolName: string) => void;
    onToolInputDelta?: (toolCallId: string, toolName: string, argsTextDelta: string) => void;
    onToolInputEnd?: (toolCallId: string, toolName: string, args: unknown) => void;
    onToolError?: (toolCallId: string, toolName: string, error: string, duration: number) => void;
    onReasoningStart?: () => void;
    onReasoningDelta?: (text: string) => void;
    onReasoningEnd?: (duration: number) => void;
    onTextStart?: () => void;
    onTextDelta?: (text: string) => void;
    onTextEnd?: () => void;
    onUserInputRequest?: (request: UserInputRequest) => Promise<string>;
}
export declare function useChat(): {
    sendMessage: (message: string, options: SendMessageOptions) => Promise<void>;
    currentSession: import("@sylphx/code-core").Session | null;
};
//# sourceMappingURL=useChat.d.ts.map
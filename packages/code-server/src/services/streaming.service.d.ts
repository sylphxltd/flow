/**
 * Streaming Service
 * Backend service for AI streaming - used by tRPC subscription
 *
 * Architecture:
 * - Loads session data from database
 * - Builds message context for AI
 * - Streams AI response
 * - Saves results to database
 * - Emits events to subscription observer
 *
 * This service is called by message.streamResponse subscription procedure
 */
import type { SessionRepository } from '@sylphx/code-core';
import type { AIConfig } from '@sylphx/code-core';
import type { FileAttachment, TokenUsage } from '@sylphx/code-core';
export type StreamEvent = {
    type: 'session-created';
    sessionId: string;
    provider: string;
    model: string;
} | {
    type: 'session-title-start';
} | {
    type: 'session-title-delta';
    text: string;
} | {
    type: 'session-title-complete';
    title: string;
} | {
    type: 'assistant-message-created';
    messageId: string;
} | {
    type: 'text-start';
} | {
    type: 'text-delta';
    text: string;
} | {
    type: 'text-end';
} | {
    type: 'reasoning-start';
} | {
    type: 'reasoning-delta';
    text: string;
} | {
    type: 'reasoning-end';
    duration: number;
} | {
    type: 'tool-call';
    toolCallId: string;
    toolName: string;
    args: any;
} | {
    type: 'tool-result';
    toolCallId: string;
    toolName: string;
    result: any;
    duration: number;
} | {
    type: 'tool-error';
    toolCallId: string;
    toolName: string;
    error: string;
    duration: number;
} | {
    type: 'complete';
    usage?: TokenUsage;
    finishReason?: string;
} | {
    type: 'error';
    error: string;
} | {
    type: 'abort';
};
export interface StreamAIResponseOptions {
    sessionRepository: SessionRepository;
    aiConfig: AIConfig;
    sessionId: string | null;
    provider?: string;
    model?: string;
    userMessage: string;
    attachments?: FileAttachment[];
    abortSignal?: AbortSignal;
}
/**
 * Stream AI response as Observable<StreamEvent>
 *
 * This function:
 * 1. Loads session from database
 * 2. Adds user message to session
 * 3. Builds message context for AI
 * 4. Streams AI response
 * 5. Emits events to observer
 * 6. Saves final result to database
 */
export declare function streamAIResponse(opts: StreamAIResponseOptions): import("@trpc/server/observable").Observable<StreamEvent, unknown>;
//# sourceMappingURL=streaming.service.d.ts.map
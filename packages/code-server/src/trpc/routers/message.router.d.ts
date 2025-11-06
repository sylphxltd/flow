/**
 * Message Router
 * Efficient message operations with lazy loading and streaming support
 * REACTIVE: Emits events for all state changes
 * SECURITY: Protected mutations (OWASP API2) + Rate limiting (OWASP API4)
 */
import { z } from 'zod';
declare const StreamEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"session-created">;
    sessionId: z.ZodString;
    provider: z.ZodString;
    model: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"session-title-start">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"session-title-delta">;
    text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"session-title-complete">;
    title: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"assistant-message-created">;
    messageId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"text-start">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"text-delta">;
    text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"text-end">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"reasoning-start">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"reasoning-delta">;
    text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"reasoning-end">;
    duration: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"tool-call">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    args: z.ZodAny;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"tool-result">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    result: z.ZodAny;
    duration: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"tool-error">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    error: z.ZodString;
    duration: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"complete">;
    usage: z.ZodOptional<z.ZodObject<{
        promptTokens: z.ZodNumber;
        completionTokens: z.ZodNumber;
        totalTokens: z.ZodNumber;
    }, z.core.$strip>>;
    finishReason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"error">;
    error: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"abort">;
}, z.core.$strip>], "type">;
export type StreamEvent = z.infer<typeof StreamEventSchema>;
export declare const messageRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Get messages for session (cursor-based pagination)
     * DATA ON DEMAND: Fetch only needed messages, not entire history
     * CURSOR-BASED PAGINATION: Use timestamp as cursor for efficient pagination
     *
     * Usage: For infinite scroll, lazy loading, chat history
     */
    getBySession: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            sessionId: string;
            limit?: number | undefined;
            cursor?: number | undefined;
        };
        output: {
            messages: import("@sylphx/code-core").SessionMessage[];
            nextCursor: number | null;
        };
        meta: object;
    }>;
    /**
     * Get message count for session
     * EFFICIENT: Count only, no data loading
     */
    getCount: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            sessionId: string;
        };
        output: number;
        meta: object;
    }>;
    /**
     * Add message to session
     * Used for both user messages and assistant messages
     * AUTO-CREATE: If sessionId is null, creates new session with provider/model
     * REACTIVE: Emits message-added event (and session-created if new)
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    add: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            role: "assistant" | "user";
            content: ({
                type: "text";
                content: string;
            } | {
                type: "tool-use";
                toolUseId: string;
                toolName: string;
                toolInput: any;
            } | {
                type: "tool-result";
                toolUseId: string;
                toolName: string;
                content: string;
                isError?: boolean | undefined;
            } | {
                type: "reasoning";
                reasoning: string;
            })[];
            sessionId?: string | null | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            agentId?: string | undefined;
            attachments?: {
                path: string;
                relativePath: string;
                size?: number | undefined;
            }[] | undefined;
            usage?: {
                promptTokens: number;
                completionTokens: number;
                totalTokens: number;
            } | undefined;
            finishReason?: string | undefined;
            metadata?: {
                agentId?: string | undefined;
                ruleIds?: string[] | undefined;
                isCommandExecution?: boolean | undefined;
            } | undefined;
            todoSnapshot?: {
                id: number;
                content: string;
                activeForm: string;
                status: "pending" | "in_progress" | "completed";
                ordering: number;
            }[] | undefined;
            status?: "error" | "abort" | "completed" | "active" | undefined;
        };
        output: {
            messageId: string;
            sessionId: string;
        };
        meta: object;
    }>;
    /**
     * Update message parts (during streaming)
     * Replaces all parts atomically
     * REACTIVE: Emits message-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateParts: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            messageId: string;
            parts: ({
                type: "text";
                content: string;
            } | {
                type: "tool-use";
                toolUseId: string;
                toolName: string;
                toolInput: any;
            } | {
                type: "tool-result";
                toolUseId: string;
                toolName: string;
                content: string;
                isError?: boolean | undefined;
            } | {
                type: "reasoning";
                reasoning: string;
            })[];
        };
        output: void;
        meta: object;
    }>;
    /**
     * Update message status
     * Used when streaming completes/aborts
     * REACTIVE: Emits message-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateStatus: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            messageId: string;
            status: "error" | "abort" | "completed" | "active";
            finishReason?: string | undefined;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Update message usage
     * Used when streaming completes with token counts
     * REACTIVE: Emits message-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateUsage: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            messageId: string;
            usage: {
                promptTokens: number;
                completionTokens: number;
                totalTokens: number;
            };
        };
        output: void;
        meta: object;
    }>;
    /**
     * Get recent user messages for command history (cursor-based pagination)
     * DATA ON DEMAND: Returns paginated results, not all messages at once
     * CURSOR-BASED PAGINATION: Efficient for large message history
     * INDEXED: Uses efficient database query with role index
     */
    getRecentUserMessages: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            limit?: number | undefined;
            cursor?: number | undefined;
        };
        output: {
            messages: string[];
            nextCursor: number | null;
        };
        meta: object;
    }>;
    /**
     * Stream AI response (SUBSCRIPTION)
     * Unified interface for TUI (in-process) and Web (SSE)
     *
     * Usage:
     * ```typescript
     * // TUI and Web use same API!
     * client.message.streamResponse.subscribe(
     *   { sessionId, userMessage, attachments },
     *   {
     *     onData: (event) => {
     *       if (event.type === 'text-delta') {
     *         appendText(event.text);
     *       }
     *     },
     *     onError: (error) => console.error(error),
     *     onComplete: () => console.log('Done'),
     *   }
     * );
     * ```
     *
     * Transport:
     * - TUI: In-process observable (zero overhead)
     * - Web: SSE (httpSubscriptionLink)
     *
     * SECURITY: Protected + streaming rate limiting (5 streams/min)
     */
    streamResponse: import("@trpc/server/unstable-core-do-not-import").LegacyObservableSubscriptionProcedure<{
        input: {
            userMessage: string;
            sessionId?: string | null | undefined;
            agentId?: string | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            attachments?: {
                path: string;
                relativePath: string;
                size?: number | undefined;
            }[] | undefined;
        };
        output: import("../../index.js").StreamEvent;
        meta: object;
    }>;
    /**
     * Subscribe to message changes (SUBSCRIPTION)
     * Real-time sync for all clients (non-streaming updates)
     *
     * Emits events:
     * - message-added: New message added to session
     * - message-updated: Message parts/status/usage updated
     */
    onChange: import("@trpc/server/unstable-core-do-not-import").LegacyObservableSubscriptionProcedure<{
        input: {
            sessionId?: string | undefined;
        };
        output: {
            type: "message-added" | "message-updated";
            sessionId?: string;
            messageId: string;
            role?: "user" | "assistant";
            field?: "parts" | "status" | "usage";
        };
        meta: object;
    }>;
}>>;
export {};
//# sourceMappingURL=message.router.d.ts.map
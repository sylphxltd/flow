/**
 * Session Router
 * Enterprise-grade session management with pagination and lazy loading
 * REACTIVE: Emits events for all state changes
 * SECURITY: Protected mutations (OWASP API2) + Rate limiting (OWASP API4)
 */
import type { ProviderId } from '@sylphx/code-core';
export declare const sessionRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Get recent sessions metadata (cursor-based pagination)
     * DATA ON DEMAND: Returns ONLY metadata (id, title, provider, model, timestamps, messageCount)
     * NO messages, NO todos - client fetches full session via getById when needed
     * CURSOR-BASED PAGINATION: Efficient for large datasets, works with concurrent updates
     */
    getRecent: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            limit?: number | undefined;
            cursor?: number | undefined;
        };
        output: {
            sessions: Array<{
                id: string;
                title?: string;
                provider: ProviderId;
                model: string;
                agentId: string;
                created: number;
                updated: number;
                messageCount: number;
            }>;
            nextCursor: number | null;
        };
        meta: object;
    }>;
    /**
     * Get session by ID with full data
     * LAZY LOADING: Only called when user opens a specific session
     */
    getById: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            sessionId: string;
        };
        output: import("@sylphx/code-core").Session | null;
        meta: object;
    }>;
    /**
     * Get session count
     * EFFICIENT: Database count without loading any data
     */
    getCount: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: number;
        meta: object;
    }>;
    /**
     * Get last session (for headless mode)
     */
    getLast: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: import("@sylphx/code-core").Session | null;
        meta: object;
    }>;
    /**
     * Search sessions by title (metadata only, cursor-based pagination)
     * DATA ON DEMAND: Returns ONLY metadata, no messages
     * CURSOR-BASED PAGINATION: Efficient for large result sets
     * INDEXED: Uses database index for fast search
     */
    search: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            query: string;
            limit?: number | undefined;
            cursor?: number | undefined;
        };
        output: {
            sessions: Array<{
                id: string;
                title?: string;
                provider: ProviderId;
                model: string;
                agentId: string;
                created: number;
                updated: number;
                messageCount: number;
            }>;
            nextCursor: number | null;
        };
        meta: object;
    }>;
    /**
     * Create new session
     * REACTIVE: Emits session-created event
     * SECURITY: Protected + strict rate limiting (10 req/min)
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            provider: unknown;
            model: string;
            agentId?: string | undefined;
            enabledRuleIds?: string[] | undefined;
        };
        output: import("@sylphx/code-core").Session;
        meta: object;
    }>;
    /**
     * Update session title
     * REACTIVE: Emits session-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateTitle: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            title: string;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Update session model
     * REACTIVE: Emits session-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateModel: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            model: string;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Update session provider and model
     * REACTIVE: Emits session-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateProvider: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            provider: unknown;
            model: string;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Update session enabled rules
     * REACTIVE: Emits session-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateRules: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            enabledRuleIds: string[];
        };
        output: void;
        meta: object;
    }>;
    /**
     * Delete session
     * CASCADE: Automatically deletes all messages, todos, attachments
     * REACTIVE: Emits session-deleted event
     * SECURITY: Protected + strict rate limiting (10 req/min)
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Subscribe to session changes (SUBSCRIPTION)
     * Real-time sync for all clients
     *
     * Emits events:
     * - session-created: New session created
     * - session-updated: Session field changed
     * - session-deleted: Session removed
     */
    onChange: import("@trpc/server/unstable-core-do-not-import").LegacyObservableSubscriptionProcedure<{
        input: void;
        output: {
            type: "session-created" | "session-updated" | "session-deleted";
            sessionId: string;
            provider?: string;
            model?: string;
            field?: "title" | "model" | "provider" | "enabledRuleIds";
            value?: string;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=session.router.d.ts.map
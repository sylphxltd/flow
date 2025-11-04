/**
 * Session Router
 * Enterprise-grade session management with pagination and lazy loading
 */
export declare const sessionRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Get recent sessions (paginated)
     * PERFORMANCE: Only load metadata, not full message history
     */
    getRecent: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            limit?: number | undefined;
            offset?: number | undefined;
        };
        output: import("@sylphx/code-core").Session[];
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
     * Search sessions by title
     * INDEXED: Uses database index for fast search
     */
    search: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            query: string;
            limit?: number | undefined;
        };
        output: import("@sylphx/code-core").Session[];
        meta: object;
    }>;
    /**
     * Create new session
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            provider: unknown;
            model: string;
        };
        output: import("@sylphx/code-core").Session;
        meta: object;
    }>;
    /**
     * Update session title
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
     * Delete session
     * CASCADE: Automatically deletes all messages, todos, attachments
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
        };
        output: void;
        meta: object;
    }>;
}>>;
//# sourceMappingURL=session.router.d.ts.map
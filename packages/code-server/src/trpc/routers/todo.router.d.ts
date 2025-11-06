/**
 * Todo Router
 * Efficient todo management per session
 * REACTIVE: Emits events for all state changes
 * SECURITY: Protected mutations (OWASP API2) + Rate limiting (OWASP API4)
 */
export declare const todoRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Update todos for session
     * Atomically replaces all todos
     * REACTIVE: Emits todos-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            todos: {
                id: number;
                content: string;
                activeForm: string;
                status: "pending" | "in_progress" | "completed";
                ordering: number;
            }[];
            nextTodoId: number;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Subscribe to todo changes (SUBSCRIPTION)
     * Real-time sync for all clients
     *
     * Emits events:
     * - todos-updated: Todo list changed for a session
     */
    onChange: import("@trpc/server/unstable-core-do-not-import").LegacyObservableSubscriptionProcedure<{
        input: {
            sessionId?: string | undefined;
        };
        output: {
            type: "todos-updated";
            sessionId: string;
            todos: Array<{
                id: number;
                content: string;
                activeForm: string;
                status: "pending" | "in_progress" | "completed";
                ordering: number;
            }>;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=todo.router.d.ts.map
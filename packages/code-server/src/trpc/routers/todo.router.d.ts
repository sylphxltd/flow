/**
 * Todo Router
 * Efficient todo management per session
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
}>>;
//# sourceMappingURL=todo.router.d.ts.map
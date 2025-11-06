/**
 * Admin Router
 * System management operations (admin-only)
 * SECURITY: Function level authorization (OWASP API5) + API Inventory (OWASP API9)
 */
export declare const adminRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Delete all sessions (admin-only)
     * SECURITY: Requires admin role (in-process CLI only)
     * Dangerous operation - removes all data
     */
    deleteAllSessions: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            confirm: true;
        };
        output: {
            success: boolean;
            deletedCount: number;
            message: string;
        };
        meta: object;
    }>;
    /**
     * Get system statistics (admin-only)
     * SECURITY: Requires admin role
     * Shows internal metrics not exposed to regular users
     */
    getSystemStats: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            sessions: {
                total: number;
                avgMessagesPerSession: number;
            };
            messages: {
                total: number;
            };
            config: {
                providers: string[];
                defaultProvider: "anthropic" | "openai" | "google" | "openrouter" | "claude-code" | "zai" | undefined;
                defaultModel: any;
            };
        };
        meta: object;
    }>;
    /**
     * Get server health (public - for monitoring)
     * No authorization required
     */
    getHealth: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            status: string;
            timestamp: number;
            uptime: number;
            memory: {
                used: number;
                total: number;
            };
        };
        meta: object;
    }>;
    /**
     * Force garbage collection (admin-only)
     * SECURITY: Requires admin role
     * System management operation
     */
    forceGC: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            success: boolean;
            message: string;
        };
        meta: object;
    }>;
    /**
     * Get API inventory (public - for documentation)
     * SECURITY: OWASP API9 compliance
     * Shows all available endpoints, their types, and requirements
     */
    getAPIInventory: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: import("../../utils/api-inventory.js").APIInventory;
        meta: object;
    }>;
    /**
     * Get API documentation (public - for developers)
     * SECURITY: OWASP API9 compliance
     * Returns Markdown-formatted API reference
     */
    getAPIDocs: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            format?: "json" | "markdown" | undefined;
        };
        output: string | import("../../utils/api-inventory.js").APIInventory;
        meta: object;
    }>;
}>>;
//# sourceMappingURL=admin.router.d.ts.map
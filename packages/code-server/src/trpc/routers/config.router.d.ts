/**
 * Config Router
 * Backend-only configuration management (file system access)
 */
export declare const configRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Load AI config from file system
     * Backend reads files, UI stays clean
     */
    load: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            cwd?: string | undefined;
        };
        output: {
            success: true;
            config: {
                defaultProvider?: "anthropic" | "openai" | "google" | "openrouter" | "claude-code" | "zai" | undefined;
                defaultModel?: string | undefined;
                providers?: Record<string, {
                    [x: string]: unknown;
                    defaultModel?: string | undefined;
                }> | undefined;
            };
        };
        meta: object;
    }>;
    /**
     * Save AI config to file system
     * Backend writes files, UI stays clean
     */
    save: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            config: {
                defaultProvider?: "anthropic" | "openai" | "google" | "openrouter" | "claude-code" | "zai" | undefined;
                defaultModel?: string | undefined;
                providers?: Record<string, {
                    [x: string]: unknown;
                    defaultModel?: string | undefined;
                }> | undefined;
            };
            cwd?: string | undefined;
        };
        output: {
            success: true;
            error?: undefined;
        } | {
            success: false;
            error: string;
        };
        meta: object;
    }>;
    /**
     * Get config file paths
     * Useful for debugging
     */
    getPaths: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            cwd?: string | undefined;
        };
        output: {
            global: string;
            project: string;
            local: string;
            legacy: string;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=config.router.d.ts.map
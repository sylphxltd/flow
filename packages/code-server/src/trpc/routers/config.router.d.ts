/**
 * Config Router
 * Backend-only configuration management (file system access)
 * REACTIVE: Emits events for all state changes
 * SECURITY: Protected mutations (OWASP API2) + Rate limiting (OWASP API4)
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
     *
     * SECURITY: Sanitizes sensitive fields (API keys) before returning to client
     * - API keys are masked: "sk-ant-..." → "sk-ant-***" (shows first 7 chars)
     * - Other sensitive fields (passwords, tokens) also masked
     * - Non-sensitive fields (provider, model) returned as-is
     */
    load: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            cwd?: string | undefined;
        };
        output: {
            success: true;
            config: {
                defaultProvider?: "anthropic" | "openai" | "google" | "openrouter" | "claude-code" | "zai" | undefined;
                defaultEnabledRuleIds?: string[] | undefined;
                defaultAgentId?: string | undefined;
                providers?: Record<string, {
                    [x: string]: unknown;
                    defaultModel?: string | undefined;
                }> | undefined;
            };
        };
        meta: object;
    }>;
    /**
     * Update default provider
     * REACTIVE: Emits config:default-provider-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateDefaultProvider: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            provider: "anthropic" | "openai" | "google" | "openrouter" | "claude-code" | "zai";
            cwd?: string | undefined;
        };
        output: {
            success: false;
            error: string;
        } | {
            success: true;
            error?: undefined;
        };
        meta: object;
    }>;
    /**
     * Update default model
     * REACTIVE: Emits config:default-model-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateDefaultModel: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            model: string;
            cwd?: string | undefined;
        };
        output: {
            success: false;
            error: string;
        } | {
            success: true;
            error?: undefined;
        };
        meta: object;
    }>;
    /**
     * Update provider configuration
     * REACTIVE: Emits config:provider-updated or config:provider-added event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateProviderConfig: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            providerId: string;
            config: Record<any, unknown>;
            cwd?: string | undefined;
        };
        output: {
            success: false;
            error: string;
        } | {
            success: true;
            error?: undefined;
        };
        meta: object;
    }>;
    /**
     * Remove provider configuration
     * REACTIVE: Emits config:provider-removed event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    removeProvider: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            providerId: string;
            cwd?: string | undefined;
        };
        output: {
            success: false;
            error: string;
        } | {
            success: true;
            error?: undefined;
        };
        meta: object;
    }>;
    /**
     * Save AI config to file system
     * Backend writes files, UI stays clean
     * REACTIVE: Emits config-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    save: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            config: {
                defaultProvider?: "anthropic" | "openai" | "google" | "openrouter" | "claude-code" | "zai" | undefined;
                defaultEnabledRuleIds?: string[] | undefined;
                defaultAgentId?: string | undefined;
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
    /**
     * Get all available providers
     * Returns provider metadata (id, name, description, isConfigured)
     * SECURITY: No sensitive data exposed
     */
    getProviders: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            cwd?: string | undefined;
        } | undefined;
        output: Record<string, {
            id: string;
            name: string;
            description: string;
            isConfigured: boolean;
        }>;
        meta: object;
    }>;
    /**
     * Get provider config schema
     * Returns the configuration fields required for a provider
     * SECURITY: No sensitive data - just schema definition
     */
    getProviderSchema: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            providerId: "anthropic" | "openai" | "google" | "openrouter" | "claude-code" | "zai";
        };
        output: {
            success: true;
            schema: import("../../../../code-core/src/ai/providers/base-provider.js").ConfigField[];
            error?: undefined;
        } | {
            success: false;
            error: string;
            schema?: undefined;
        };
        meta: object;
    }>;
    /**
     * Fetch available models for a provider
     * SECURITY: Requires provider config (API keys if needed)
     */
    fetchModels: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            providerId: "anthropic" | "openai" | "google" | "openrouter" | "claude-code" | "zai";
            cwd?: string | undefined;
        };
        output: {
            success: true;
            models: import("@sylphx/code-core").ModelInfo[];
            error?: undefined;
        } | {
            success: false;
            error: string;
            models?: undefined;
        };
        meta: object;
    }>;
    /**
     * Get tokenizer info for a model
     * Returns tokenizer name and status
     */
    getTokenizerInfo: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            model: string;
        };
        output: {
            modelName: string;
            tokenizerName: string;
            loaded: boolean;
            failed: boolean;
        } | null;
        meta: object;
    }>;
    /**
     * Get model details (context length, pricing, etc.)
     * SECURITY: No API keys needed - uses hardcoded metadata
     */
    getModelDetails: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            providerId: "anthropic" | "openai" | "google" | "openrouter" | "claude-code" | "zai";
            modelId: string;
        };
        output: {
            success: true;
            details: import("../../../../code-core/src/ai/providers/base-provider.js").ProviderModelDetails | null;
            error?: undefined;
        } | {
            success: false;
            error: string;
            details?: undefined;
        };
        meta: object;
    }>;
    /**
     * Subscribe to config changes (SUBSCRIPTION)
     * Real-time sync for all clients with fine-grained events
     *
     * Emits events:
     * - config-updated: Full config save (coarse-grained)
     * - config:default-provider-updated: Default provider changed
     * - config:default-model-updated: Default model changed
     * - config:provider-added: New provider added
     * - config:provider-updated: Provider field updated
     * - config:provider-removed: Provider removed
     */
    onChange: import("@trpc/server/unstable-core-do-not-import").LegacyObservableSubscriptionProcedure<{
        input: {
            providerId?: string | undefined;
        };
        output: {
            type: "config-updated";
            config: any;
        } | {
            type: "config:default-provider-updated";
            provider: string;
        } | {
            type: "config:default-model-updated";
            model: string;
        } | {
            type: "config:provider-added";
            providerId: string;
            config: any;
        } | {
            type: "config:provider-updated";
            providerId: string;
            field: string;
            value: any;
        } | {
            type: "config:provider-removed";
            providerId: string;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=config.router.d.ts.map
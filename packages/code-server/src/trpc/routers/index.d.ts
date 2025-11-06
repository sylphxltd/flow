/**
 * Root App Router
 * Combines all domain routers into a single tRPC router
 */
/**
 * Main application router
 * Namespaced by domain for clarity
 */
export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    session: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../context.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        getRecent: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
                cursor?: number | undefined;
            };
            output: {
                sessions: Array<{
                    id: string;
                    title?: string;
                    provider: import("@sylphx/code-core").ProviderId;
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
        getById: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                sessionId: string;
            };
            output: import("@sylphx/code-core").Session | null;
            meta: object;
        }>;
        getCount: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: number;
            meta: object;
        }>;
        getLast: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: import("@sylphx/code-core").Session | null;
            meta: object;
        }>;
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
                    provider: import("@sylphx/code-core").ProviderId;
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
        updateTitle: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                title: string;
            };
            output: void;
            meta: object;
        }>;
        updateModel: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                model: string;
            };
            output: void;
            meta: object;
        }>;
        updateProvider: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                provider: unknown;
                model: string;
            };
            output: void;
            meta: object;
        }>;
        updateRules: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                enabledRuleIds: string[];
            };
            output: void;
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
            };
            output: void;
            meta: object;
        }>;
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
    message: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../context.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
        getCount: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                sessionId: string;
            };
            output: number;
            meta: object;
        }>;
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
        updateStatus: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                messageId: string;
                status: "error" | "abort" | "completed" | "active";
                finishReason?: string | undefined;
            };
            output: void;
            meta: object;
        }>;
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
    todo: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../context.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
    config: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../context.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
    admin: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../context.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
        forceGC: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
        getAPIInventory: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: import("../../utils/api-inventory.js").APIInventory;
            meta: object;
        }>;
        getAPIDocs: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                format?: "json" | "markdown" | undefined;
            };
            output: string | import("../../utils/api-inventory.js").APIInventory;
            meta: object;
        }>;
    }>>;
}>>;
/**
 * Export type for client-side type safety
 */
export type AppRouter = typeof appRouter;
//# sourceMappingURL=index.d.ts.map
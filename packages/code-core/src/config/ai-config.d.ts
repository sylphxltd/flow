/**
 * AI Configuration Management
 *
 * Three-tier configuration system:
 * 1. Global: ~/.sylphx-code/settings.json (user defaults, contains API keys)
 * 2. Project: ./.sylphx-code/settings.json (project preferences, no secrets)
 * 3. Local: ./.sylphx-code/settings.local.json (local overrides, gitignored)
 *
 * Priority: local > project > global
 */
import { z } from 'zod';
import { type Result } from '../ai/functional/result.js';
import type { ProviderId, ProviderConfigValue as ProviderConfigValueType } from '../types/provider.types.js';
export type { ProviderId } from '../types/provider.types.js';
/**
 * AI_PROVIDERS - Provider metadata from registry
 * Contains basic info (id, name) for UI components
 * Config schemas are defined in each provider's getConfigSchema()
 */
export declare const AI_PROVIDERS: Record<ProviderId, {
    id: ProviderId;
    name: string;
    description: string;
}>;
/**
 * Provider configuration
 * Each provider can have different config fields (defined by provider.getConfigSchema())
 * Common fields: apiKey, defaultModel, etc
 */
export type ProviderConfigValue = ProviderConfigValueType;
/**
 * AI configuration schema
 * Uses generic Record for provider configs - validation happens at provider level
 *
 * DESIGN: No top-level defaultModel
 * - Each provider has its own defaultModel in its config
 * - Default model = last used or first in list
 * - Use camelCase for consistency
 *
 * DESIGN: Global defaults (remember last used)
 * - defaultEnabledRuleIds: Rules enabled by default for new sessions
 * - defaultAgentId: Last selected agent (e.g., 'coder')
 * - Each session can override these independently
 * - Stored in global config, applied when creating new sessions
 */
declare const aiConfigSchema: z.ZodObject<{
    defaultProvider: z.ZodOptional<z.ZodEnum<{
        anthropic: "anthropic";
        openai: "openai";
        google: "google";
        openrouter: "openrouter";
        "claude-code": "claude-code";
        zai: "zai";
    }>>;
    defaultEnabledRuleIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    defaultAgentId: z.ZodOptional<z.ZodString>;
    providers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        defaultModel: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>>;
}, z.core.$strip>;
export type AIConfig = z.infer<typeof aiConfigSchema>;
/**
 * Get AI config file paths in priority order
 */
export declare const getAIConfigPaths: (cwd?: string) => {
    global: string;
    project: string;
    local: string;
    legacy: string;
};
/**
 * Get default model for a provider
 * Returns provider's defaultModel, or undefined if not set
 *
 * DESIGN: Default model = last used (stored in provider config)
 */
export declare const getDefaultModel: (config: AIConfig, providerId: string) => string | undefined;
/**
 * Check if any AI config exists
 */
export declare const aiConfigExists: (cwd?: string) => Promise<boolean>;
/**
 * Load AI configuration
 * Merges global, project, and local configs with priority: local > project > global
 * Automatically migrates legacy config on first load
 */
export declare const loadAIConfig: (cwd?: string) => Promise<Result<AIConfig, Error>>;
/**
 * Save AI configuration to global settings
 * By default, all configuration (including API keys) goes to ~/.sylphx-code/settings.json
 * Automatically sets default provider if not set
 */
export declare const saveAIConfig: (config: AIConfig, cwd?: string) => Promise<Result<void, Error>>;
/**
 * Save AI configuration to a specific location
 */
export declare const saveAIConfigTo: (config: AIConfig, location: "global" | "project" | "local", cwd?: string) => Promise<Result<void, Error>>;
/**
 * Update AI configuration (merge with existing)
 * Default provider is auto-set by saveAIConfig to last configured provider
 */
export declare const updateAIConfig: (updates: Partial<AIConfig>, cwd?: string) => Promise<Result<void, Error>>;
/**
 * Get configured providers
 * Uses provider's isConfigured() method to check
 */
export declare const getConfiguredProviders: (cwd?: string) => Promise<ProviderId[]>;
/**
 * Migrate legacy ai-config.json to new settings system
 * Automatically called on first load if legacy config exists
 */
export declare const migrateLegacyConfig: (cwd?: string) => Promise<Result<void, Error>>;
//# sourceMappingURL=ai-config.d.ts.map
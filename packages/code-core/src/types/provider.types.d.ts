/**
 * Provider Type Definitions
 * Shared types to prevent circular dependencies
 *
 * This file contains only type definitions with no imports,
 * allowing it to be safely imported from anywhere.
 */
/**
 * Provider IDs
 * All supported AI providers
 */
export type ProviderId = 'anthropic' | 'openai' | 'google' | 'openrouter' | 'claude-code' | 'zai';
/**
 * Provider configuration value
 * Generic provider config interface
 */
export interface ProviderConfigValue {
    defaultModel?: string;
    [key: string]: string | number | boolean | undefined;
}
//# sourceMappingURL=provider.types.d.ts.map
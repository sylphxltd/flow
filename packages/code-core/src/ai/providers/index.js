/**
 * Provider Registry
 * Central registry for all AI providers
 */
import { AnthropicProvider } from './anthropic-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { GoogleProvider } from './google-provider.js';
import { OpenRouterProvider } from './openrouter-provider.js';
import { ClaudeCodeProvider } from './claude-code-provider.js';
import { ZaiProvider } from './zai-provider.js';
/**
 * Registry of all available providers
 */
export const PROVIDER_REGISTRY = {
    anthropic: new AnthropicProvider(),
    openai: new OpenAIProvider(),
    google: new GoogleProvider(),
    openrouter: new OpenRouterProvider(),
    'claude-code': new ClaudeCodeProvider(),
    zai: new ZaiProvider(),
};
/**
 * Get provider instance by ID
 */
export function getProvider(id) {
    const provider = PROVIDER_REGISTRY[id];
    if (!provider) {
        throw new Error(`Unknown provider: ${id}`);
    }
    return provider;
}
/**
 * Get all provider IDs
 */
export function getAllProviderIds() {
    return Object.keys(PROVIDER_REGISTRY);
}
/**
 * Get provider metadata (id, name, description) for all providers
 * Used by UI components
 */
export function getAllProviders() {
    const result = {};
    for (const [id, provider] of Object.entries(PROVIDER_REGISTRY)) {
        result[id] = {
            id: id,
            name: provider.name,
            description: provider.description,
        };
    }
    return result;
}
//# sourceMappingURL=index.js.map
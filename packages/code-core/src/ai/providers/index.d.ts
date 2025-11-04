/**
 * Provider Registry
 * Central registry for all AI providers
 */
import type { ProviderId } from '../types/provider.types.js';
import type { AIProvider } from './base-provider.js';
/**
 * Registry of all available providers
 */
export declare const PROVIDER_REGISTRY: Record<ProviderId, AIProvider>;
/**
 * Get provider instance by ID
 */
export declare function getProvider(id: ProviderId): AIProvider;
/**
 * Get all provider IDs
 */
export declare function getAllProviderIds(): ProviderId[];
/**
 * Get provider metadata (id, name) for all providers
 * Used by UI components
 */
export declare function getAllProviders(): Record<ProviderId, {
    id: ProviderId;
    name: string;
}>;
export type { AIProvider, ProviderModelDetails, ConfigField, ProviderConfig } from './base-provider.js';
//# sourceMappingURL=index.d.ts.map
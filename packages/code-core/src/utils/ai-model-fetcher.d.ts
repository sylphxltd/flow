/**
 * AI Model Fetcher
 * Dynamically fetch available models from providers using provider registry
 */
import type { ProviderId } from '../types/provider.types.js';
import type { ProviderConfig, ModelInfo } from '../ai/providers/base-provider.js';
export type { ModelInfo } from '../ai/providers/base-provider.js';
/**
 * Fetch models for a provider using provider registry
 */
export declare function fetchModels(provider: ProviderId, config?: ProviderConfig): Promise<ModelInfo[]>;
//# sourceMappingURL=ai-model-fetcher.d.ts.map
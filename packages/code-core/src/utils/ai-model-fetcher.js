/**
 * AI Model Fetcher
 * Dynamically fetch available models from providers using provider registry
 */
import { getProvider } from '../ai/providers/index.js';
/**
 * Fetch models for a provider using provider registry
 */
export async function fetchModels(provider, config = {}) {
    const providerInstance = getProvider(provider);
    return providerInstance.fetchModels(config);
}
//# sourceMappingURL=ai-model-fetcher.js.map
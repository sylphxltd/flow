/**
 * AI Model Fetcher
 * Dynamically fetch available models from providers using provider registry
 */

import type { ProviderId } from '../config/ai-config.js';
import { getProvider } from '../providers/index.js';

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
}

/**
 * Fetch models for a provider using provider registry
 */
export async function fetchModels(provider: ProviderId, apiKey?: string): Promise<ModelInfo[]> {
  const providerInstance = getProvider(provider);
  return providerInstance.fetchModels(apiKey);
}

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
  console.log(`[fetchModels] Fetching models for provider: ${provider}`);
  const providerInstance = getProvider(provider);
  console.log(`[fetchModels] Provider instance: ${providerInstance.id} (${providerInstance.name})`);
  const models = await providerInstance.fetchModels(apiKey);
  console.log(`[fetchModels] Fetched ${models.length} models for ${provider}`);
  return models;
}

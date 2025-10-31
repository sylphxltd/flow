/**
 * Base Provider Interface
 * Defines contract for all AI providers
 */

import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { ProviderId } from '../config/ai-config.js';
import type { ModelInfo } from '../utils/ai-model-fetcher.js';

export interface ProviderModelDetails {
  contextLength?: number;
  maxOutput?: number;
  inputPrice?: number;
  outputPrice?: number;
  supportedFeatures?: string[];
}

export interface AIProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly keyName: string;

  /**
   * Fetch available models from provider API
   */
  fetchModels(apiKey?: string): Promise<ModelInfo[]>;

  /**
   * Get detailed information about a model
   * Should try provider API first, then fall back to models.dev
   */
  getModelDetails(modelId: string, apiKey?: string): Promise<ProviderModelDetails | null>;

  /**
   * Create AI SDK client for this provider
   */
  createClient(apiKey: string, modelId: string): LanguageModelV2;
}

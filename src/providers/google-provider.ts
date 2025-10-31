/**
 * Google Provider
 */

import { google } from '@ai-sdk/google';
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails } from './base-provider.js';
import type { ModelInfo } from '../utils/ai-model-fetcher.js';
import { getModelMetadata } from '../utils/models-dev.js';

const GOOGLE_MODELS: ModelInfo[] = [
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
];

const MODEL_DETAILS: Record<string, ProviderModelDetails> = {
  'gemini-2.0-flash-exp': {
    contextLength: 1000000,
    maxOutput: 8192,
  },
  'gemini-1.5-pro': {
    contextLength: 2000000,
    maxOutput: 8192,
  },
  'gemini-1.5-flash': {
    contextLength: 1000000,
    maxOutput: 8192,
  },
};

export class GoogleProvider implements AIProvider {
  readonly id = 'google' as const;
  readonly name = 'Google';
  readonly keyName = 'GOOGLE_API_KEY';

  async fetchModels(): Promise<ModelInfo[]> {
    return GOOGLE_MODELS;
  }

  async getModelDetails(modelId: string): Promise<ProviderModelDetails | null> {
    // Try provider knowledge first
    if (MODEL_DETAILS[modelId]) {
      return MODEL_DETAILS[modelId];
    }

    // Fall back to models.dev
    const metadata = await getModelMetadata(modelId);
    if (metadata) {
      return {
        contextLength: metadata.contextLength,
        maxOutput: metadata.maxOutput,
        inputPrice: metadata.inputPrice,
        outputPrice: metadata.outputPrice,
      };
    }

    return null;
  }

  createClient(apiKey: string, modelId: string): LanguageModelV1 {
    return google(modelId, { apiKey });
  }
}

/**
 * Anthropic Provider
 */

import { anthropic } from '@ai-sdk/anthropic';
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails } from './base-provider.js';
import type { ModelInfo } from '../utils/ai-model-fetcher.js';
import { getModelMetadata } from '../utils/models-dev.js';

const ANTHROPIC_MODELS: ModelInfo[] = [
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Latest)' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
];

const MODEL_DETAILS: Record<string, ProviderModelDetails> = {
  'claude-3-5-sonnet-20241022': {
    contextLength: 200000,
    maxOutput: 8192,
  },
  'claude-3-5-haiku-20241022': {
    contextLength: 200000,
    maxOutput: 8192,
  },
  'claude-3-opus-20240229': {
    contextLength: 200000,
    maxOutput: 4096,
  },
  'claude-3-sonnet-20240229': {
    contextLength: 200000,
    maxOutput: 4096,
  },
  'claude-3-haiku-20240307': {
    contextLength: 200000,
    maxOutput: 4096,
  },
};

export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic' as const;
  readonly name = 'Anthropic';
  readonly keyName = 'ANTHROPIC_API_KEY';

  async fetchModels(): Promise<ModelInfo[]> {
    return ANTHROPIC_MODELS;
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
    return anthropic(modelId, { apiKey });
  }
}

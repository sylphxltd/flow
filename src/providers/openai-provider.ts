/**
 * OpenAI Provider
 */

import { openai } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails } from './base-provider.js';
import type { ModelInfo } from '../utils/ai-model-fetcher.js';
import { getModelMetadata } from '../utils/models-dev.js';

const OPENAI_MODELS: ModelInfo[] = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'gpt-4', name: 'GPT-4' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
];

const MODEL_DETAILS: Record<string, ProviderModelDetails> = {
  'gpt-4o': {
    contextLength: 128000,
    maxOutput: 16384,
  },
  'gpt-4o-mini': {
    contextLength: 128000,
    maxOutput: 16384,
  },
  'gpt-4-turbo': {
    contextLength: 128000,
    maxOutput: 4096,
  },
  'gpt-4': {
    contextLength: 8192,
    maxOutput: 8192,
  },
  'gpt-3.5-turbo': {
    contextLength: 16384,
    maxOutput: 4096,
  },
};

export class OpenAIProvider implements AIProvider {
  readonly id = 'openai' as const;
  readonly name = 'OpenAI';
  readonly keyName = 'OPENAI_API_KEY';

  async fetchModels(apiKey?: string): Promise<ModelInfo[]> {
    if (!apiKey) {
      return OPENAI_MODELS;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        return OPENAI_MODELS;
      }

      const data = (await response.json()) as { data: Array<{ id: string }> };
      return data.data
        .filter((model) => model.id.startsWith('gpt-'))
        .map((model) => ({
          id: model.id,
          name: model.id,
        }));
    } catch {
      return OPENAI_MODELS;
    }
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
    return openai(modelId, { apiKey });
  }
}

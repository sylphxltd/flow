/**
 * OpenAI Provider
 */

import { openai } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails, ConfigField, ProviderConfig, ModelInfo } from './base-provider.js';
import { hasRequiredFields } from './base-provider.js';

import { getModelMetadata } from '../../utils/models-dev.js';

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
  readonly description = 'GPT models by OpenAI';

  getConfigSchema(): ConfigField[] {
    return [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'string',
        required: true,
        secret: true,
        description: 'Get your API key from https://platform.openai.com',
        placeholder: 'sk-...',
      },
      {
        key: 'baseUrl',
        label: 'Base URL',
        type: 'string',
        required: false,
        description: 'Custom API endpoint (for Azure OpenAI, etc.)',
        placeholder: 'https://api.openai.com/v1',
      },
    ];
  }

  isConfigured(config: ProviderConfig): boolean {
    return hasRequiredFields(this.getConfigSchema(), config);
  }

  async fetchModels(config: ProviderConfig): Promise<ModelInfo[]> {
    const apiKey = config.apiKey as string | undefined;
    if (!apiKey) {
      // No API key - return known models (can't fetch from API without auth)
      return OPENAI_MODELS;
    }

    const baseUrl = (config.baseUrl as string) || 'https://api.openai.com/v1';
    const response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as { data: Array<{ id: string }> };
    const models = data.data
      .filter((model) => model.id.startsWith('gpt-'))
      .map((model) => ({
        id: model.id,
        name: model.id,
      }));

    if (models.length === 0) {
      throw new Error('No GPT models found in OpenAI API response');
    }

    return models;
  }

  async getModelDetails(modelId: string, _config?: ProviderConfig): Promise<ProviderModelDetails | null> {
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

  createClient(config: ProviderConfig, modelId: string): LanguageModelV1 {
    const apiKey = config.apiKey as string;
    const baseUrl = config.baseUrl as string | undefined;
    return openai(modelId, { apiKey, baseURL: baseUrl });
  }
}

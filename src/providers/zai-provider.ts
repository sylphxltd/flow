/**
 * Z.ai Provider
 * Uses OpenAI-compatible API
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails, ConfigField, ProviderConfig } from './base-provider.js';
import type { ModelInfo } from '../utils/ai-model-fetcher.js';

export class ZaiProvider implements AIProvider {
  readonly id = 'zai' as const;
  readonly name = 'Z.ai';

  getConfigSchema(): ConfigField[] {
    return [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'string',
        required: true,
        secret: true,
        description: 'Get your API key from Z.ai',
        placeholder: 'zai-...',
      },
    ];
  }

  isConfigured(config: ProviderConfig): boolean {
    return !!config.apiKey;
  }

  async fetchModels(config: ProviderConfig): Promise<ModelInfo[]> {
    const apiKey = config.apiKey as string | undefined;

    if (!apiKey) {
      throw new Error('API key is required to fetch Z.ai models');
    }

    const response = await fetch('https://api.z.ai/api/paas/v4/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Z.ai API returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      data?: Array<{ id: string; name?: string }>;
    };

    if (!data.data || data.data.length === 0) {
      throw new Error('No models returned from Z.ai API');
    }

    return data.data.map((model) => ({
      id: model.id,
      name: model.name || model.id,
    }));
  }

  async getModelDetails(modelId: string, _config?: ProviderConfig): Promise<ProviderModelDetails | null> {
    // Known specs for Z.ai models
    const specs: Record<string, ProviderModelDetails> = {
      'glm-4.6': {
        contextLength: 128000,
        maxOutput: 4096,
        inputPrice: 0,
        outputPrice: 0,
      },
      'glm-4-flash': {
        contextLength: 128000,
        maxOutput: 4096,
        inputPrice: 0,
        outputPrice: 0,
      },
      'glm-4-plus': {
        contextLength: 128000,
        maxOutput: 4096,
        inputPrice: 0,
        outputPrice: 0,
      },
      'glm-4-air': {
        contextLength: 128000,
        maxOutput: 4096,
        inputPrice: 0,
        outputPrice: 0,
      },
    };

    return specs[modelId] || null;
  }

  createClient(config: ProviderConfig, modelId: string): LanguageModelV1 {
    const apiKey = config.apiKey as string;
    const zai = createOpenAICompatible({
      baseURL: 'https://api.z.ai/api/paas/v4/',
      apiKey,
      name: 'zai',
    });

    return zai(modelId);
  }
}

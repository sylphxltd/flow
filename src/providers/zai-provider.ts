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

    // Try fetching from Z.ai API
    if (apiKey) {
      try {
        const response = await fetch('https://api.z.ai/api/paas/v4/models', {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            data?: Array<{ id: string; name?: string }>;
          };

          if (data.data) {
            return data.data.map((model) => ({
              id: model.id,
              name: model.name || model.id,
            }));
          }
        }
      } catch {
        // Fall through to default models
      }
    }

    // Return known Z.ai models as fallback
    return [
      { id: 'glm-4.6', name: 'GLM-4.6' },
      { id: 'glm-4-flash', name: 'GLM-4 Flash' },
      { id: 'glm-4-plus', name: 'GLM-4 Plus' },
      { id: 'glm-4-air', name: 'GLM-4 Air' },
    ];
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

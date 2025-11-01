/**
 * Z.ai Provider
 * Uses OpenAI-compatible API
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails } from './base-provider.js';
import type { ModelInfo } from '../utils/ai-model-fetcher.js';

export class ZaiProvider implements AIProvider {
  readonly id = 'zai' as const;
  readonly name = 'Z.ai';
  readonly keyName = 'ZAI_API_KEY';

  async fetchModels(apiKey?: string): Promise<ModelInfo[]> {
    console.log(`[ZaiProvider] fetchModels called with apiKey: ${apiKey ? 'present' : 'missing'}`);

    // Try fetching from Z.ai API
    if (apiKey) {
      try {
        console.log('[ZaiProvider] Fetching models from Z.ai API...');
        const response = await fetch('https://api.z.ai/api/paas/v4/models', {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(10000),
        });

        console.log(`[ZaiProvider] API response status: ${response.status}`);

        if (response.ok) {
          const data = (await response.json()) as {
            data?: Array<{ id: string; name?: string }>;
          };

          if (data.data) {
            console.log(`[ZaiProvider] Fetched ${data.data.length} models from API`);
            return data.data.map((model) => ({
              id: model.id,
              name: model.name || model.id,
            }));
          }
        }
      } catch (error) {
        console.log(`[ZaiProvider] Error fetching from API: ${error instanceof Error ? error.message : String(error)}`);
        // Fall through to default models
      }
    }

    // Return known Z.ai models as fallback
    console.log('[ZaiProvider] Returning fallback models');
    return [
      { id: 'glm-4.6', name: 'GLM-4.6' },
      { id: 'glm-4-flash', name: 'GLM-4 Flash' },
      { id: 'glm-4-plus', name: 'GLM-4 Plus' },
      { id: 'glm-4-air', name: 'GLM-4 Air' },
    ];
  }

  async getModelDetails(modelId: string): Promise<ProviderModelDetails | null> {
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

  createClient(apiKey: string, modelId: string): LanguageModelV1 {
    const zai = createOpenAICompatible({
      baseURL: 'https://api.z.ai/api/paas/v4/',
      apiKey,
      name: 'zai',
    });

    return zai(modelId);
  }
}

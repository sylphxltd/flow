/**
 * OpenRouter Provider
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails, ConfigField, ProviderConfig, ModelInfo } from './base-provider.js';

import { getModelMetadata } from '../utils/models-dev.js';

export class OpenRouterProvider implements AIProvider {
  readonly id = 'openrouter' as const;
  readonly name = 'OpenRouter';

  getConfigSchema(): ConfigField[] {
    return [
      {
        key: 'api-key',
        label: 'API Key',
        type: 'string',
        required: true,
        secret: true,
        description: 'Get your API key from https://openrouter.ai',
        placeholder: 'sk-or-...',
      },
    ];
  }

  isConfigured(config: ProviderConfig): boolean {
    return !!config['api-key'];
  }

  async fetchModels(config: ProviderConfig): Promise<ModelInfo[]> {
    const apiKey = config['api-key'] as string | undefined;

    // Retry logic for transient network issues
    const maxRetries = 2;
    let lastError: Error | unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as {
          data: Array<{
            id: string;
            name: string;
            context_length?: number;
            pricing?: {
              prompt: string;
              completion: string;
            };
          }>;
        };

        return data.data.map((model) => ({
          id: model.id,
          name: model.name || model.id,
        }));
      } catch (error) {
        lastError = error;
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
        }
      }
    }

    // All retries failed - throw detailed error
    const errorMsg = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`Failed to fetch models after ${maxRetries + 1} attempts: ${errorMsg}`);
  }

  async getModelDetails(modelId: string, config?: ProviderConfig): Promise<ProviderModelDetails | null> {
    const apiKey = config?.apiKey as string | undefined;

    // Try fetching from OpenRouter API
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      });

      if (response.ok) {
        const data = (await response.json()) as {
          data: Array<{
            id: string;
            context_length?: number;
            top_provider?: {
              max_completion_tokens?: number;
            };
            pricing?: {
              prompt: string;
              completion: string;
            };
          }>;
        };

        const model = data.data.find((m) => m.id === modelId);
        if (model) {
          return {
            contextLength: model.context_length,
            maxOutput: model.top_provider?.max_completion_tokens,
            inputPrice: parseFloat(model.pricing?.prompt || '0'),
            outputPrice: parseFloat(model.pricing?.completion || '0'),
          };
        }
      }
    } catch {
      // Fall through to models.dev
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
    const apiKey = config['api-key'] as string;
    const openrouter = createOpenRouter({ apiKey });
    return openrouter(modelId);
  }
}

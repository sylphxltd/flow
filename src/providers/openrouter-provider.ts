/**
 * OpenRouter Provider
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails } from './base-provider.js';
import type { ModelInfo } from '../utils/ai-model-fetcher.js';
import { getModelMetadata } from '../utils/models-dev.js';

export class OpenRouterProvider implements AIProvider {
  readonly id = 'openrouter' as const;
  readonly name = 'OpenRouter';
  readonly keyName = 'OPENROUTER_API_KEY';

  async fetchModels(apiKey?: string): Promise<ModelInfo[]> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
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
      console.error('Failed to fetch OpenRouter models:', error);
      // Return popular models as fallback
      return [
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
        { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
        { id: 'openai/gpt-4o', name: 'GPT-4o' },
        { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' },
        { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
      ];
    }
  }

  async getModelDetails(modelId: string, apiKey?: string): Promise<ProviderModelDetails | null> {
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

  createClient(apiKey: string, modelId: string): LanguageModelV1 {
    const openrouter = createOpenRouter({ apiKey });
    return openrouter(modelId);
  }
}

/**
 * Claude Code Provider
 * Uses Anthropic API with Claude CLI authentication
 * Fully supports Vercel AI SDK tools
 */

import { anthropic } from '@ai-sdk/anthropic';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { AIProvider, ProviderModelDetails, ConfigField, ProviderConfig } from './base-provider.js';
import type { ModelInfo } from '../utils/ai-model-fetcher.js';

const MODEL_ID_MAP: Record<string, string> = {
  opus: 'claude-opus-4-20250514',
  sonnet: 'claude-sonnet-4-20250514',
  haiku: 'claude-haiku-4-20250415',
};

export class ClaudeCodeProvider implements AIProvider {
  readonly id = 'claude-code' as const;
  readonly name = 'Claude Code';

  getConfigSchema(): ConfigField[] {
    return [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'string',
        required: false,
        secret: true,
        description: 'Anthropic API key (defaults to ANTHROPIC_API_KEY from Claude CLI)',
      },
    ];
  }

  isConfigured(_config: ProviderConfig): boolean {
    // Check if API key is available from config or environment
    return !!(_config.apiKey || process.env.ANTHROPIC_API_KEY);
  }

  async fetchModels(_config: ProviderConfig): Promise<ModelInfo[]> {
    // Claude Code has fixed set of models
    return [
      { id: 'opus', name: 'Claude 4.1 Opus (Most Capable)' },
      { id: 'sonnet', name: 'Claude 4.5 Sonnet (Balanced)' },
      { id: 'haiku', name: 'Claude 4.5 Haiku (Fastest)' },
    ];
  }

  async getModelDetails(modelId: string, _config?: ProviderConfig): Promise<ProviderModelDetails | null> {
    // Claude Code models have known specs
    const specs: Record<string, ProviderModelDetails> = {
      opus: {
        contextLength: 200000,
        maxOutput: 4096,
        inputPrice: 0.015,
        outputPrice: 0.075,
      },
      sonnet: {
        contextLength: 200000,
        maxOutput: 8192,
        inputPrice: 0.003,
        outputPrice: 0.015,
      },
      haiku: {
        contextLength: 200000,
        maxOutput: 4096,
        inputPrice: 0.00025,
        outputPrice: 0.00125,
      },
    };

    return specs[modelId] || null;
  }

  createClient(config: ProviderConfig, modelId: string): LanguageModelV2 {
    // Use Anthropic provider with API key from config or environment
    const apiKey = (config.apiKey as string) || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        'Anthropic API key is required. Run `claude login` to set ANTHROPIC_API_KEY environment variable.'
      );
    }

    // Map short model ID to full model name
    const fullModelId = MODEL_ID_MAP[modelId] || modelId;

    // Create Anthropic provider instance with API key
    const provider = anthropic(apiKey);

    // Return language model
    return provider(fullModelId);
  }
}

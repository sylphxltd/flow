/**
 * Claude Code Provider
 * Uses Claude Agent SDK via CLI authentication
 */

import { claudeCode } from 'ai-sdk-provider-claude-code';
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails } from './base-provider.js';
import type { ModelInfo } from '../utils/ai-model-fetcher.js';

export class ClaudeCodeProvider implements AIProvider {
  readonly id = 'claude-code' as const;
  readonly name = 'Claude Code';
  readonly keyName = 'CLAUDE_CODE_AUTH';

  async fetchModels(): Promise<ModelInfo[]> {
    // Claude Code has fixed set of models
    return [
      { id: 'opus', name: 'Claude 4.1 Opus (Most Capable)' },
      { id: 'sonnet', name: 'Claude 4.5 Sonnet (Balanced)' },
      { id: 'haiku', name: 'Claude 4.5 Haiku (Fastest)' },
    ];
  }

  async getModelDetails(modelId: string): Promise<ProviderModelDetails | null> {
    // Claude Code models have known specs
    const specs: Record<string, ProviderModelDetails> = {
      opus: {
        contextLength: 200000,
        maxOutput: 4096,
        inputPrice: 0,
        outputPrice: 0,
      },
      sonnet: {
        contextLength: 200000,
        maxOutput: 8192,
        inputPrice: 0,
        outputPrice: 0,
      },
      haiku: {
        contextLength: 200000,
        maxOutput: 4096,
        inputPrice: 0,
        outputPrice: 0,
      },
    };

    return specs[modelId] || null;
  }

  createClient(_apiKey: string, modelId: string): LanguageModelV1 {
    // Claude Code doesn't use API key - it uses CLI authentication
    // The _apiKey parameter is ignored, but we keep it for interface compatibility
    return claudeCode(modelId);
  }
}

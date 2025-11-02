/**
 * Claude Code Provider
 * Uses Claude Agent SDK via CLI authentication
 */

import { claudeCode } from 'ai-sdk-provider-claude-code';
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails, ConfigField, ProviderConfig } from './base-provider.js';
import type { ModelInfo } from '../utils/ai-model-fetcher.js';

export class ClaudeCodeProvider implements AIProvider {
  readonly id = 'claude-code' as const;
  readonly name = 'Claude Code';

  getConfigSchema(): ConfigField[] {
    return [
      {
        key: 'authenticated',
        label: 'Authenticated',
        type: 'boolean',
        required: false,
        description: 'Authentication is handled via Claude CLI',
      },
    ];
  }

  isConfigured(_config: ProviderConfig): boolean {
    // Claude Code doesn't require configuration - uses CLI auth
    return true;
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

  createClient(_config: ProviderConfig, modelId: string): LanguageModelV1 {
    // Claude Code doesn't use config - it uses CLI authentication
    return claudeCode(modelId, {
      allowedTools: ['Write'],
    });
  }
}

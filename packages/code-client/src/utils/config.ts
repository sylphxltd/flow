/**
 * Config utility functions
 * Centralized provider/model resolution logic
 */

import type { AIConfig, ProviderId } from '@sylphx/code-core';

export interface ProviderModelResult {
  provider: ProviderId;
  model: string;
}

/**
 * Resolve provider and model from AI config
 *
 * Extracts the configured provider and model from the nested config structure:
 * - config.defaultProvider → provider name
 * - config.providers[provider].defaultModel → model name
 *
 * Falls back to sensible defaults if config is missing or incomplete.
 *
 * @param aiConfig - AI configuration object (can be null)
 * @returns Provider ID and model name
 */
export function resolveProviderAndModel(aiConfig: AIConfig | null): ProviderModelResult {
  const provider = (aiConfig?.defaultProvider || 'openrouter') as ProviderId;
  const providerConfig = aiConfig?.providers?.[provider];
  const model = providerConfig?.defaultModel || 'anthropic/claude-3.5-sonnet';

  return { provider, model };
}

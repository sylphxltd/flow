/**
 * Provider Registry
 * Central registry for all AI providers
 */

import type { ProviderId } from '../config/ai-config.js';
import type { AIProvider } from './base-provider.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { GoogleProvider } from './google-provider.js';
import { OpenRouterProvider } from './openrouter-provider.js';
import { ClaudeCodeProvider } from './claude-code-provider.js';
import { ZaiProvider } from './zai-provider.js';

/**
 * Registry of all available providers
 */
export const PROVIDER_REGISTRY: Record<ProviderId, AIProvider> = {
  anthropic: new AnthropicProvider(),
  openai: new OpenAIProvider(),
  google: new GoogleProvider(),
  openrouter: new OpenRouterProvider(),
  'claude-code': new ClaudeCodeProvider(),
  zai: new ZaiProvider(),
};

/**
 * Get provider instance by ID
 */
export function getProvider(id: ProviderId): AIProvider {
  const provider = PROVIDER_REGISTRY[id];
  if (!provider) {
    throw new Error(`Unknown provider: ${id}`);
  }
  return provider;
}

/**
 * Get all provider IDs
 */
export function getAllProviderIds(): ProviderId[] {
  return Object.keys(PROVIDER_REGISTRY) as ProviderId[];
}

// Re-export types
export type { AIProvider, ProviderModelDetails } from './base-provider.js';

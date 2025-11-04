/**
 * Provider Registry
 * Central registry for all AI providers
 */

import type { ProviderId } from '../types/provider.types.js';
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

/**
 * Get provider metadata (id, name) for all providers
 * Used by UI components
 */
export function getAllProviders(): Record<ProviderId, { id: ProviderId; name: string }> {
  const result: Record<string, { id: ProviderId; name: string }> = {};
  for (const [id, provider] of Object.entries(PROVIDER_REGISTRY)) {
    result[id] = {
      id: id as ProviderId,
      name: provider.name,
    };
  }
  return result as Record<ProviderId, { id: ProviderId; name: string }>;
}

// Re-export types
export type { AIProvider, ProviderModelDetails, ConfigField, ProviderConfig } from './base-provider.js';

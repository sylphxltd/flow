/**
 * Model Completions
 * Fetches models from provider API for current provider
 */

import { useAppStore } from '@sylphx/code-client';
import { getTRPCClient } from '@sylphx/code-client';
import { fetchModels } from '@sylphx/code-core';
import type { AIConfig, ProviderId } from '@sylphx/code-core';

export interface CompletionOption {
  id: string;
  label: string;
  value: string;
}

/**
 * Lazy load AI config from Zustand store
 * First access: async load from server → cache in Zustand
 * Subsequent access: sync read from Zustand cache
 * Update: event-driven via setAIConfig()
 */
async function getAIConfig(): Promise<AIConfig | null> {
  const store = useAppStore.getState();

  // Already in Zustand? Return cached (fast!)
  if (store.aiConfig) {
    return store.aiConfig;
  }

  // First access - lazy load from server
  try {
    const trpc = getTRPCClient();
    const config = await trpc.config.load.query({ cwd: process.cwd() });

    // Cache in Zustand (stays until explicitly updated)
    store.setAIConfig(config);

    return config;
  } catch (error) {
    console.error('[completions] Failed to load AI config:', error);
    return null;
  }
}

/**
 * Get model completion options for current provider
 * Fetches models from provider API (not cached - models can change frequently)
 */
export async function getModelCompletions(partial = ''): Promise<CompletionOption[]> {
  try {
    const config = await getAIConfig();
    const store = useAppStore.getState();

    if (!config?.providers) {
      return [];
    }

    // Get current provider from session or config
    const currentSession = store.currentSession;
    const currentProviderId = currentSession?.provider || config.defaultProvider;

    if (!currentProviderId) {
      return [];
    }

    // Get provider config
    const providerConfig = config.providers[currentProviderId];
    if (!providerConfig) {
      return [];
    }

    // Fetch models from provider API
    const models = await fetchModels(currentProviderId as ProviderId, providerConfig);

    // Filter by partial match
    const filtered = partial
      ? models.filter(m => m.name.toLowerCase().includes(partial.toLowerCase()))
      : models;

    return filtered.map(m => ({
      id: m.id,
      label: m.name,
      value: m.id,
    }));
  } catch (error) {
    console.error('[completions] Failed to fetch models:', error);
    return [];
  }
}

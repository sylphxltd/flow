/**
 * Provider Completions
 * Lazy loading from Zustand store, no extra cache needed
 */

import { useAppStore } from '@sylphx/code-client';
import { getTRPCClient } from '@sylphx/code-client';
import type { AIConfig } from '@sylphx/code-core';

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
 * Get provider completion options
 * Lazy loads config on first access, then uses Zustand cache
 */
export async function getProviderCompletions(partial = ''): Promise<CompletionOption[]> {
  const config = await getAIConfig();

  if (!config?.providers) {
    return [];
  }

  const providers = Object.keys(config.providers);
  const filtered = partial
    ? providers.filter(id => id.toLowerCase().includes(partial.toLowerCase()))
    : providers;

  return filtered.map(id => ({
    id,
    label: id,
    value: id,
  }));
}

/**
 * Get action completion options (static)
 */
export function getActionCompletions(): CompletionOption[] {
  return [
    { id: 'use', label: 'use', value: 'use' },
    { id: 'configure', label: 'configure', value: 'configure' },
  ];
}

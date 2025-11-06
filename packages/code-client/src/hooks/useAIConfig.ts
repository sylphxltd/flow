/**
 * AI Config Hook
 * Load and save AI configuration via tRPC (backend handles file system)
 */

import type { AIConfig } from '@sylphx/code-core';
import type { AppRouter } from '@sylphx/code-server';
import { useCallback } from 'react';
import { useAppStore } from '../stores/app-store.js';
import { useTRPCClient } from '../trpc-provider.js';

export function useAIConfig() {
  const client = useTRPCClient<AppRouter>(); // Use React Context (must be at component top level)
  const setAIConfig = useAppStore((state) => state.setAIConfig);
  const setError = useAppStore((state) => state.setError);
  const setLoading = useAppStore((state) => state.setLoading);

  const loadConfig = useCallback(async (cwd: string = process.cwd()) => {
    setLoading(true);
    try {
      const result = await (client.config as any).load.query({ cwd });

      if (result.success) {
        // Use setAIConfig to trigger logic for loading defaultEnabledRuleIds and defaultAgentId
        setAIConfig(result.config);
      } else {
        // No config yet, start with empty
        setAIConfig({ providers: {} });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI config');
    } finally {
      setLoading(false);
    }
  }, [client, setAIConfig, setError, setLoading]);

  const saveConfig = useCallback(async (config: AIConfig, cwd: string = process.cwd()) => {
    setLoading(true);
    try {
      const result = await (client.config as any).save.mutate({ config, cwd });

      if (result.success) {
        setAIConfig(config);
        return true;
      }
      setError(result.error || 'Failed to save AI config');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save AI config');
      return false;
    } finally {
      setLoading(false);
    }
  }, [client, setAIConfig, setError, setLoading]);

  return { loadConfig, saveConfig };
}

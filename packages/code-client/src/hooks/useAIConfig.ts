/**
 * AI Config Hook
 * Load and save AI configuration via tRPC (backend handles file system)
 */

import type { AIConfig } from '@sylphx/code-core';
import { useAppStore } from '../stores/app-store.js';
import { getTRPCClient } from '@sylphx/code-server/server/trpc/client';

export function useAIConfig() {
  const setAIConfig = useAppStore((state) => state.setAIConfig);
  const setError = useAppStore((state) => state.setError);
  const setLoading = useAppStore((state) => state.setLoading);

  const loadConfig = async (cwd: string = process.cwd()) => {
    setLoading(true);
    try {
      const client = await getTRPCClient();
      const result = await client.config.load({ cwd });

      if (result.success) {
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
  };

  const saveConfig = async (config: AIConfig, cwd: string = process.cwd()) => {
    setLoading(true);
    try {
      const client = await getTRPCClient();
      const result = await client.config.save({ config, cwd });

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
  };

  return { loadConfig, saveConfig };
}

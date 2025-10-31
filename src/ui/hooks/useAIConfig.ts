/**
 * AI Config Hook
 * Load and save AI configuration
 */

import { loadAIConfig, saveAIConfig, type AIConfig } from '../../config/ai-config.js';
import { useAppStore } from '../stores/app-store.js';

export function useAIConfig() {
  const setAIConfig = useAppStore((state) => state.setAIConfig);
  const setError = useAppStore((state) => state.setError);
  const setLoading = useAppStore((state) => state.setLoading);

  const loadConfig = async (cwd: string = process.cwd()) => {
    setLoading(true);
    try {
      const result = await loadAIConfig(cwd);
      if (result._tag === 'Success') {
        setAIConfig(result.value);
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
      const result = await saveAIConfig(config, cwd);
      if (result._tag === 'Success') {
        setAIConfig(config);
        return true;
      }
      setError(result.error.message);
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

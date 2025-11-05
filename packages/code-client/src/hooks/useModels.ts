/**
 * useModels Hook
 * Fetch available models for a provider
 */

import { useEffect, useState } from 'react';
import { useTRPCClient } from '../trpc-provider.js';

interface ModelInfo {
  id: string;
  name: string;
  contextLength?: number;
}

/**
 * Hook to fetch models for a specific provider
 * Returns models list from server
 *
 * DESIGN: providerId is string (not hardcoded union) because:
 * - Server is source of truth for available providers
 * - Providers can be added dynamically
 * - Client shouldn't need updates when new providers are added
 */
export function useModels(providerId: string | null) {
  const trpc = useTRPCClient();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!providerId) {
      setModels([]);
      setLoading(false);
      setError(null);
      return;
    }

    let mounted = true;

    async function fetchModels() {
      try {
        setLoading(true);
        setError(null);
        const result = await trpc.config.fetchModels.query({ providerId: providerId as any });
        if (mounted) {
          if (result.success) {
            setModels(result.models);
          } else {
            setError(result.error);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load models');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchModels();

    return () => {
      mounted = false;
    };
  }, [trpc, providerId]);

  return { models, loading, error };
}

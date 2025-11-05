/**
 * useModelDetails Hook
 * Get model details including context length and tokenizer info
 */

import { useEffect, useState } from 'react';
import { useTRPCClient } from '../trpc-provider.js';

interface ModelDetails {
  contextLength: number | null;
  tokenizerInfo: {
    modelName: string;
    tokenizerName: string;
    loaded: boolean;
    failed: boolean;
  } | null;
}

/**
 * Hook to fetch model details from server
 * Returns context length and tokenizer information
 *
 * DESIGN: providerId is string (not hardcoded union) because:
 * - Server is source of truth for available providers
 * - Providers can be added dynamically
 * - Client shouldn't need updates when new providers are added
 */
export function useModelDetails(providerId: string | null, modelId: string | null) {
  const trpc = useTRPCClient();
  const [details, setDetails] = useState<ModelDetails>({
    contextLength: null,
    tokenizerInfo: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!providerId || !modelId) {
      setDetails({ contextLength: null, tokenizerInfo: null });
      setLoading(false);
      setError(null);
      return;
    }

    let mounted = true;

    async function fetchDetails() {
      try {
        setLoading(true);
        setError(null);

        // Fetch model details and tokenizer info in parallel
        const [detailsResult, tokInfo] = await Promise.all([
          trpc.config.getModelDetails.query({ providerId: providerId as any, modelId }),
          trpc.config.getTokenizerInfo.query({ model: modelId }),
        ]);

        if (mounted) {
          const contextLength =
            detailsResult.success && detailsResult.details
              ? detailsResult.details.contextLength || null
              : null;

          setDetails({
            contextLength,
            tokenizerInfo: tokInfo,
          });
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load model details');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchDetails();

    return () => {
      mounted = false;
    };
  }, [trpc, providerId, modelId]);

  return { details, loading, error };
}

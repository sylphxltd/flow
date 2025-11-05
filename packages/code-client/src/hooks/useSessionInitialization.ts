/**
 * Session Initialization Hook
 * Creates a new session on mount if none exists
 *
 * DESIGN: Falls back to provider-specific default-model when top-level defaultModel is missing
 * This handles configs where only defaultProvider is set (common after initial setup)
 */

import { useEffect, useState } from 'react';
import type { AIConfig } from '@sylphx/code-core';
import { useTRPCClient } from '../trpc-provider.js';

interface UseSessionInitializationProps {
  currentSessionId: string | null;
  aiConfig: AIConfig | null;
  createSession: (provider: string, model: string) => Promise<string>;
}

export function useSessionInitialization({
  currentSessionId,
  aiConfig,
  createSession,
}: UseSessionInitializationProps) {
  const trpc = useTRPCClient();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || currentSessionId || !aiConfig?.defaultProvider) {
      return;
    }

    async function initializeSession() {
      if (!aiConfig?.defaultProvider) return;

      // Determine model: prioritize top-level defaultModel, fall back to provider-specific default-model
      let model = aiConfig.defaultModel;

      if (!model) {
        // Check provider-specific config for default-model
        const providerConfig = aiConfig.providers?.[aiConfig.defaultProvider];
        model = providerConfig?.['default-model'] as string | undefined;
      }

      // If still no model, fetch first available model from server
      if (!model) {
        try {
          const result = await trpc.config.fetchModels.query({
            providerId: aiConfig.defaultProvider as any,
          });
          if (result.success && result.models.length > 0) {
            model = result.models[0].id;
          }
        } catch (err) {
          console.error('Failed to fetch default model:', err);
          return;
        }
      }

      if (model) {
        // Always create a new session on app start
        // Old sessions are loaded and available in the store but not auto-selected
        await createSession(aiConfig.defaultProvider, model);
        setInitialized(true);
      }
    }

    initializeSession();
  }, [initialized, currentSessionId, aiConfig, createSession, trpc]);
}

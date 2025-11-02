/**
 * Session Initialization Hook
 * Creates a new session on mount if none exists
 */

import { useEffect } from 'react';
import type { AIConfig } from '../../config/ai-config.js';

interface UseSessionInitializationProps {
  currentSessionId: string | null;
  aiConfig: AIConfig | null;
  createSession: (provider: string, model: string) => string;
}

export function useSessionInitialization({
  currentSessionId,
  aiConfig,
  createSession,
}: UseSessionInitializationProps) {
  useEffect(() => {
    if (!currentSessionId && aiConfig?.defaultProvider && aiConfig?.defaultModel) {
      // Always create a new session on app start
      // Old sessions are loaded and available in the store but not auto-selected
      createSession(aiConfig.defaultProvider, aiConfig.defaultModel);
    }
  }, [currentSessionId, aiConfig, createSession]);
}

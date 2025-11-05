/**
 * tRPC Context
 * Provides services via AppContext (functional provider pattern)
 */

import { loadAIConfig } from '@sylphx/code-core';
import type { SessionRepository, AIConfig } from '@sylphx/code-core';
import type { AppContext } from '../context.js';

export interface Context {
  sessionRepository: SessionRepository;
  aiConfig: AIConfig;
  appContext: AppContext;
}

/**
 * Create context for each request
 * Receives AppContext from CodeServer (dependency injection)
 */
export async function createContext(appContext: AppContext): Promise<Context> {
  const sessionRepository = appContext.database.getRepository();

  // Load AI config
  let aiConfig: AIConfig = { providers: {} };
  try {
    const result = await loadAIConfig();
    if (result._tag === 'Success') {
      aiConfig = result.value;
    }
  } catch (error) {
    console.error('Failed to load AI config:', error);
  }

  return {
    sessionRepository,
    aiConfig,
    appContext,
  };
}

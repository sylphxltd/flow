/**
 * tRPC Context
 * Provides database repositories and config to all tRPC procedures
 */

import { getSessionRepository } from '@sylphx/code-core';
import { loadAIConfig } from '@sylphx/code-core';
import type { SessionRepository } from '@sylphx/code-core';
import type { AIConfig } from '@sylphx/code-core';

export interface Context {
  sessionRepository: SessionRepository;
  aiConfig: AIConfig;
}

/**
 * Create context for each request
 * In-process calls reuse same database connection
 */
export async function createContext(): Promise<Context> {
  const sessionRepository = await getSessionRepository();

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
  };
}

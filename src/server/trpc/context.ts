/**
 * tRPC Context
 * Provides database repositories and config to all tRPC procedures
 */

import { getSessionRepository } from '../../db/database.js';
import { loadAIConfig } from '../../config/ai-config.js';
import type { SessionRepository } from '../../db/session-repository.js';
import type { AIConfig } from '../../config/ai-config.js';

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

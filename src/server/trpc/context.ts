/**
 * tRPC Context
 * Provides database repositories to all tRPC procedures
 */

import { getSessionRepository } from '../../db/database.js';
import type { SessionRepository } from '../../db/session-repository.js';

export interface Context {
  sessionRepository: SessionRepository;
}

/**
 * Create context for each request
 * In-process calls reuse same database connection
 */
export async function createContext(): Promise<Context> {
  const sessionRepository = await getSessionRepository();

  return {
    sessionRepository,
  };
}

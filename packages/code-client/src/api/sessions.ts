/**
 * Session API
 * Client-side functions for interacting with sessions via tRPC
 */

import { getTRPCClient } from '../trpc-provider.js';
import type { Session } from '../types/session.js';

/**
 * Get recent sessions from server
 * @param limit - Maximum number of sessions to retrieve
 * @returns Array of sessions, sorted by most recent first
 */
export async function getRecentSessions(limit: number = 100): Promise<Session[]> {
  const client = getTRPCClient();
  return await client.session.getRecent.query({ limit });
}

/**
 * Get last active session
 * @returns Last session or null if no sessions exist
 */
export async function getLastSession(): Promise<Session | null> {
  const client = getTRPCClient();
  return await client.session.getLast.query({});
}

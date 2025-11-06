/**
 * Session API
 * Client-side functions for interacting with sessions via tRPC
 */
import { getTRPCClient } from '../trpc-provider.js';
/**
 * Get recent sessions from server
 * @param limit - Maximum number of sessions to retrieve
 * @returns Array of session metadata (lightweight, no messages/todos)
 */
export async function getRecentSessions(limit = 100) {
    const client = getTRPCClient();
    const result = await client.session.getRecent.query({ limit });
    return result.sessions;
}
/**
 * Get last active session
 * @returns Last session or null if no sessions exist
 */
export async function getLastSession() {
    const client = getTRPCClient();
    return await client.session.getLast.query();
}
//# sourceMappingURL=sessions.js.map
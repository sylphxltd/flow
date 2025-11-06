/**
 * Session API
 * Client-side functions for interacting with sessions via tRPC
 */
import type { Session, SessionMetadata } from '@sylphx/code-core';
/**
 * Get recent sessions from server
 * @param limit - Maximum number of sessions to retrieve
 * @returns Array of session metadata (lightweight, no messages/todos)
 */
export declare function getRecentSessions(limit?: number): Promise<SessionMetadata[]>;
/**
 * Get last active session
 * @returns Last session or null if no sessions exist
 */
export declare function getLastSession(): Promise<Session | null>;
//# sourceMappingURL=sessions.d.ts.map
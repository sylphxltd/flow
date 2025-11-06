/**
 * Session Manager
 * Manage chat sessions for headless mode
 */
import type { ProviderId } from '../config/ai-config.js';
import type { Session } from '../types/session.types.js';
export type { Session } from '../types/session.types.js';
/**
 * Create new session
 */
export declare function createSession(provider: ProviderId, model: string): Promise<Session>;
/**
 * Save session to file
 */
export declare function saveSession(session: Session): Promise<void>;
/**
 * Load session from file with migration support
 * Automatically adds missing fields from newer schema versions
 */
export declare function loadSession(sessionId: string): Promise<Session | null>;
/**
 * Get last session ID
 */
export declare function getLastSessionId(): Promise<string | null>;
/**
 * Set last session ID
 */
export declare function setLastSession(sessionId: string): Promise<void>;
/**
 * Load last session
 */
export declare function loadLastSession(): Promise<Session | null>;
/**
 * Add message to session (in-memory helper for headless mode)
 * Converts string content to MessagePart[] format
 */
export declare function addMessage(session: Session, role: 'user' | 'assistant', content: string): Session;
/**
 * Clear session messages but keep metadata
 */
export declare function clearSessionMessages(session: Session): Session;
//# sourceMappingURL=session-manager.d.ts.map
/**
 * Session Manager
 * Manage chat sessions for headless mode
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
const SESSION_DIR = join(homedir(), '.sylphx', 'sessions');
const LAST_SESSION_FILE = join(SESSION_DIR, '.last-session');
/**
 * Ensure session directory exists
 */
async function ensureSessionDir() {
    await mkdir(SESSION_DIR, { recursive: true });
}
/**
 * Get session file path
 */
function getSessionPath(sessionId) {
    return join(SESSION_DIR, `${sessionId}.json`);
}
/**
 * Create new session
 */
export async function createSession(provider, model) {
    await ensureSessionDir();
    const session = {
        id: `session-${Date.now()}`,
        provider,
        model,
        messages: [],
        todos: [], // Initialize empty todos
        nextTodoId: 1, // Start from 1
        created: Date.now(),
        updated: Date.now(),
    };
    await saveSession(session);
    await setLastSession(session.id);
    return session;
}
/**
 * Save session to file
 */
export async function saveSession(session) {
    await ensureSessionDir();
    // Create a new object with updated timestamp (don't mutate readonly session from Zustand)
    const sessionToSave = {
        ...session,
        updated: Date.now(),
    };
    const path = getSessionPath(session.id);
    // Use compact JSON format for faster serialization and smaller file size
    await writeFile(path, JSON.stringify(sessionToSave), 'utf8');
}
/**
 * Load session from file with migration support
 * Automatically adds missing fields from newer schema versions
 */
export async function loadSession(sessionId) {
    try {
        const path = getSessionPath(sessionId);
        const content = await readFile(path, 'utf8');
        const rawSession = JSON.parse(content);
        // Migration: Add todos/nextTodoId if missing
        if (!rawSession.todos) {
            rawSession.todos = [];
        }
        if (typeof rawSession.nextTodoId !== 'number') {
            rawSession.nextTodoId = 1;
        }
        // Migration: Normalize message content format
        // Old: { content: string }
        // New: { content: MessagePart[] }
        if (Array.isArray(rawSession.messages)) {
            rawSession.messages = rawSession.messages.map((msg) => {
                if (typeof msg.content === 'string') {
                    return {
                        ...msg,
                        content: [{ type: 'text', content: msg.content }],
                    };
                }
                return msg;
            });
        }
        return rawSession;
    }
    catch {
        return null;
    }
}
/**
 * Get last session ID
 */
export async function getLastSessionId() {
    try {
        const content = await readFile(LAST_SESSION_FILE, 'utf8');
        return content.trim();
    }
    catch {
        return null;
    }
}
/**
 * Set last session ID
 */
export async function setLastSession(sessionId) {
    await ensureSessionDir();
    await writeFile(LAST_SESSION_FILE, sessionId, 'utf8');
}
/**
 * Load last session
 */
export async function loadLastSession() {
    const sessionId = await getLastSessionId();
    if (!sessionId)
        return null;
    return loadSession(sessionId);
}
/**
 * Add message to session (in-memory helper for headless mode)
 * Converts string content to MessagePart[] format
 */
export function addMessage(session, role, content) {
    return {
        ...session,
        messages: [
            ...session.messages,
            {
                role,
                content: [{ type: 'text', content }], // Convert to MessagePart[]
                timestamp: Date.now(),
            },
        ],
    };
}
/**
 * Clear session messages but keep metadata
 */
export function clearSessionMessages(session) {
    return {
        ...session,
        messages: [],
        updated: Date.now(),
    };
}
//# sourceMappingURL=session-manager.js.map
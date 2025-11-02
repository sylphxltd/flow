/**
 * Session Persistence Hook
 * Load sessions from disk on mount
 */

import { useEffect } from 'react';
import { useAppStore } from '../stores/app-store.js';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { loadSession } from '../../utils/session-manager.js';

const SESSION_DIR = join(homedir(), '.sylphx', 'sessions');

export function useSessionPersistence() {
  useEffect(() => {
    const loadSessions = async () => {
      try {
        // Get all session files
        const files = await readdir(SESSION_DIR);
        const sessionFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('.'));

        // Load each session (with migration support)
        const sessions = await Promise.all(
          sessionFiles.map(async (file) => {
            const sessionId = file.replace('.json', '');
            return loadSession(sessionId);
          })
        );

        // Filter out null results and add to store
        const validSessions = sessions.filter((s): s is NonNullable<typeof s> => s !== null);

        // Sort by updated time (newest first)
        validSessions.sort((a, b) => b.updated - a.updated);

        // Update store with loaded sessions
        const setState = useAppStore.setState;
        setState({ sessions: validSessions });

        // Don't auto-set current session - let user start fresh or choose from history
        // Sessions are loaded and available but not automatically opened
      } catch (error) {
        // Directory might not exist yet, that's ok
        if ((error as any).code !== 'ENOENT') {
          console.error('Failed to load sessions:', error);
        }
      }
    };

    // Load sessions on mount
    loadSessions();

    // Subscribe to sessions array changes to detect new sessions created
    // When a new session is created, it's added to the store, triggering this
    const unsubscribe = useAppStore.subscribe(
      (state) => state.sessions.length,
      (newLength, prevLength) => {
        // Only reload if sessions were added (not removed)
        if (newLength > prevLength) {
          // Re-sort sessions by updated time
          const setState = useAppStore.setState;
          const currentSessions = useAppStore.getState().sessions;
          const sortedSessions = [...currentSessions].sort((a, b) => b.updated - a.updated);
          setState({ sessions: sortedSessions });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);
}

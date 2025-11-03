/**
 * Session Persistence Hook
 * Load sessions from database (auto-migrates from files on first run)
 */

import { useEffect } from 'react';
import { useAppStore } from '../stores/app-store.js';
import { getSessionRepository } from '../../db/database.js';

export function useSessionPersistence() {
  useEffect(() => {
    const loadSessions = async () => {
      try {
        // Get database repository (auto-initializes and migrates if needed)
        const repository = await getSessionRepository();

        // Load recent 20 sessions from database
        // MASSIVE performance improvement: Database query vs loading 20 JSON files!
        const validSessions = await repository.getRecentSessions(20);

        // Update store with loaded sessions
        const setState = useAppStore.setState;
        setState({ sessions: validSessions });

        // Don't auto-set current session - let user start fresh or choose from history
        // Sessions are loaded and available but not automatically opened
      } catch (error) {
        console.error('Failed to load sessions from database:', error);
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

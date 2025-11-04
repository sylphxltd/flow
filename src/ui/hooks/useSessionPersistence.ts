/**
 * Session Persistence Hook
 * Loads last session from database (tRPC architecture)
 *
 * tRPC Pattern:
 * - No mass loading of sessions (huge memory saving!)
 * - Only load last session if exists
 * - Other sessions fetched on-demand via /sessions command
 */

import { useEffect } from 'react';
import { useAppStore } from '../stores/app-store.js';
import { getTRPCClient } from '../../server/trpc/client.js';

export function useSessionPersistence() {
  useEffect(() => {
    const loadLastSession = async () => {
      try {
        // Get tRPC client
        const client = await getTRPCClient();

        // Load last session (most recently updated)
        // MASSIVE performance improvement: Only load 1 session instead of all!
        const lastSession = await client.session.getLast();

        if (lastSession) {
          // Set as current session (cached in store)
          const { setCurrentSession } = useAppStore.getState();
          await setCurrentSession(lastSession.id);
        }

        // Don't auto-set if no session - let user start fresh
      } catch (error) {
        console.error('Failed to load last session:', error);
      }
    };

    // Load last session on mount
    loadLastSession();

    // No subscription needed - currentSession updates handled by tRPC
  }, []);
}

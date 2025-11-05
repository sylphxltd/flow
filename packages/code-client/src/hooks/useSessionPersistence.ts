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
import { getTRPCClient } from '../trpc-provider.js';

export function useSessionPersistence() {
  useEffect(() => {
    // NO AUTO-RESUME: TUI starts with fresh session screen
    // User can manually resume sessions via /sessions command or history
    // This aligns with lazy session creation - no session until user sends first message

    // NOTE: Migration logic can be added here if needed for future migrations
    // Currently, session data is managed by tRPC server and database

    // No subscription needed - currentSession updates handled by tRPC
  }, []);
}

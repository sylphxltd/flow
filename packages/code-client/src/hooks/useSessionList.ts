/**
 * Session List Hook
 * Provides reactive session list with loading/error states
 */

import { useState, useCallback } from 'react';
import { getRecentSessions } from '../api/sessions.js';
import type { Session, SessionMetadata } from '@sylphx/code-core';

export interface UseSessionListReturn {
  sessions: SessionMetadata[];
  loading: boolean;
  error: string | null;
  loadSessions: (limit?: number) => Promise<void>;
}

/**
 * Hook for managing session list
 *
 * @returns Session list with loading/error states and refresh function
 *
 * @example
 * ```tsx
 * const { sessions, loading, loadSessions } = useSessionList();
 *
 * useEffect(() => {
 *   loadSessions(100);
 * }, []);
 * ```
 */
export function useSessionList(): UseSessionListReturn {
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async (limit: number = 100) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRecentSessions(limit);
      setSessions(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sessions';
      setError(errorMessage);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sessions,
    loading,
    error,
    loadSessions,
  };
}

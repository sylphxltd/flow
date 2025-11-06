/**
 * Session List Hook
 * Provides reactive session list with loading/error states
 */
import { useState, useCallback } from 'react';
import { getRecentSessions } from '../api/sessions.js';
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
export function useSessionList() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const loadSessions = useCallback(async (limit = 100) => {
        setLoading(true);
        setError(null);
        try {
            const result = await getRecentSessions(limit);
            setSessions(result);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load sessions';
            setError(errorMessage);
            setSessions([]);
        }
        finally {
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
//# sourceMappingURL=useSessionList.js.map
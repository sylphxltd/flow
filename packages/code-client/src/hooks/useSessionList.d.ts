/**
 * Session List Hook
 * Provides reactive session list with loading/error states
 */
import type { Session } from '../types/session.js';
export interface UseSessionListReturn {
    sessions: Session[];
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
export declare function useSessionList(): UseSessionListReturn;
//# sourceMappingURL=useSessionList.d.ts.map
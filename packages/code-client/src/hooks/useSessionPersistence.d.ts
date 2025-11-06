/**
 * Session Persistence Hook
 * Loads last session from database (tRPC architecture)
 *
 * tRPC Pattern:
 * - No mass loading of sessions (huge memory saving!)
 * - Only load last session if exists
 * - Other sessions fetched on-demand via /sessions command
 */
export declare function useSessionPersistence(): void;
//# sourceMappingURL=useSessionPersistence.d.ts.map
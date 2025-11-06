/**
 * useElapsedTime Hook
 * Real-time elapsed time calculation with adaptive update frequency
 *
 * Design: Adaptive update frequency based on display precision
 * - < 1000ms: Update every 50ms, display "523ms"
 * - 1s-10s: Update every 100ms, display "5.2s" (1 decimal)
 * - 10s-60s: Update every 1000ms, display "45s" (no decimal)
 * - >= 60s: Update every 1000ms, display "1m11s" (no decimal)
 *
 * The update frequency matches the smallest unit displayed:
 * - Showing 0.1s precision → need 100ms updates
 * - Showing 1s precision → need 1000ms updates
 */
export interface ElapsedTimeOptions {
    /**
     * Start time in milliseconds (from Date.now())
     */
    startTime?: number;
    /**
     * Fixed duration in milliseconds (for completed operations)
     * When provided, returns this value instead of calculating elapsed time
     */
    duration?: number;
    /**
     * Whether the operation is currently running
     * When false, stops updating
     */
    isRunning?: boolean;
}
export interface ElapsedTimeResult {
    /**
     * Elapsed time in milliseconds
     */
    elapsed: number;
    /**
     * Humanized display string
     * - < 1000ms: "523ms"
     * - 1s-10s: "5.2s" (1 decimal)
     * - 10s-60s: "45s" (no decimal)
     * - >= 60s: "1m11s"
     */
    display: string;
}
/**
 * Calculate elapsed time with adaptive updates
 */
export declare function useElapsedTime(options: ElapsedTimeOptions): ElapsedTimeResult;
//# sourceMappingURL=useElapsedTime.d.ts.map
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
import { useState, useEffect } from 'react';
/**
 * Calculate elapsed time with adaptive updates
 */
export function useElapsedTime(options) {
    const { startTime, duration, isRunning = true } = options;
    // If duration is provided (completed operation), return it immediately
    if (duration !== undefined) {
        return {
            elapsed: duration,
            display: formatDuration(duration),
        };
    }
    // If no startTime or not running, return 0
    if (!startTime || !isRunning) {
        return {
            elapsed: 0,
            display: '0ms',
        };
    }
    // Calculate elapsed time with adaptive update interval
    const [elapsed, setElapsed] = useState(() => Date.now() - startTime);
    useEffect(() => {
        if (!startTime || !isRunning || duration !== undefined) {
            return;
        }
        // Adaptive update interval based on display precision
        const getUpdateInterval = (elapsed) => {
            if (elapsed < 1000)
                return 50; // < 1s: display "ms", update every 50ms
            if (elapsed < 10000)
                return 100; // 1-10s: display "X.Xs", update every 100ms
            return 1000; // >= 10s: display "Xs" or "Xm Xs", update every 1s
        };
        let intervalId;
        const updateElapsed = () => {
            const now = Date.now();
            const newElapsed = now - startTime;
            setElapsed(newElapsed);
            // Clear old interval and create new one with updated frequency
            if (intervalId) {
                clearInterval(intervalId);
            }
            intervalId = setInterval(updateElapsed, getUpdateInterval(newElapsed));
        };
        // Start with first update
        updateElapsed();
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [startTime, isRunning, duration]);
    return {
        elapsed,
        display: formatDuration(elapsed),
    };
}
/**
 * Format duration in humanized way
 * - < 1000ms: "523ms"
 * - 1s-10s: "5.2s" (1 decimal)
 * - 10s-60s: "45s" (no decimal)
 * - >= 60s: "1m11s"
 */
function formatDuration(ms) {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    if (ms < 10000) {
        // 1-10s: show 1 decimal
        const seconds = ms / 1000;
        return `${seconds.toFixed(1)}s`;
    }
    if (ms < 60000) {
        // 10-60s: no decimal
        const seconds = Math.round(ms / 1000);
        return `${seconds}s`;
    }
    // >= 60s: show minutes and seconds
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m${seconds}s`;
}
//# sourceMappingURL=useElapsedTime.js.map
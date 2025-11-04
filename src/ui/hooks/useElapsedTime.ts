/**
 * useElapsedTime Hook
 * Real-time elapsed time calculation with adaptive update frequency
 *
 * Design: Adaptive update frequency based on elapsed time
 * - < 1000ms: Update every 50ms for smooth progress
 * - 1000-10000ms: Update every 100ms
 * - > 10000ms: Update every 500ms (less frequent for long operations)
 *
 * Humanized display:
 * - < 1000ms: Show in ms (e.g., "523ms")
 * - >= 1000ms: Show in seconds with 1 decimal (e.g., "1.2s", "12.5s")
 */

import { useState, useEffect } from 'react';

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
   * - >= 1000ms: "1.2s"
   */
  display: string;
}

/**
 * Calculate elapsed time with adaptive updates
 */
export function useElapsedTime(options: ElapsedTimeOptions): ElapsedTimeResult {
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

    // Adaptive update interval based on elapsed time
    const getUpdateInterval = (elapsed: number): number => {
      if (elapsed < 1000) return 50;      // < 1s: update every 50ms
      if (elapsed < 10000) return 100;    // 1-10s: update every 100ms
      return 500;                          // > 10s: update every 500ms
    };

    let intervalId: NodeJS.Timeout;

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
 * - >= 1000ms: "1.2s"
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  const seconds = ms / 1000;
  return `${seconds.toFixed(1)}s`;
}

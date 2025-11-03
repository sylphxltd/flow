/**
 * useFPS Hook
 * Tracks rendering performance by measuring render frequency
 *
 * PERFORMANCE MONITORING (Node.js/Terminal):
 * - Tracks the component's own render frequency
 * - Use this hook in parent components (like Chat) to measure render activity
 * - Samples every 1 second to calculate average renders per second
 * - Returns current RPS (renders per second) and performance indicators
 *
 * INTERPRETATION:
 * - Low RPS (<10) = Good (minimal re-renders)
 * - Medium RPS (10-30) = Acceptable (moderate re-renders)
 * - High RPS (>30) = Poor (excessive re-renders)
 *
 * NOTE: Place this hook in the Chat component or other high-level components
 * to get meaningful metrics. StatusBar itself will re-render when FPS updates,
 * so we skip FPS updates if they haven't changed significantly.
 */

import { useState, useEffect, useRef } from 'react';

interface FPSStats {
  fps: number;
  isDegraded: boolean; // true if RPS > 10 (many re-renders)
  isSlow: boolean;     // true if RPS > 30 (excessive re-renders)
}

const FPS_THRESHOLD_DEGRADED = 10;  // More than 10 renders/sec is concerning
const FPS_THRESHOLD_SLOW = 30;      // More than 30 renders/sec is very bad
const SAMPLE_INTERVAL = 1000;       // Sample every 1 second

export function useFPS(): FPSStats {
  const [fps, setFps] = useState(0); // Start at 0
  const renderCountRef = useRef(0);
  const lastSampleTimeRef = useRef<number>(Date.now());
  const lastReportedFpsRef = useRef(0);

  // Increment render count on every render
  renderCountRef.current++;

  useEffect(() => {
    // Sample RPS periodically
    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastSampleTimeRef.current;

      if (elapsed > 0) {
        // Calculate renders per second
        const rendersPerSecond = Math.round((renderCountRef.current / elapsed) * 1000);

        // Only update if FPS changed by at least 2 to avoid self-triggering cascade
        if (Math.abs(rendersPerSecond - lastReportedFpsRef.current) >= 2) {
          setFps(rendersPerSecond);
          lastReportedFpsRef.current = rendersPerSecond;
        }

        // Reset counter
        renderCountRef.current = 0;
        lastSampleTimeRef.current = now;
      }
    }, SAMPLE_INTERVAL);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return {
    fps,
    isDegraded: fps > FPS_THRESHOLD_DEGRADED,
    isSlow: fps > FPS_THRESHOLD_SLOW,
  };
}

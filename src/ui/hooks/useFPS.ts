/**
 * useFPS Hook
 * Tracks rendering performance by measuring frames per second
 *
 * PERFORMANCE MONITORING (Node.js/Terminal):
 * - Tracks component render calls to measure rendering frequency
 * - Samples every 500ms to calculate FPS
 * - Returns current FPS and whether performance is degraded
 *
 * NOTE: In terminal environments, FPS is based on component re-render frequency,
 * not browser animation frames. Ideal is low FPS (components not re-rendering unnecessarily).
 */

import { useState, useEffect, useRef } from 'react';

interface FPSStats {
  fps: number;
  isDegraded: boolean; // true if FPS > 30 (too many re-renders)
  isSlow: boolean;     // true if FPS > 60 (excessive re-renders)
}

const FPS_THRESHOLD_DEGRADED = 30;  // More than 30 renders/sec is excessive
const FPS_THRESHOLD_SLOW = 60;      // More than 60 renders/sec is very bad
const SAMPLE_INTERVAL = 500;        // Sample every 500ms

export function useFPS(): FPSStats {
  const [fps, setFps] = useState(0); // Start at 0
  const renderCountRef = useRef(0);
  const lastSampleTimeRef = useRef<number>(Date.now());

  // Increment render count on every render
  renderCountRef.current++;

  useEffect(() => {
    // Sample FPS periodically
    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastSampleTimeRef.current;

      if (elapsed > 0) {
        // Calculate renders per second
        const rendersPerSecond = Math.round((renderCountRef.current / elapsed) * 1000);
        setFps(rendersPerSecond);

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

/**
 * useFPS Hook
 * Tracks rendering performance by measuring frames per second
 *
 * PERFORMANCE MONITORING:
 * - Uses requestAnimationFrame to measure actual render frames
 * - Calculates rolling average over 1 second window
 * - Returns current FPS and whether performance is degraded
 */

import { useState, useEffect, useRef } from 'react';

interface FPSStats {
  fps: number;
  isDegraded: boolean; // true if FPS < 30
  isSlow: boolean;     // true if FPS < 15
}

const FPS_THRESHOLD_DEGRADED = 30;
const FPS_THRESHOLD_SLOW = 15;
const MEASUREMENT_WINDOW = 1000; // 1 second in ms

export function useFPS(): FPSStats {
  const [fps, setFps] = useState(60); // Optimistic default
  const frameTimesRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    let isActive = true;

    const measureFrame = (currentTime: number) => {
      if (!isActive) return;

      // Calculate time since last frame
      const deltaTime = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;

      // Store frame time
      frameTimesRef.current.push(currentTime);

      // Remove frame times older than 1 second
      const cutoffTime = currentTime - MEASUREMENT_WINDOW;
      frameTimesRef.current = frameTimesRef.current.filter(time => time > cutoffTime);

      // Calculate FPS based on number of frames in the last second
      const frameCount = frameTimesRef.current.length;
      if (frameCount > 0) {
        const calculatedFps = frameCount;
        setFps(calculatedFps);
      }

      // Request next frame
      rafIdRef.current = requestAnimationFrame(measureFrame);
    };

    // Start measuring
    rafIdRef.current = requestAnimationFrame(measureFrame);

    // Cleanup
    return () => {
      isActive = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    fps,
    isDegraded: fps < FPS_THRESHOLD_DEGRADED,
    isSlow: fps < FPS_THRESHOLD_SLOW,
  };
}

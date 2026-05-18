// STEM-109: Reusable timer hook with millisecond precision.

import { useState, useRef, useCallback, useEffect } from 'react';

// STEM-109: 60Hz tick keeps display smooth without burning CPU.
const TICK_INTERVAL_MS = 16;

export function useTimer() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // STEM-109: Refs avoid stale closures inside the interval callback.
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  const tick = useCallback(() => {
    if (startTimeRef.current !== null) {
      setElapsedMs(Date.now() - startTimeRef.current);
    }
  }, []);

  const start = useCallback(() => {
    if (intervalRef.current !== null) return; // STEM-109: ignore double-start
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    setIsRunning(true);
    intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);
  }, [tick]);

  const stop = useCallback(() => {
    if (intervalRef.current === null) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;

    // STEM-109: Final read uses Date.now() rather than last tick — avoids ~16ms drift.
    if (startTimeRef.current !== null) {
      setElapsedMs(Date.now() - startTimeRef.current);
    }
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
    setElapsedMs(0);
    setIsRunning(false);
  }, []);

  // STEM-109: Clean up if the host unmounts mid-run.
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  return { elapsedMs, isRunning, start, stop, reset };
}

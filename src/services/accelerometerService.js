// STEM-127: Accelerometer service — sampling, magnitude calc, max-peak tracking.
//
// Wraps expo-sensors Accelerometer with a higher-level API:
//   - startSampling(opts) → returns a session you call .stop() on
//   - each session tracks samples, calculates live magnitude, and remembers peak
//
// Magnitude formula: sqrt(x² + y² + z²)
//   - At rest, gravity gives a baseline of ~1g (≈ 9.81 m/s² but expo-sensors
//     returns values in g-units, so resting magnitude is ~1.0)
//   - Vibration shows up as deviation from baseline
//   - We track netMagnitude = abs(magnitude - 1) so a still phone reads ~0
//
// Activity 4 (Earthquake): uses peak netMagnitude as the result
// Activity 5 (Stretch): uses raw samples for variance/jerk calc

import { Accelerometer } from 'expo-sensors';

const GRAVITY = 1.0; // expo-sensors returns g-units, 1.0 ≈ 9.81 m/s²

/**
 * Start an accelerometer sampling session.
 *
 * @param {Object} [options]
 * @param {number} [options.intervalMs=100]     sample interval in ms
 * @param {function} [options.onSample]         called for every sample: (sample) => void
 * @returns {Promise<Session>}
 *
 * Session API:
 *   - getSamples()       → array of {x, y, z, magnitude, netMagnitude, t}
 *   - getCurrent()       → most recent sample (or null)
 *   - getPeak()          → highest netMagnitude seen this session (or 0)
 *   - getDurationMs()    → time since start
 *   - stop()             → stops sampling, returns final session data
 *   - reset()            → clears samples and peak, keeps subscription alive
 */
export async function startSampling({ intervalMs = 100, onSample } = {}) {
  // Check availability — useful for web/simulator where sensors may not exist
  const available = await Accelerometer.isAvailableAsync();
  if (!available) {
    throw new Error(
      'Accelerometer is not available on this device. Test on a real phone via Expo Go.'
    );
  }

  // Configure sample rate (expo-sensors accepts ms)
  Accelerometer.setUpdateInterval(intervalMs);

  const samples = [];
  let currentSample = null;
  let peakNetMagnitude = 0;
  const startedAt = Date.now();

  const subscription = Accelerometer.addListener((reading) => {
    const { x, y, z } = reading;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const netMagnitude = Math.abs(magnitude - GRAVITY);

    const sample = {
      x,
      y,
      z,
      magnitude,
      netMagnitude,
      t: Date.now() - startedAt, // ms since session start
    };

    samples.push(sample);
    currentSample = sample;

    if (netMagnitude > peakNetMagnitude) {
      peakNetMagnitude = netMagnitude;
    }

    if (onSample) onSample(sample);
  });

  return {
    getSamples: () => [...samples],
    getCurrent: () => currentSample,
    getPeak: () => peakNetMagnitude,
    getDurationMs: () => Date.now() - startedAt,
    stop: () => {
      subscription.remove();
      return {
        samples: [...samples],
        peak: peakNetMagnitude,
        durationMs: Date.now() - startedAt,
        sampleCount: samples.length,
      };
    },
    reset: () => {
      samples.length = 0;
      currentSample = null;
      peakNetMagnitude = 0;
    },
  };
}

/**
 * Check whether the accelerometer is available without starting a session.
 * Useful for showing a "sensor not available" UI on web/simulator.
 */
export async function isAccelerometerAvailable() {
  return Accelerometer.isAvailableAsync();
}
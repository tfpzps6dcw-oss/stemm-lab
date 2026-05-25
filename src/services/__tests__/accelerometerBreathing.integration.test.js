// STEM-139 (P2 integration test): Accelerometer service → breathing rate pipeline.
//
// This is an INTEGRATION test: it exercises two units working together —
//   1. accelerometerService.startSampling()  (collects samples)
//   2. calculateBreathingRate()               (analyses those samples)
//
// expo-sensors is mocked so no real device is needed. We push a synthetic
// "breathing" signal (a slow sine wave on the z-axis) through the listener,
// then confirm the breathing-rate algorithm recovers a sensible BPM.

// --- Mock expo-sensors before importing the service that uses it ---
let registeredListener = null;

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    isAvailableAsync: jest.fn().mockResolvedValue(true),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn((cb) => {
      registeredListener = cb;
      return { remove: jest.fn() };
    }),
  },
}));

import { startSampling } from '../accelerometerService';
import { calculateBreathingRate } from '../breathingRate';

describe('accelerometer → breathing rate integration', () => {
  beforeEach(() => {
    registeredListener = null;
  });

  test('a simulated ~15 BPM breathing signal is recovered end to end', async () => {
    // Start a sampling session (mocked sensor)
    const session = await startSampling({ intervalMs: 100 });

    // The service should have registered a listener with the (mocked) sensor
    expect(registeredListener).not.toBeNull();

    // Simulate 30 seconds of breathing at ~15 BPM (a 4-second breath cycle).
    // We feed readings directly into the listener the service registered.
    const SAMPLES = 300;     // 30s at 10 Hz
    const INTERVAL = 100;    // ms
    let now = 0;
    const realNow = Date.now;
    for (let i = 0; i < SAMPLES; i++) {
      now = i * INTERVAL;
      // Make Date.now() advance deterministically so sample timestamps are spaced
      Date.now = () => now;
      const breathPhase = (now / 4000) * 2 * Math.PI; // 4s per breath = 15 BPM
      const z = 1 + Math.sin(breathPhase) * 0.05;     // chest rise/fall on z-axis
      registeredListener({ x: 0, y: 0, z });
    }
    Date.now = realNow; // restore

    // Stop the session and pull the captured samples
    const { samples } = session.stop();
    expect(samples.length).toBe(SAMPLES);

    // Feed the captured samples into the breathing-rate analyser
    const result = calculateBreathingRate(samples);

    // We expect roughly 15 BPM — allow a tolerance for edge effects / rounding
    expect(result.bpm).toBeGreaterThanOrEqual(12);
    expect(result.bpm).toBeLessThanOrEqual(18);
    expect(result.confidence).toBe('good');
  });

  test('throws a clear error when the sensor is unavailable', async () => {
    const { Accelerometer } = require('expo-sensors');
    Accelerometer.isAvailableAsync.mockResolvedValueOnce(false);

    await expect(startSampling()).rejects.toThrow(/not available/i);
  });
});

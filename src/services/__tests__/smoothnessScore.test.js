// STEM-131 (P2 unit test): Tests for the smoothness score algorithm used by Activity 5 (Stretch).
//
// These are pure-function unit tests — no device, no sensors, no async.
// We feed in synthetic accelerometer sample arrays and assert the score behaves correctly.

import { calculateSmoothness } from '../smoothnessScore';

// Helper: build a "perfectly still" sample set — no movement, netMagnitude ~0.
function makeStillSamples(count = 50, intervalMs = 50) {
  return Array.from({ length: count }, (_, i) => ({
    x: 0,
    y: 0,
    z: 1,
    magnitude: 1,        // resting at 1g
    netMagnitude: 0,     // no deviation from gravity
    t: i * intervalMs,
  }));
}

// Helper: build a "jerky" sample set — large random swings in magnitude.
function makeJerkySamples(count = 50, intervalMs = 50) {
  return Array.from({ length: count }, (_, i) => {
    const noise = (i % 2 === 0 ? 1 : -1) * 0.8; // alternating large swings
    return {
      x: 0,
      y: 0,
      z: 1 + noise,
      magnitude: 1 + noise,
      netMagnitude: Math.abs(noise),
      t: i * intervalMs,
    };
  });
}

describe('calculateSmoothness', () => {
  test('returns score 0 for empty or too-short input', () => {
    expect(calculateSmoothness([]).score).toBe(0);
    expect(calculateSmoothness([{ magnitude: 1, netMagnitude: 0, t: 0 }]).score).toBe(0);
  });

  test('perfectly still motion scores 100 (maximum smoothness)', () => {
    const result = calculateSmoothness(makeStillSamples());
    expect(result.score).toBe(100);
    expect(result.variance).toBe(0);
    expect(result.meanJerk).toBe(0);
  });

  test('jerky motion scores well below still motion', () => {
    const still = calculateSmoothness(makeStillSamples());
    const jerky = calculateSmoothness(makeJerkySamples());
    expect(jerky.score).toBeLessThan(still.score);
    expect(jerky.score).toBeLessThanOrEqual(60); // jerky motion is penalised
    expect(jerky.meanJerk).toBeGreaterThan(0);   // jerk was detected
  });

  test('score is always clamped between 0 and 100', () => {
    const result = calculateSmoothness(makeJerkySamples(200));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test('reports the number of samples processed', () => {
    const result = calculateSmoothness(makeStillSamples(30));
    expect(result.sampleCount).toBe(30);
  });
});

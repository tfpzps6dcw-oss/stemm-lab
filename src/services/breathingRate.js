// STEM-139: Breathing rate algorithm — chest rise detection from accelerometer samples.
//
// Approach:
//   - Phone rests on chest, accelerometer's z-axis tracks chest movement
//   - Inhale lifts the phone slightly (z dips below 1g), exhale settles it back
//   - We smooth the magnitude signal then count zero-crossings of (magnitude − baseline)
//   - Each full breath = inhale + exhale = 1 cycle
//   - BPM = breaths × (60000 / durationMs)
//
// This is a coarse estimate — good enough to distinguish "at rest" (~12–18 BPM)
// from "after exercise" (~25–40 BPM), which is what Activity 7 needs.

const MIN_CYCLE_MS = 800;     // ignore "breaths" shorter than 0.8s (noise)
const SMOOTHING_WINDOW = 5;   // moving-average window in samples

/**
 * Calculate breaths per minute from accelerometer samples.
 *
 * @param {Array<{magnitude:number, t:number}>} samples
 * @returns {{
 *   bpm: number,         // breaths per minute
 *   breathCount: number, // number of detected breath cycles
 *   durationMs: number,
 *   sampleCount: number,
 *   confidence: 'low' | 'ok' | 'good',  // crude quality marker
 * }}
 */
export function calculateBreathingRate(samples) {
  if (!Array.isArray(samples) || samples.length < 20) {
    return {
      bpm: 0,
      breathCount: 0,
      durationMs: 0,
      sampleCount: samples?.length ?? 0,
      confidence: 'low',
    };
  }

  const durationMs = samples[samples.length - 1].t - samples[0].t;
  if (durationMs <= 0) {
    return { bpm: 0, breathCount: 0, durationMs: 0, sampleCount: samples.length, confidence: 'low' };
  }

  // Smooth the magnitude with a moving average
  const smoothed = movingAverage(samples.map((s) => s.magnitude), SMOOTHING_WINDOW);

  // Baseline: mean of the smoothed signal
  const mean = smoothed.reduce((a, b) => a + b, 0) / smoothed.length;

  // Count "downward zero crossings" — points where the signal crosses below baseline
  // Each crossing roughly marks the start of an inhale
  let breathCount = 0;
  let lastCrossingT = -Infinity;
  for (let i = 1; i < smoothed.length; i++) {
    const prev = smoothed[i - 1];
    const cur = smoothed[i];
    if (prev >= mean && cur < mean) {
      const t = samples[i].t;
      if (t - lastCrossingT >= MIN_CYCLE_MS) {
        breathCount += 1;
        lastCrossingT = t;
      }
    }
  }

  const bpm = Math.round((breathCount * 60000) / durationMs);

  // Crude confidence — fewer than 3 detected breaths is unreliable
  let confidence = 'good';
  if (breathCount < 3) confidence = 'low';
  else if (breathCount < 6) confidence = 'ok';

  return { bpm, breathCount, durationMs, sampleCount: samples.length, confidence };
}

// Simple moving average — output length matches input, edges use partial windows
function movingAverage(values, window) {
  if (window <= 1) return [...values];
  const out = new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(values.length, i + Math.ceil(window / 2));
    let sum = 0;
    for (let j = start; j < end; j++) sum += values[j];
    out[i] = sum / (end - start);
  }
  return out;
}
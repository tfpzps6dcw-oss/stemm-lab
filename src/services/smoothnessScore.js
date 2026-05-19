// STEM-131: Smoothness score algorithm for Activity 5 (Stretch).
//
// Takes accelerometer samples from a timed stretch motion and produces a
// smoothness score out of 100 — higher is smoother.
//
// Two ingredients:
//   1. Magnitude variance — how much the acceleration magnitude jumps around.
//      Smooth motion = low variance.
//   2. Jerk = rate of change of acceleration. Smooth motion = low jerk.
//
// Final score blends both, normalised so a still hand reads near 100 and
// jerky/sudden motion reads low.

/**
 * Calculate smoothness from an array of accelerometer samples.
 *
 * @param {Array<{x:number,y:number,z:number,magnitude:number,netMagnitude:number,t:number}>} samples
 * @returns {{
 *   score: number,       // 0–100, higher is smoother
 *   variance: number,    // magnitude variance (raw)
 *   meanJerk: number,    // mean abs jerk (raw, in g/s)
 *   sampleCount: number,
 *   durationMs: number,
 * }}
 */
export function calculateSmoothness(samples) {
  if (!Array.isArray(samples) || samples.length < 2) {
    return {
      score: 0,
      variance: 0,
      meanJerk: 0,
      sampleCount: samples?.length ?? 0,
      durationMs: 0,
    };
  }

  // --- Variance of net magnitude ---
  const mags = samples.map((s) => s.netMagnitude);
  const mean = mags.reduce((a, b) => a + b, 0) / mags.length;
  const variance =
    mags.reduce((acc, v) => acc + (v - mean) ** 2, 0) / mags.length;

  // --- Mean absolute jerk: |dMagnitude/dt| averaged across samples ---
  // jerk_i = |mag_i - mag_{i-1}| / dt_i  (dt in seconds)
  let jerkSum = 0;
  let jerkCount = 0;
  for (let i = 1; i < samples.length; i++) {
    const dt = (samples[i].t - samples[i - 1].t) / 1000; // ms → seconds
    if (dt <= 0) continue;
    const dMag = Math.abs(samples[i].magnitude - samples[i - 1].magnitude);
    jerkSum += dMag / dt;
    jerkCount += 1;
  }
  const meanJerk = jerkCount > 0 ? jerkSum / jerkCount : 0;

  // --- Score ---
  // Heuristic mapping: variance + jerk get penalty terms, score = 100 - penalty.
  // Constants chosen so a steady arm sweep scores ~70–90, fast jerky motion <40.
  const variancePenalty = Math.min(60, variance * 600);   // up to 60 points
  const jerkPenalty     = Math.min(40, meanJerk * 8);     // up to 40 points
  const rawScore = 100 - variancePenalty - jerkPenalty;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  const durationMs = samples[samples.length - 1].t - samples[0].t;

  return {
    score,
    variance,
    meanJerk,
    sampleCount: samples.length,
    durationMs,
  };
}
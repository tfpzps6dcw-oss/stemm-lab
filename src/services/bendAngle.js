// STEM-124: Bend angle helpers for Activity 3 (Hand Fan Challenge) — validation + prediction comparison.

// STEM-124: Bend angles run from 0° (paper flat) to ~90° (folded flush).
//   Anything beyond 90° usually means the student measured the wrong angle.
const MIN_ANGLE = 0;
const MAX_ANGLE = 90;

// STEM-124: ±10° tolerance for "correct" prediction — generous because eyeballing angles is hard.
const VERDICT_TOLERANCE = 10;

// STEM-124: Parse + validate a typed angle. Returns the number if valid, null otherwise.
export function parseAngle(input) {
  if (input == null || input === '') return null;
  const value = parseFloat(input);
  if (!Number.isFinite(value)) return null;
  if (value < MIN_ANGLE || value > MAX_ANGLE) return null;
  return value;
}

// STEM-124: Was the prediction within tolerance? Returns 'correct' | 'incorrect' | null.
export function getAngleVerdict(predictedInput, actualInput) {
  const predicted = parseAngle(predictedInput);
  const actual = parseAngle(actualInput);
  if (predicted === null || actual === null) return null;

  return Math.abs(predicted - actual) <= VERDICT_TOLERANCE ? 'correct' : 'incorrect';
}

// STEM-124: Find the design that bent the most — answers "which fan moved the paper most?".
export function getMostBent(attempts) {
  const valid = attempts.filter((a) => parseAngle(a.actualAngle) !== null && a.designName);
  if (valid.length === 0) return null;
  return valid.reduce((prev, curr) =>
    parseAngle(curr.actualAngle) > parseAngle(prev.actualAngle) ? curr : prev
  ).designName;
}

// STEM-124: Constants exposed so the UI can show "Enter a value 0-90".
export const ANGLE_LIMITS = { min: MIN_ANGLE, max: MAX_ANGLE, tolerance: VERDICT_TOLERANCE };

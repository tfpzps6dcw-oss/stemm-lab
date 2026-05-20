// STEM-119: Convert raw amplitude (dBFS) → classroom-friendly relative dB scale (0-140).

// STEM-119: Calibration anchors — chosen empirically so common classroom sounds land on familiar dB values.
//   expo-audio metering ranges from ~-160 (silent) to ~0 (clipping).
//   We map -160 dBFS → 0 dB ("silence") and 0 dBFS → 140 dB ("threshold of pain").
const DBFS_MIN = -60;  // STEM-119: Below this we treat as effective silence.
const DBFS_MAX = 0;    // STEM-119: 0 dBFS is the loudest the mic can register.
const DB_MIN = 30;     // STEM-119: Quiet classroom baseline ≈ 30 dB.
const DB_MAX = 110;    // STEM-119: Phone mics saturate well before true 140 dB; 110 is realistic ceiling.

// STEM-119: Map a dBFS reading from expo-audio metering to a 0-140 dB display value.
export function dbfsToDecibels(dbfs) {
  if (typeof dbfs !== 'number' || !Number.isFinite(dbfs)) return DB_MIN;

  // STEM-119: Clamp to our calibration range first.
  const clamped = Math.max(DBFS_MIN, Math.min(DBFS_MAX, dbfs));

  // STEM-119: Linear interpolation across the calibration range.
  const t = (clamped - DBFS_MIN) / (DBFS_MAX - DBFS_MIN);
  return DB_MIN + t * (DB_MAX - DB_MIN);
}

// STEM-119: Risk thresholds from the spec — used to label dB readings on the UI.
const RISK_LEVELS = [
  { max: 30,  label: 'Whisper',           risk: 'No risk',                  color: '#10B981' },
  { max: 60,  label: 'Normal',            risk: 'Safe',                     color: '#10B981' },
  { max: 85,  label: 'Busy',              risk: 'Long exposure tiring',     color: '#F59E0B' },
  { max: 90,  label: 'Loud',              risk: 'Damage possible',          color: '#F59E0B' },
  { max: 100, label: 'Very loud',         risk: 'Damage likely',            color: '#EF4444' },
  { max: 110, label: 'Extremely loud',    risk: 'Serious damage in minutes',color: '#EF4444' },
  { max: 120, label: 'Painful',           risk: 'Immediate damage possible',color: '#DC2626' },
  { max: 130, label: 'Hazardous',         risk: 'Severe damage immediate',  color: '#DC2626' },
  { max: 999, label: 'Dangerous',         risk: 'Permanent damage instant', color: '#7F1D1D' },
];

// STEM-119: Return the risk band for a given dB value — drives the colour + label on the live display.
export function getRiskLevel(db) {
  if (typeof db !== 'number' || !Number.isFinite(db)) {
    return RISK_LEVELS[0];
  }
  return RISK_LEVELS.find((level) => db <= level.max) ?? RISK_LEVELS[RISK_LEVELS.length - 1];
}

// STEM-119: Convenience — get both decibels and risk label in one call.
export function processAmplitude(dbfs) {
  const db = dbfsToDecibels(dbfs);
  const risk = getRiskLevel(db);
  return { db, risk };
}

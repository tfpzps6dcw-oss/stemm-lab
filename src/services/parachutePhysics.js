// STEM-110: Physics calculations for Activity 1 Parachute Drop.

const GRAVITY = 9.8; // m/s² — standard Earth gravity used across formulas

// STEM-110: v = d / t (initial velocity is 0 when dropped, not thrown).
export function calculateVelocity(distance, time) {
  requirePositive('distance', distance);
  requirePositive('time', time);
  return distance / time;
}

// STEM-110: a = Δv / t. Object dropped from rest so initialVelocity defaults to 0.
export function calculateAcceleration(finalVelocity, time, initialVelocity = 0) {
  requireNumber('finalVelocity', finalVelocity);
  requirePositive('time', time);
  requireNumber('initialVelocity', initialVelocity);
  return (finalVelocity - initialVelocity) / time;
}

// STEM-110: Newton's 2nd law — F = ma.
export function calculateNetForce(mass, acceleration) {
  requirePositive('mass', mass);
  requireNumber('acceleration', acceleration);
  return mass * acceleration;
}

// STEM-110: Weight = mg.
export function calculateWeight(mass) {
  requirePositive('mass', mass);
  return mass * GRAVITY;
}

// STEM-110: Drag = Weight - NetForce (what the parachute pushed back with).
export function calculateDragForce(mass, netForce) {
  requirePositive('mass', mass);
  requireNumber('netForce', netForce);
  return calculateWeight(mass) - netForce;
}

// STEM-110: G-force when toy doesn't bounce — single impact velocity change.
export function calculateGForceNoBounce(impactSpeed, contactTime) {
  requirePositive('impactSpeed', impactSpeed);
  requirePositive('contactTime', contactTime);
  return impactSpeed / contactTime / GRAVITY;
}

// STEM-110: G-force when toy bounces — velocity reverses direction so Δv is larger.
export function calculateGForceWithBounce(impactSpeed, upSpeed, contactTime) {
  requirePositive('impactSpeed', impactSpeed);
  requirePositive('upSpeed', upSpeed);
  requirePositive('contactTime', contactTime);
  return (impactSpeed + upSpeed) / contactTime / GRAVITY;
}

// STEM-110: Reverse-engineer rebound speed from time-to-peak (vUp = g * tUp).
export function calculateUpSpeedFromBounceTime(timeToMaxHeight) {
  requirePositive('timeToMaxHeight', timeToMaxHeight);
  return GRAVITY * timeToMaxHeight;
}

// --- helpers ---

function requireNumber(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number, got ${value}`);
  }
}

function requirePositive(name, value) {
  requireNumber(name, value);
  if (value <= 0) {
    throw new Error(`${name} must be greater than 0, got ${value}`);
  }
}

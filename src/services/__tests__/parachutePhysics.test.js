// STEM-113: Unit tests for parachute physics — covers spec examples + edge cases.

import {
  calculateVelocity,
  calculateAcceleration,
  calculateNetForce,
  calculateWeight,
  calculateDragForce,
  calculateGForceNoBounce,
  calculateGForceWithBounce,
  calculateUpSpeedFromBounceTime,
} from '../parachutePhysics';

// STEM-113: Spec uses g=9.8 throughout — we verify against worked examples.

describe('calculateVelocity', () => {
  test('spec example: 1.0m / 0.5s = 2.0 m/s', () => {
    expect(calculateVelocity(1.0, 0.5)).toBeCloseTo(2.0, 5);
  });

  test('throws on zero or negative inputs', () => {
    expect(() => calculateVelocity(0, 0.5)).toThrow(/distance/);
    expect(() => calculateVelocity(-1, 0.5)).toThrow(/distance/);
    expect(() => calculateVelocity(1, 0)).toThrow(/time/);
    expect(() => calculateVelocity(1, -0.5)).toThrow(/time/);
  });

  test('throws on non-number inputs', () => {
    expect(() => calculateVelocity('1', 0.5)).toThrow(/distance/);
    expect(() => calculateVelocity(1, null)).toThrow(/time/);
    expect(() => calculateVelocity(1, NaN)).toThrow(/time/);
  });
});

describe('calculateAcceleration', () => {
  test('spec example: dropped from rest, 2.0 m/s in 0.5s → 4.0 m/s²', () => {
    expect(calculateAcceleration(2.0, 0.5)).toBeCloseTo(4.0, 5);
  });

  test('initialVelocity defaults to 0', () => {
    const withDefault = calculateAcceleration(2.0, 0.5);
    const withExplicit = calculateAcceleration(2.0, 0.5, 0);
    expect(withDefault).toBe(withExplicit);
  });

  test('handles non-zero initial velocity', () => {
    // (10 - 4) / 2 = 3
    expect(calculateAcceleration(10, 2, 4)).toBeCloseTo(3, 5);
  });

  test('throws on zero or negative time', () => {
    expect(() => calculateAcceleration(2, 0)).toThrow(/time/);
    expect(() => calculateAcceleration(2, -1)).toThrow(/time/);
  });
});

describe('calculateNetForce', () => {
  test('spec example: 0.20kg × 4.0 m/s² = 0.8 N', () => {
    expect(calculateNetForce(0.20, 4.0)).toBeCloseTo(0.8, 5);
  });

  test('throws on non-positive mass', () => {
    expect(() => calculateNetForce(0, 4)).toThrow(/mass/);
    expect(() => calculateNetForce(-0.1, 4)).toThrow(/mass/);
  });

  test('accepts zero or negative acceleration (deceleration is valid)', () => {
    expect(calculateNetForce(0.2, 0)).toBe(0);
    expect(calculateNetForce(0.2, -4)).toBeCloseTo(-0.8, 5);
  });
});

describe('calculateWeight', () => {
  test('spec example: 0.20kg × 9.8 = 1.96 N', () => {
    expect(calculateWeight(0.20)).toBeCloseTo(1.96, 5);
  });

  test('throws on non-positive mass', () => {
    expect(() => calculateWeight(0)).toThrow(/mass/);
    expect(() => calculateWeight(-1)).toThrow(/mass/);
  });
});

describe('calculateDragForce', () => {
  test('spec example: Weight 1.96N - NetForce 0.8N = 1.16 N drag', () => {
    expect(calculateDragForce(0.20, 0.8)).toBeCloseTo(1.16, 5);
  });

  test('drag is zero when no parachute (net force equals weight)', () => {
    expect(calculateDragForce(0.20, 1.96)).toBeCloseTo(0, 5);
  });

  test('throws on invalid mass', () => {
    expect(() => calculateDragForce(0, 0.8)).toThrow(/mass/);
  });
});

describe('calculateGForceNoBounce', () => {
  test('spec example: 2.0 m/s impact, 0.05s contact ≈ 4.1g', () => {
    expect(calculateGForceNoBounce(2.0, 0.05)).toBeCloseTo(4.0816, 3);
  });

  test('shorter contact time means higher g-force', () => {
    const longer = calculateGForceNoBounce(2.0, 0.1);
    const shorter = calculateGForceNoBounce(2.0, 0.05);
    expect(shorter).toBeGreaterThan(longer);
  });

  test('throws on non-positive inputs', () => {
    expect(() => calculateGForceNoBounce(0, 0.05)).toThrow(/impactSpeed/);
    expect(() => calculateGForceNoBounce(2, 0)).toThrow(/contactTime/);
  });
});

describe('calculateGForceWithBounce', () => {
  test('spec example: 2.0 down + 1.47 up over 0.02s ≈ 17.7g', () => {
    // (2.0 + 1.47) / 0.02 / 9.8 = 17.704
    expect(calculateGForceWithBounce(2.0, 1.47, 0.02)).toBeCloseTo(17.704, 2);
  });

  test('bouncing always produces higher g-force than not bouncing (same impact + time)', () => {
    const noBounce = calculateGForceNoBounce(2.0, 0.02);
    const withBounce = calculateGForceWithBounce(2.0, 1.0, 0.02);
    expect(withBounce).toBeGreaterThan(noBounce);
  });

  test('throws on non-positive inputs', () => {
    expect(() => calculateGForceWithBounce(0, 1, 0.02)).toThrow(/impactSpeed/);
    expect(() => calculateGForceWithBounce(2, 0, 0.02)).toThrow(/upSpeed/);
    expect(() => calculateGForceWithBounce(2, 1, 0)).toThrow(/contactTime/);
  });
});

describe('calculateUpSpeedFromBounceTime', () => {
  test('spec example: 0.15s to peak → 1.47 m/s', () => {
    expect(calculateUpSpeedFromBounceTime(0.15)).toBeCloseTo(1.47, 2);
  });

  test('throws on non-positive time', () => {
    expect(() => calculateUpSpeedFromBounceTime(0)).toThrow(/timeToMaxHeight/);
    expect(() => calculateUpSpeedFromBounceTime(-0.1)).toThrow(/timeToMaxHeight/);
  });
});

describe('end-to-end spec scenario', () => {
  // STEM-113: Full worked example from the spec — 1m drop, 0.5s fall, 0.20kg toy.
  test('1m drop, 0.5s fall, 0.20kg → matches spec values', () => {
    const distance = 1.0;
    const time = 0.5;
    const mass = 0.20;

    const v = calculateVelocity(distance, time);          // 2.0
    const a = calculateAcceleration(v, time);             // 4.0
    const netF = calculateNetForce(mass, a);              // 0.8
    const weight = calculateWeight(mass);                 // 1.96
    const drag = calculateDragForce(mass, netF);          // 1.16

    expect(v).toBeCloseTo(2.0, 5);
    expect(a).toBeCloseTo(4.0, 5);
    expect(netF).toBeCloseTo(0.8, 5);
    expect(weight).toBeCloseTo(1.96, 5);
    expect(drag).toBeCloseTo(1.16, 5);
  });
});

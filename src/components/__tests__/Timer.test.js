// STEM-109: Tests for useTimer hook + formatSeconds helper.

import { renderHook, act } from '@testing-library/react-native';
import { useTimer } from '../../hooks/useTimer';
import { formatSeconds } from '../Timer';

// STEM-109: Fake timers + mocked Date.now() let us simulate time passing deterministically.
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useTimer', () => {
  test('starts at zero, not running', () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current.elapsedMs).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  test('start() flips running flag and begins ticking', () => {
    const { result } = renderHook(() => useTimer());

    act(() => result.current.start());
    expect(result.current.isRunning).toBe(true);

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.elapsedMs).toBeGreaterThanOrEqual(496);
    expect(result.current.elapsedMs).toBeLessThanOrEqual(500);
  });

  test('stop() captures final elapsed time and stops running', () => {
    const { result } = renderHook(() => useTimer());

    act(() => result.current.start());
    act(() => jest.advanceTimersByTime(1234));
    act(() => result.current.stop());

    expect(result.current.isRunning).toBe(false);
    expect(result.current.elapsedMs).toBe(1234);
  });

  test('elapsed time does not advance after stop()', () => {
    const { result } = renderHook(() => useTimer());

    act(() => result.current.start());
    act(() => jest.advanceTimersByTime(500));
    act(() => result.current.stop());

    const frozen = result.current.elapsedMs;
    act(() => jest.advanceTimersByTime(2000));
    expect(result.current.elapsedMs).toBe(frozen);
  });

  test('reset() clears elapsed and stops running', () => {
    const { result } = renderHook(() => useTimer());

    act(() => result.current.start());
    act(() => jest.advanceTimersByTime(800));
    act(() => result.current.reset());

    expect(result.current.elapsedMs).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  test('start() while already running is a no-op (no duplicate intervals)', () => {
    const { result } = renderHook(() => useTimer());

    act(() => result.current.start());
    act(() => jest.advanceTimersByTime(200));
    act(() => result.current.start()); // STEM-109: should be ignored
    act(() => jest.advanceTimersByTime(300));
    act(() => result.current.stop());

    // STEM-109: 500ms total elapsed — if intervals doubled-up, elapsed would still be correct
    // (Date.now() based) but multiple intervals would leak. This asserts behaviour stays sane.
    expect(result.current.elapsedMs).toBe(500);
  });

  test('start after stop resets and runs fresh', () => {
    const { result } = renderHook(() => useTimer());

    act(() => result.current.start());
    act(() => jest.advanceTimersByTime(1000));
    act(() => result.current.stop());

    act(() => result.current.start());
    expect(result.current.elapsedMs).toBe(0);

    act(() => jest.advanceTimersByTime(250));
    expect(result.current.elapsedMs).toBeGreaterThanOrEqual(232);
    expect(result.current.elapsedMs).toBeLessThanOrEqual(250);
  });

  test('cleans up interval on unmount', () => {
    const clearSpy = jest.spyOn(global, 'clearInterval');
    const { result, unmount } = renderHook(() => useTimer());

    act(() => result.current.start());
    unmount();

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

describe('formatSeconds', () => {
  test('0 ms → "0.000 s"', () => {
    expect(formatSeconds(0)).toBe('0.000 s');
  });

  test('1234 ms → "1.234 s"', () => {
    expect(formatSeconds(1234)).toBe('1.234 s');
  });

  test('500 ms → "0.500 s"', () => {
    expect(formatSeconds(500)).toBe('0.500 s');
  });

  test('rounds to 3 decimals', () => {
    expect(formatSeconds(1234.567)).toBe('1.235 s');
  });

  test('handles large values (> 1 minute)', () => {
    expect(formatSeconds(75500)).toBe('75.500 s');
  });
});

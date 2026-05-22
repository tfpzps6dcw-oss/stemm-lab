// STEM-147: Battery monitoring service — exposes battery level and charging state.
//   Used by BatteryIndicator component to warn students when battery is low,
//   since sensor-heavy activities (camera, accelerometer) drain battery fast.

import { useState, useEffect } from 'react';
import * as Battery from 'expo-battery';

// STEM-147: Low battery threshold — show warning below 20%.
const LOW_BATTERY_THRESHOLD = 0.2;

// STEM-147: Hook for battery monitoring — returns { level, isCharging, isLow }.
//   Subscribes to real-time updates so the UI stays current without polling.
export function useBattery() {
  const [level, setLevel] = useState(null);
  const [isCharging, setIsCharging] = useState(false);

  useEffect(() => {
    let levelSub = null;
    let stateSub = null;

    // STEM-147: Get initial values on mount.
    async function init() {
      try {
        const currentLevel = await Battery.getBatteryLevelAsync();
        const currentState = await Battery.getBatteryStateAsync();

        setLevel(currentLevel);
        setIsCharging(
          currentState === Battery.BatteryState.CHARGING ||
          currentState === Battery.BatteryState.FULL
        );
      } catch (err) {
        // STEM-147: Battery API unavailable (e.g. simulator) — fail silently.
        console.warn('Battery init failed (non-fatal):', err?.message ?? err);
      }
    }

    // STEM-147: Subscribe to real-time battery level changes.
    function subscribeLevel() {
      levelSub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
        setLevel(batteryLevel);
      });
    }

    // STEM-147: Subscribe to charging state changes.
    function subscribeState() {
      stateSub = Battery.addBatteryStateListener(({ batteryState }) => {
        setIsCharging(
          batteryState === Battery.BatteryState.CHARGING ||
          batteryState === Battery.BatteryState.FULL
        );
      });
    }

    init();
    subscribeLevel();
    subscribeState();

    // STEM-147: Cleanup subscriptions on unmount.
    return () => {
      if (levelSub) levelSub.remove();
      if (stateSub) stateSub.remove();
    };
  }, []);

  return {
    level,
    isCharging,
    isLow: level !== null && level < LOW_BATTERY_THRESHOLD && !isCharging,
    percentage: level !== null ? Math.round(level * 100) : null,
  };
}
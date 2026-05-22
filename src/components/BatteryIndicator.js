// STEM-147: Battery indicator component — shows battery % and warns when low.
//   Designed for the activity screen header so students know when to charge
//   before starting sensor-heavy activities.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useBattery } from '../services/batteryService';

export default function BatteryIndicator() {
  const { percentage, isCharging, isLow } = useBattery();

  // STEM-147: Don't render if battery API is unavailable (e.g. simulator).
  if (percentage === null) return null;

  return (
    <View style={[styles.container, isLow && styles.containerLow]}>
      {/* STEM-147: Battery icon — fills proportionally to level. */}
      <View style={styles.batteryOutline}>
        <View
          style={[
            styles.batteryFill,
            {
              width: `${Math.max(percentage, 5)}%`,
              backgroundColor: isLow ? '#EF4444' : isCharging ? '#10B981' : '#534AB7',
            },
          ]}
        />
        <View style={styles.batteryTip} />
      </View>

      <Text style={[styles.text, isLow && styles.textLow]}>
        {percentage}%{isCharging ? ' ⚡' : ''}
      </Text>

      {/* STEM-147: Low battery warning — visible below 20%. */}
      {isLow && (
        <Text style={styles.warning}>Low battery — charge before recording</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6,
    flexWrap: 'wrap',
  },
  containerLow: {
    backgroundColor: '#FEF2F2',
  },
  // STEM-147: Battery icon — small rectangular outline with proportional fill.
  batteryOutline: {
    width: 24,
    height: 12,
    borderWidth: 1.5,
    borderColor: '#6B7280',
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
    position: 'relative',
  },
  batteryFill: {
    height: '100%',
    borderRadius: 1,
  },
  batteryTip: {
    position: 'absolute',
    right: -4,
    top: 2,
    width: 2,
    height: 6,
    backgroundColor: '#6B7280',
    borderTopRightRadius: 1,
    borderBottomRightRadius: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  textLow: {
    color: '#EF4444',
    fontWeight: '600',
  },
  warning: {
    fontSize: 11,
    color: '#EF4444',
    width: '100%',
    marginTop: 2,
  },
});
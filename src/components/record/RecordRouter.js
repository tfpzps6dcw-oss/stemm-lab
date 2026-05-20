// STEM-111: Dispatcher for activity-specific Record tabs — keeps each activity isolated.
// STEM-120: Registered Activity 2 (Sound Pollution Hunter).
// STEM-125: Registered Activity 3 (Hand Fan Challenge).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Activity1Record from './Activity1Record';
import Activity2Record from './Activity2Record';
import Activity3Record from './Activity3Record';

// STEM-111: Map activity ID → Record component. Add activities here as they're built.
const RECORD_COMPONENTS = {
  1: Activity1Record,
  2: Activity2Record, // STEM-120
  3: Activity3Record, // STEM-125
};

export default function RecordRouter({ activity }) {
  const Component = RECORD_COMPONENTS[activity.id];

  if (!Component) {
    return (
      <View style={styles.placeholderBox}>
        <Text style={styles.placeholderLabel}>Sensor: {activity.sensor}</Text>
        <Text style={styles.placeholderTitle}>Coming soon</Text>
        <Text style={styles.placeholderBody}>
          Live recording for {activity.title} hasn't been built yet.
        </Text>
      </View>
    );
  }

  return <Component activity={activity} />;
}

const styles = StyleSheet.create({
  placeholderBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  placeholderLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  placeholderTitle: { fontSize: 16, fontWeight: '500', color: '#1A1A1A', marginBottom: 8 },
  placeholderBody: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
});

// STEM-111: Dispatcher for activity-specific Record tabs — keeps each activity isolated.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Activity1Record from './Activity1Record';
import Activity4Record from './Activity4Record';
import Activity5Record from './Activity5Record';
import Activity6Record from './Activity6Record';

const RECORD_COMPONENTS = {
  1: Activity1Record,
  4: Activity4Record,
  5: Activity5Record,
  6: Activity6Record,
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
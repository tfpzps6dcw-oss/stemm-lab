// STEM-111: Dispatcher for activity-specific Results tabs.
// STEM-121: Registered Activity 2 (Sound Pollution Hunter).
// STEM-125: Registered Activity 3 (Hand Fan Challenge).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ResultsTable from '../ResultsTable';
import Activity1Results from './Activity1Results';
import Activity2Results from './Activity2Results';
import Activity3Results from './Activity3Results';
import Activity4Results from './Activity4Results';
import Activity5Results from './Activity5Results';
import Activity6Results from './Activity6Results';
import Activity7Results from './Activity7Results';

const RESULTS_COMPONENTS = {
  1: Activity1Results,
  2: Activity2Results, // STEM-121
  3: Activity3Results, // STEM-125
  4: Activity4Results,
  5: Activity5Results,
  6: Activity6Results,
  7: Activity7Results,
};

export default function ResultsRouter({ activity }) {
  const Component = RESULTS_COMPONENTS[activity.id];

  if (!Component) {
    return (
      <View>
        <Text style={styles.sectionTitle}>Your attempts</Text>
        <ResultsTable columns={activity.resultsColumns} rows={[]} />
        <Text style={styles.helperText}>
          Submit your first recording in the Record tab to see results here.
        </Text>
      </View>
    );
  }

  return <Component activity={activity} />;
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  helperText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
});

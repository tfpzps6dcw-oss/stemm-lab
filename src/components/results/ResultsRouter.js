// STEM-111: Dispatcher for activity-specific Results tabs.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ResultsTable from '../ResultsTable';
import Activity1Results from './Activity1Results';

// STEM-111: Map activity ID → Results component. Add activities here as they're built.
const RESULTS_COMPONENTS = {
  1: Activity1Results,
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

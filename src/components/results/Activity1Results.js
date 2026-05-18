// STEM-111: Activity 1 Results — reads saved attempts from SQLite, shows physics columns.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import ResultsTable from '../ResultsTable';
import { getResultsByActivity } from '../../services/resultsService';
import { loadTeam } from '../../services/teamStorage';

// STEM-111: Columns chosen to reflect what we actually save (vs the paper write-up columns).
const COLUMNS = ['Attempt', 'Fall time', 'Velocity', 'G-force', 'Sync'];

export default function Activity1Results({ activity }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const team = await loadTeam();
      // STEM-111: Filter to this team's results only — leaderboard view comes later.
      const results = await getResultsByActivity(activity.id, {
        teamId: team?.discriminator,
      });
      setRows(results.map(formatRow));
    } catch (err) {
      console.error('Activity1Results load failed:', err);
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activity.id]);

  // STEM-111: Load on mount and on every re-render of this tab (tabs unmount/remount on switch).
  useEffect(() => {
    load();
  }, [load]);

  function onPullToRefresh() {
    setRefreshing(true);
    load();
  }

  if (loading && rows.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#7F77DD" />
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View>
        <Text style={styles.sectionTitle}>Your attempts</Text>
        <ResultsTable columns={COLUMNS} rows={[]} />
        <Text style={styles.helperText}>
          Submit your first attempt in the Record tab to see results here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onPullToRefresh} tintColor="#7F77DD" />
      }
    >
      <Text style={styles.sectionTitle}>Your attempts</Text>
      <ResultsTable columns={COLUMNS} rows={rows} />
      <Text style={styles.helperText}>
        Pull down to refresh.
      </Text>
    </ScrollView>
  );
}

// STEM-111: Map a SQLite result row to the column strings the table expects.
function formatRow(result, index, all) {
  const { payload, synced } = result;
  // STEM-111: Newest is last in DESC-sorted array, so attempt # counts down.
  const attemptNumber = all.length - index;

  return [
    `#${attemptNumber}`,
    payload.fallTimeMs != null ? `${(payload.fallTimeMs / 1000).toFixed(2)} s` : '—',
    payload.velocity != null ? `${payload.velocity.toFixed(2)} m/s` : '—',
    payload.gForce != null ? `${payload.gForce.toFixed(2)} g` : '—',
    synced ? '✓' : '⋯',
  ];
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
  centered: {
    paddingVertical: 32,
    alignItems: 'center',
  },
});

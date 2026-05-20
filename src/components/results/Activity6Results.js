// STEM-137: Activity 6 (Reaction) Results tab — reads saved attempts from SQLite.
// STEM-125: Added useFocusEffect so results refresh when tab becomes visible (Option B fix).

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ResultsTable from '../ResultsTable';
import { getResultsByActivity } from '../../services/resultsService';

export default function Activity6Results({ activity }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await getResultsByActivity(activity.id, { limit: 50 });
      setRows(results);
    } catch (err) {
      setError(err.message || 'Failed to load results.');
    } finally {
      setLoading(false);
    }
  }, [activity.id]);

  // STEM-125: useFocusEffect re-fetches every time this tab becomes visible — needed because
  //   Option B keeps all tabs mounted (display:none), so useEffect only fires once on mount.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const columns = ['Tap (ms)', 'Trace %', 'Delay (ms)', 'Date'];

  const tableRows = rows.map((r) => [
    typeof r.payload.tapReactionMs === 'number' ? String(r.payload.tapReactionMs) : '—',
    typeof r.payload.traceAccuracyPct === 'number' ? `${r.payload.traceAccuracyPct}%` : '—',
    typeof r.payload.traceMeanDelayMs === 'number' ? String(r.payload.traceMeanDelayMs) : '—',
    formatDate(r.createdAt),
  ]);

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Your attempts</Text>
        <TouchableOpacity onPress={load} disabled={loading}>
          <Text style={styles.refreshText}>{loading ? 'Loading…' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>
      <ResultsTable columns={columns} rows={tableRows} />
      {error && <Text style={styles.errorText}>{error}</Text>}
      {!loading && rows.length === 0 && !error && (
        <Text style={styles.helperText}>
          No attempts yet. Record in the Record tab.
        </Text>
      )}
      {rows.length > 0 && (
        <Text style={styles.helperText}>
          Lower tap time and higher trace % = better reaction control.
        </Text>
      )}
    </View>
  );
}

function formatDate(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  refreshText: { fontSize: 12, color: '#534AB7' },
  helperText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: { color: '#D85A30', fontSize: 13, marginTop: 12 },
});
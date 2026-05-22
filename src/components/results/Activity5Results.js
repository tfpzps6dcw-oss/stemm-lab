// STEM-133: Activity 5 (Stretch) Results tab — reads saved attempts from SQLite.
// STEM-145-fix: Replaced useFocusEffect with useEffect watching isVisible prop.

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ResultsTable from '../ResultsTable';
import { getResultsByActivity } from '../../services/resultsService';

export default function Activity5Results({ activity, isVisible }) {
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

  // STEM-145-fix: Re-fetch results every time the Results tab becomes visible.
  useEffect(() => {
    if (isVisible) {
      load();
    }
  }, [isVisible, load]);

  const columns = ['Motion', 'Score', 'Duration', 'Date'];

  const tableRows = rows.map((r) => [
    r.payload.motion ?? '–',
    typeof r.payload.score === 'number' ? String(r.payload.score) : '–',
    typeof r.payload.durationSec === 'number' ? `${r.payload.durationSec}s` : '–',
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
          No attempts yet. Record your first motion in the Record tab.
        </Text>
      )}
      {rows.length > 0 && (
        <Text style={styles.helperText}>
          Higher score = smoother motion. Aim for 100 by moving slowly and evenly.
        </Text>
      )}
    </View>
  );
}

function formatDate(ms) {
  if (!ms) return '–';
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
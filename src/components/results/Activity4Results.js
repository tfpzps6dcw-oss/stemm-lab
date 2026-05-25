// STEM-129: Activity 4 (Earthquake) Results tab — reads saved attempts from SQLite.
// STEM-125: Added useFocusEffect so results refresh when tab becomes visible (Option B fix).
// STEM-145-fix: Replaced useFocusEffect with useEffect watching isVisible prop — useFocusEffect
//   doesn't fire with display:none tab toggling.
// STEM-145: Added VideoPlayer for reviewing recorded earthquake test videos.

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ResultsTable from '../ResultsTable';
import { getResultsByActivity } from '../../services/resultsService';
// STEM-145: Video playback in Results — review recorded earthquake test videos.
import VideoPlayer from '../VideoPlayer';

export default function Activity4Results({ activity, isVisible }) {
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

  const columns = ['Design', 'Peak (g)', 'Date'];
  const tableRows = rows.map((r) => [
    r.payload.design ?? '–',
    typeof r.payload.peakG === 'number' ? r.payload.peakG.toFixed(2) : '–',
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
          No attempts yet. Record your first design in the Record tab.
        </Text>
      )}
      {rows.length > 0 && (
        <Text style={styles.helperText}>
          Lower peak g = more stable structure. Compare designs to see which dampens vibration best.
        </Text>
      )}
      {/* STEM-145: Playback saved earthquake test videos. */}
      {rows.map((r, i) =>
        r.payload.videoUri ? (
          <View key={`vid-${i}`} style={{ marginTop: 12 }}>
            <Text style={styles.sectionTitle}>{r.payload.design || `Design ${i + 1}`}</Text>
            <VideoPlayer uri={r.payload.videoUri} />
          </View>
        ) : null
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
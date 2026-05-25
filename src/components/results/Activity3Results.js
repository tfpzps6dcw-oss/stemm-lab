// STEM-125: Activity 3 Results tab — loads saved fan designs from SQLite, displays photos + bend angles.
// STEM-145-fix: Replaced useFocusEffect with useEffect watching isVisible prop.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { getResultsByActivity } from '../../services/resultsService';
import { loadTeam } from '../../services/teamStorage';
// STEM-145: Video playback in Results — review recorded fan test videos.
import VideoPlayer from '../VideoPlayer';

export default function Activity3Results({ activity, isVisible }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const team = await loadTeam();
      const rows = await getResultsByActivity(String(activity.id), {
        teamId: team?.discriminator,
      });
      setResults(rows);
    } catch (err) {
      console.error('Activity3Results: failed to load results', err);
      setError('Could not load results. Try again.');
    } finally {
      setLoading(false);
    }
  }, [activity.id]);

  // STEM-145-fix: Re-fetch results every time the Results tab becomes visible.
  useEffect(() => {
    if (isVisible) {
      fetchResults();
    }
  }, [isVisible, fetchResults]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#534AB7" />
        <Text style={styles.loadingText}>Loading results…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchResults}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (results.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No results yet</Text>
        <Text style={styles.emptyBody}>
          Test 3 fan designs in the Record tab and save your attempt.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Saved attempts</Text>
      {results.map((row) => (
        <ResultCard key={row.id} row={row} />
      ))}
    </View>
  );
}

function ResultCard({ row }) {
  const { payload, createdAt, synced } = row;
  const [expanded, setExpanded] = useState(false);

  const attempts = Array.isArray(payload.attempts) ? payload.attempts : [];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTimestamp}>
          {new Date(createdAt).toLocaleString()}
        </Text>
        <View style={[styles.syncBadge, synced ? styles.syncedBg : styles.pendingBg]}>
          <Text style={[styles.syncBadgeText, synced ? styles.syncedText : styles.pendingText]}>
            {synced ? '✓ Synced' : '⏳ Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.designCol]}>Design</Text>
          <Text style={[styles.tableHeaderCell, styles.numCol]}>Dist</Text>
          <Text style={[styles.tableHeaderCell, styles.numCol]}>Pred</Text>
          <Text style={[styles.tableHeaderCell, styles.numCol]}>Actual</Text>
          <Text style={[styles.tableHeaderCell, styles.checkCol]}>Right?</Text>
        </View>

        {attempts.map((att, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.designCol]}>
              {att.designName || `Design ${i + 1}`}
            </Text>
            <Text style={[styles.tableCell, styles.numCol]}>
              {att.distanceCm != null ? `${att.distanceCm}cm` : '–'}
            </Text>
            <Text style={[styles.tableCell, styles.numCol]}>
              {att.predictedAngle != null ? `${att.predictedAngle}°` : '–'}
            </Text>
            <Text style={[styles.tableCell, styles.numCol]}>
              {att.actualAngle != null ? `${att.actualAngle}°` : '–'}
            </Text>
            <View style={[styles.tableCell, styles.checkCol]}>
              {att.verdict === 'correct' && <Text style={styles.checkmark}>✓</Text>}
              {att.verdict === 'incorrect' && <Text style={styles.cross}>✗</Text>}
              {!att.verdict && <Text style={styles.dashText}>–</Text>}
            </View>
          </View>
        ))}
      </View>

      {payload.mostBent && (
        <View style={styles.mostBentRow}>
          <Text style={styles.mostBentLabel}>Bent the most:</Text>
          <Text style={styles.mostBentValue}>{payload.mostBent}</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        style={styles.expandToggle}
      >
        <Text style={styles.expandToggleText}>
          {expanded ? '▾ Hide photos' : '▸ Show photos'}
        </Text>
      </TouchableOpacity>

      {expanded &&
        attempts.map((att, i) => (
          <View key={i} style={styles.detailBlock}>
            <Text style={styles.detailHeading}>
              {att.designName || `Design ${i + 1}`}
            </Text>
            <Text style={styles.detailMeta}>
              {att.material} · {att.distanceCm}cm · {att.actualAngle}°
            </Text>
            {/* STEM-145: Playback saved fan test video with slow-mo. */}
            {att.videoUri && (
              <VideoPlayer uri={att.videoUri} style={{ marginBottom: 12 }} />
            )}
            {att.photoUri ? (
              <Image source={{ uri: att.photoUri }} style={styles.photoThumb} />
            ) : (
              <View style={styles.photoMissing}>
                <Text style={styles.photoMissingText}>No photo</Text>
              </View>
            )}
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#D85A30',
    marginBottom: 12,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  retryButtonText: {
    fontSize: 13,
    color: '#374151',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  syncedBg: { backgroundColor: '#ECFDF5' },
  pendingBg: { backgroundColor: '#FEF3C7' },
  syncBadgeText: { fontSize: 10, fontWeight: '500' },
  syncedText: { color: '#059669' },
  pendingText: { color: '#D97706' },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderCell: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontSize: 11,
    color: '#1A1A1A',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  designCol: { flex: 2, textAlign: 'left' },
  numCol: { flex: 1 },
  checkCol: { flex: 0.8, justifyContent: 'center', alignItems: 'center' },
  checkmark: { fontSize: 14, color: '#059669', fontWeight: '600' },
  cross: { fontSize: 14, color: '#D85A30', fontWeight: '600' },
  dashText: { fontSize: 12, color: '#D1D5DB' },
  mostBentRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  mostBentLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 6,
  },
  mostBentValue: {
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '600',
    flex: 1,
  },
  expandToggle: {
    marginTop: 12,
    paddingVertical: 6,
  },
  expandToggleText: {
    fontSize: 12,
    color: '#534AB7',
    fontWeight: '500',
  },
  detailBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  detailMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  photoThumb: {
    width: '100%',
    height: 180,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  photoMissing: {
    height: 80,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoMissingText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
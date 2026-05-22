// STEM-112: Activity 1 Results tab — loads saved attempts from SQLite, displays summary + physics.
// STEM-145-fix: Replaced useFocusEffect with useEffect watching isVisible prop.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { getResultsByActivity } from '../../services/resultsService';
import { loadTeam } from '../../services/teamStorage';
// STEM-145: Video playback in Results — review recorded drop videos.
import VideoPlayer from '../VideoPlayer';


export default function Activity1Results({ activity, isVisible }) {
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
      console.error('Activity1Results: failed to load results', err);
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
          Complete a drop test in the Record tab and save your attempt.
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

  const isMultiAttempt = Array.isArray(payload.attempts);
  const attempts = isMultiAttempt ? payload.attempts : [payload];

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

      {payload.prediction && (
        <View style={styles.predictionRow}>
          <Text style={styles.predictionLabel}>Prediction:</Text>
          <Text style={styles.predictionValue}>{payload.prediction}</Text>
        </View>
      )}

      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.designCol]}>Design</Text>
          <Text style={[styles.tableHeaderCell, styles.numCol]}>Predicted</Text>
          <Text style={[styles.tableHeaderCell, styles.numCol]}>Actual</Text>
          <Text style={[styles.tableHeaderCell, styles.numCol]}>Velocity</Text>
        </View>

        {attempts.map((att, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.designCol]}>
              {att.designName || `Attempt ${i + 1}`}
            </Text>
            <Text style={[styles.tableCell, styles.numCol]}>
              {att.predictedTimeS != null ? `${att.predictedTimeS}s` : '–'}
            </Text>
            <Text style={[styles.tableCell, styles.numCol]}>
              {att.fallTimeS != null
                ? `${att.fallTimeS.toFixed(3)}s`
                : att.fallTimeMs != null
                  ? `${(att.fallTimeMs / 1000).toFixed(3)}s`
                  : '–'}
            </Text>
            <Text style={[styles.tableCell, styles.numCol]}>
              {att.velocity != null ? `${att.velocity.toFixed(2)} m/s` : '–'}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        style={styles.expandToggle}
      >
        <Text style={styles.expandToggleText}>
          {expanded ? '▾ Hide physics detail' : '▸ Show physics detail'}
        </Text>
      </TouchableOpacity>

      {expanded &&
        attempts.map((att, i) => (
          <View key={i} style={styles.detailBlock}>
            <Text style={styles.detailHeading}>
              {att.designName || `Attempt ${i + 1}`}
            </Text>
            <DetailRow label="Fall time" value={formatMs(att.fallTimeMs)} />
            <DetailRow label="Drop height" value={formatUnit(att.dropHeightM, 'm')} />
            <DetailRow label="Toy mass" value={formatUnit(att.toyMassKg, 'kg')} />
            <DetailRow label="Velocity" value={formatUnit(att.velocity, 'm/s')} />
            <DetailRow label="Acceleration" value={formatUnit(att.acceleration, 'm/s²')} />
            <DetailRow label="Net force" value={formatUnit(att.netForce, 'N')} />
            <DetailRow label="Weight" value={formatUnit(att.weight, 'N')} />
            <DetailRow label="Drag force" value={formatUnit(att.dragForce, 'N')} />
            <DetailRow label="G-force" value={formatUnit(att.gForce, 'g')} />
            {/* STEM-145: Playback saved drop video with slow-mo controls. */}
            {att.videoUri && (
              <VideoPlayer uri={att.videoUri} style={{ marginTop: 12 }} />
            )}
          </View>
        ))}
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function formatMs(ms) {
  if (ms == null) return '–';
  return `${(ms / 1000).toFixed(3)} s`;
}

function formatUnit(value, unit) {
  if (value == null || !Number.isFinite(value)) return '–';
  return `${value.toFixed(2)} ${unit}`;
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
  predictionRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  predictionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 6,
  },
  predictionValue: {
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '500',
    flex: 1,
  },
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
    paddingHorizontal: 6,
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
    paddingHorizontal: 6,
    fontSize: 11,
    color: '#1A1A1A',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  designCol: { flex: 2, textAlign: 'left' },
  numCol: { flex: 1 },
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
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});
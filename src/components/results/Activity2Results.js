// STEM-121: Activity 2 Results tab — loads saved sound measurements from SQLite, displays summary + risk labels.
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
import { processAmplitude } from '../../services/soundLevel';

export default function Activity2Results({ activity, isVisible }) {
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
      console.error('Activity2Results: failed to load results', err);
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
          Measure 3 sounds in the Record tab and save your attempt.
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
          <Text style={[styles.tableHeaderCell, styles.sourceCol]}>Source</Text>
          <Text style={[styles.tableHeaderCell, styles.numCol]}>Peak dB</Text>
          <Text style={[styles.tableHeaderCell, styles.riskCol]}>Risk</Text>
        </View>

        {attempts.map((att, i) => {
          const risk =
            att.peakDb != null
              ? processAmplitude(amplitudeFromDb(att.peakDb)).risk
              : null;

          return (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.sourceCol]}>
                {att.sourceName || `Sound ${i + 1}`}
              </Text>
              <Text style={[styles.tableCell, styles.numCol]}>
                {att.peakDb != null ? att.peakDb.toFixed(0) : '–'}
              </Text>
              <View style={[styles.tableCell, styles.riskCol]}>
                {risk ? (
                  <Text style={[styles.riskText, { color: risk.color }]}>
                    {risk.label}
                  </Text>
                ) : (
                  <Text style={styles.dashText}>–</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {payload.loudest && (
        <View style={styles.loudestRow}>
          <Text style={styles.loudestLabel}>Loudest sound:</Text>
          <Text style={styles.loudestValue}>{payload.loudest}</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        style={styles.expandToggle}
      >
        <Text style={styles.expandToggleText}>
          {expanded ? '▾ Hide detail' : '▸ Show detail'}
        </Text>
      </TouchableOpacity>

      {expanded &&
        attempts.map((att, i) => (
          <View key={i} style={styles.detailBlock}>
            <Text style={styles.detailHeading}>
              {att.sourceName || `Sound ${i + 1}`}
            </Text>
            <DetailRow
              label="Peak dB"
              value={att.peakDb != null ? `${att.peakDb.toFixed(1)} dB` : '–'}
            />
            <DetailRow
              label="Average dB"
              value={att.avgDb != null ? `${att.avgDb.toFixed(1)} dB` : '–'}
            />
            <DetailRow label="Risk level" value={att.riskLabel || '–'} />
            {i > 0 && (
              <DetailRow label="Prediction" value={att.prediction || '–'} />
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

function amplitudeFromDb(db) {
  const t = (db - 30) / (110 - 30);
  return t * 60 - 60;
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
  sourceCol: { flex: 2, textAlign: 'left' },
  numCol: { flex: 1 },
  riskCol: { flex: 1.3, justifyContent: 'center', alignItems: 'center' },
  riskText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  dashText: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  loudestRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  loudestLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 6,
  },
  loudestValue: {
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
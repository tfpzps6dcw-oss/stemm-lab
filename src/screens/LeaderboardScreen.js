// STEM-143: Leaderboard screen — Firestore real-time listener showing top results per activity.

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listenToResultsByActivity } from '../services/firestoreResults';
import { ACTIVITIES, CATEGORY_COLORS } from '../constants/activities';

export default function LeaderboardScreen({ navigation, team }) {
  const [activityId, setActivityId] = useState(ACTIVITIES[0].id);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const activity = useMemo(
    () => ACTIVITIES.find((a) => a.id === activityId),
    [activityId]
  );

  // STEM-143: Subscribe to live Firestore updates whenever the chosen activity changes.
  useEffect(() => {
    setLoading(true);
    setError(null);
    setResults([]);

    const unsubscribe = listenToResultsByActivity(
      activityId,
      (rows, err) => {
        if (err) {
          setError(err.message || 'Failed to load leaderboard.');
          setLoading(false);
          return;
        }
        setResults(rows);
        setLoading(false);
      },
      { limit: 50 }
    );

    return unsubscribe;
  }, [activityId]);

  const ranked = useMemo(
    () => rankResults(results, activityId),
    [results, activityId]
  );

  const colors = activity ? CATEGORY_COLORS[activity.category] : null;
  const teamDiscriminator = team?.discriminator;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {ACTIVITIES.map((a) => {
          const isActive = a.id === activityId;
          const c = CATEGORY_COLORS[a.category];
          return (
            <TouchableOpacity
              key={a.id}
              style={[
                styles.chip,
                isActive && { backgroundColor: c.badgeBg, borderColor: c.badgeBg },
              ]}
              onPress={() => setActivityId(a.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  isActive && { color: c.badgeText, fontWeight: '500' },
                ]}
              >
                {a.id}. {a.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {activity && (
        <View style={styles.activityHeader}>
          <Text style={styles.activityTitle}>{activity.title}</Text>
          {colors && (
            <View style={[styles.subjectBadge, { backgroundColor: colors.badgeBg }]}>
              <Text style={[styles.subjectBadgeText, { color: colors.badgeText }]}>
                {activity.subject}
              </Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.helperText}>{rankingExplanation(activityId)}</Text>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color="#7F77DD" />
            <Text style={styles.helperText}>Listening for live results…</Text>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {!loading && !error && ranked.length === 0 && (
          <View style={styles.center}>
            <Text style={styles.helperText}>No results yet for this activity.</Text>
          </View>
        )}

        {!loading && !error && ranked.length > 0 &&
          ranked.map((row, idx) => {
            const isMyTeam = row.teamId && row.teamId === teamDiscriminator;
            return (
              <View
                key={row.firestoreId || idx}
                style={[styles.row, isMyTeam && styles.rowMine]}
              >
                <Text style={styles.rank}>{idx + 1}</Text>
                <View style={styles.rowMiddle}>
                  <Text style={[styles.teamName, isMyTeam && styles.teamNameMine]}>
                    {row.teamName ?? '—'}
                    {isMyTeam && <Text style={styles.youTag}>  you</Text>}
                  </Text>
                  <Text style={styles.metaText}>
                    {row.teamId ?? '—'} · {formatDate(row.createdAt)}
                  </Text>
                </View>
                <Text style={styles.score}>{formatScore(row, activityId)}</Text>
              </View>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
}

// Per-activity ranking metric — { key in payload, label, lower-or-higher better }
// Per-activity ranking config.
//   key       — payload field to rank by (or 'extractor' for nested values)
//   label     — unit shown next to the score
//   direction — 'asc' = lower is better, 'desc' = higher is better
//   extract   — optional fn to pull a number out of a complex payload
const RANKING = {
  // Activity 1 saves an array of attempts; rank by the best (highest) velocity across attempts.
  1: {
    label: 'm/s',
    direction: 'desc',
    extract: (payload) => {
      if (!Array.isArray(payload?.attempts)) return null;
      const velocities = payload.attempts
        .map((a) => toNumber(a.velocity))
        .filter((v) => v !== null);
      if (velocities.length === 0) return null;
      return Math.max(...velocities);
    },
  },
  2: { key: 'peakDb', label: 'dB', direction: 'desc' },
  3: { key: 'actualAngle', label: '°', direction: 'desc' },
  4: { key: 'peakG', label: 'g', direction: 'asc' },
  5: { key: 'score', label: 'pts', direction: 'desc' },
  6: { key: 'tapReactionMs', label: 'ms', direction: 'asc' },
  7: { key: 'restBpm', label: 'bpm', direction: 'asc' },
};

// Coerce a value to a finite number, or null if it can't be.
function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Pull the rankable number out of a result's payload, using the activity's config.
function extractValue(result, cfg) {
  if (!result?.payload || !cfg) return null;
  if (typeof cfg.extract === 'function') return cfg.extract(result.payload);
  if (cfg.key) return toNumber(result.payload[cfg.key]);
  return null;
}

function rankResults(rows, activityId) {
  const cfg = RANKING[activityId] ?? { direction: 'desc' };
  // One row per team — keep each team's best result for this metric
  const bestByTeam = new Map();
  for (const r of rows) {
    const teamId = r.teamId ?? '__unknown__';
    const value = extractValue(r, cfg);
    if (value === null) continue; // skip results with no rankable value
    const existing = bestByTeam.get(teamId);
    if (!existing) {
      bestByTeam.set(teamId, { result: r, value });
      continue;
    }
    const better = cfg.direction === 'asc' ? value < existing.value : value > existing.value;
    if (better) bestByTeam.set(teamId, { result: r, value });
  }
  const list = Array.from(bestByTeam.values());
  list.sort((a, b) => (cfg.direction === 'asc' ? a.value - b.value : b.value - a.value));
  // Return the result objects, with the computed value attached for display
  return list.map((entry) => ({ ...entry.result, _rankValue: entry.value }));
}

function formatScore(row, activityId) {
  const cfg = RANKING[activityId] ?? { label: '' };
  const value = row._rankValue ?? extractValue(row, cfg);
  if (typeof value !== 'number') return '—';
  const formatted = Math.abs(value) >= 100 ? Math.round(value).toString() : value.toFixed(2);
  return `${formatted} ${cfg.label ?? ''}`.trim();
}

function rankingExplanation(activityId) {
  const cfg = RANKING[activityId];
  if (!cfg) return '';
  const direction = cfg.direction === 'asc' ? 'Lower is better' : 'Higher is better';
  return direction;
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { fontSize: 20, color: '#374151' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  chipsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  chipText: { fontSize: 12, color: '#6B7280' },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 4,
  },
  activityTitle: { fontSize: 16, fontWeight: '500', color: '#1A1A1A' },
  subjectBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  subjectBadgeText: { fontSize: 11, fontWeight: '500' },
  helperText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  center: { alignItems: 'center', padding: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  rowMine: {
    backgroundColor: '#F0EEF9',
    borderRadius: 8,
    marginVertical: 4,
    borderBottomWidth: 0,
  },
  rank: {
    width: 32,
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  rowMiddle: { flex: 1 },
  teamName: { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  teamNameMine: { color: '#534AB7' },
  youTag: { fontSize: 10, color: '#534AB7', fontWeight: '500' },
  metaText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  score: { fontSize: 14, fontWeight: '500', color: '#1A1A1A' },
  errorText: { color: '#D85A30', fontSize: 13, padding: 16, textAlign: 'center' },
});
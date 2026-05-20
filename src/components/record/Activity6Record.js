// STEM-135/136/137: Activity 6 (Reaction) — multi-phase Record tab.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { saveResult } from '../../services/resultSaveHelper';
import TapPhase from './activity6/TapPhase';
import TracePhase from './activity6/TracePhase';

export default function Activity6Record({ activity }) {
  const [phase, setPhase] = useState('intro');
  const [tapResult, setTapResult] = useState(null);
  const [traceResult, setTraceResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function resetAll() {
    setPhase('intro');
    setTapResult(null);
    setTraceResult(null);
    setError(null);
  }

  async function handleSave() {
    if (!tapResult || !traceResult) return;
    setSaving(true);
    setError(null);
    try {
      await saveResult({
        activityId: activity.id,
        payload: {
            tapReactionMs: tapResult.reactionMs,
            tapFalseStarts: tapResult.falseStarts,
            traceAccuracyPct: traceResult.accuracyPct,
            traceMeanDelayMs: traceResult.meanDelayMs,
        },
      });
    resetAll();
    } catch (err) {
        setError(err.message || 'Failed to save result.');
        } finally {
        setSaving(false);
        }
    }
  

  if (phase === 'intro') {
    return (
      <View>
        <Text style={styles.sectionTitle}>Three quick tests</Text>
        <View style={styles.introBox}>
          <Text style={styles.introItem}>1. Tap as fast as you can when the screen turns green.</Text>
          <Text style={styles.introItem}>2. Trace a moving shape with your finger.</Text>
          <Text style={styles.introItem}>3. Review and save your result.</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setPhase('tap')}>
          <Text style={styles.primaryButtonText}>Start tests</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'tap') {
    return (
      <TapPhase
        onComplete={(result) => {
          setTapResult(result);
          setPhase('trace');
        }}
        onCancel={resetAll}
      />
    );
  }

  if (phase === 'trace') {
    return (
      <TracePhase
        onComplete={(result) => {
          setTraceResult(result);
          setPhase('review');
        }}
        onCancel={resetAll}
      />
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Your results</Text>

      <View style={styles.resultBox}>
        <Text style={styles.resultLabel}>Tap reaction</Text>
        <Text style={styles.resultValue}>{tapResult.reactionMs}</Text>
        <Text style={styles.resultUnit}>ms</Text>
        {tapResult.falseStarts > 0 && (
          <Text style={styles.resultMeta}>
            False starts: {tapResult.falseStarts}
          </Text>
        )}
      </View>

      <View style={styles.resultBox}>
        <Text style={styles.resultLabel}>Trace accuracy</Text>
        <Text style={styles.resultValue}>{traceResult.accuracyPct}%</Text>
        <Text style={styles.resultMeta}>
          Mean delay: {traceResult.meanDelayMs} ms
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save result'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={resetAll} disabled={saving}>
        <Text style={styles.secondaryButtonText}>Discard and try again</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
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
  introBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  introItem: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
    lineHeight: 20,
  },
  resultBox: {
    backgroundColor: '#F0EEF9',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  resultLabel: {
    fontSize: 11,
    color: '#534AB7',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultValue: { fontSize: 36, fontWeight: '500', color: '#534AB7' },
  resultUnit: { fontSize: 12, color: '#534AB7', marginTop: 2 },
  resultMeta: { fontSize: 11, color: '#534AB7', marginTop: 6 },
  primaryButton: {
    backgroundColor: '#7F77DD',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: { color: '#374151', fontSize: 13 },
  buttonDisabled: { opacity: 0.6 },
  errorText: { color: '#D85A30', fontSize: 13, marginTop: 12 },
});
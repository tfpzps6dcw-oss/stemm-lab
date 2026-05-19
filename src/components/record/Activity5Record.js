// STEM-132: Activity 5 (Stretch) Record tab — timed movement + smoothness output.

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { startSampling, isAccelerometerAvailable } from '../../services/accelerometerService';
import { calculateSmoothness } from '../../services/smoothnessScore';
import { saveResult } from '../../services/resultSaveHelper';

const SAMPLE_INTERVAL_MS = 50; // 20 Hz
const DEFAULT_DURATION_SEC = 5;
const MIN_DURATION_SEC = 3;
const MAX_DURATION_SEC = 15;

export default function Activity5Record({ activity }) {
  const [motion, setMotion] = useState('');
  const [durationSec, setDurationSec] = useState(DEFAULT_DURATION_SEC);
  const [available, setAvailable] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | recording | done
  const [remaining, setRemaining] = useState(durationSec);
  const [result, setResult] = useState(null); // {score, variance, meanJerk, sampleCount, durationMs}
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const sessionRef = useRef(null);
  const countdownRef = useRef(null);

  // Check accelerometer availability on mount
  useEffect(() => {
    isAccelerometerAvailable().then(setAvailable).catch(() => setAvailable(false));

    return () => {
      if (sessionRef.current) sessionRef.current.stop();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  async function start() {
    setError(null);
    setResult(null);
    setRemaining(durationSec);

    try {
      const session = await startSampling({ intervalMs: SAMPLE_INTERVAL_MS });
      sessionRef.current = session;
      setPhase('recording');

      // Countdown timer — updates every 100ms for smooth display
      const endAt = Date.now() + durationSec * 1000;
      countdownRef.current = setInterval(() => {
        const msLeft = Math.max(0, endAt - Date.now());
        setRemaining(msLeft / 1000);

        if (msLeft <= 0) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          finish();
        }
      }, 100);
    } catch (err) {
      setError(err.message);
      setPhase('idle');
    }
  }

  function finish() {
    if (!sessionRef.current) return;
    const { samples } = sessionRef.current.stop();
    sessionRef.current = null;

    const scored = calculateSmoothness(samples);
    setResult(scored);
    setPhase('done');
  }

  function cancel() {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setPhase('idle');
    setResult(null);
    setRemaining(durationSec);
  }

  async function handleSave() {
    if (!result) return;
    if (!motion.trim()) {
      setError('Please describe the motion before saving.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveResult({
        activityId: activity.id,
        payload: {
          motion: motion.trim(),
          score: result.score,
          variance: Number(result.variance.toFixed(5)),
          meanJerk: Number(result.meanJerk.toFixed(3)),
          durationSec,
        },
      });
      Alert.alert('Saved', 'Smoothness score recorded.');
      setMotion('');
      cancel();
    } catch (err) {
      setError(err.message || 'Failed to save result.');
    } finally {
      setSaving(false);
    }
  }

  function adjustDuration(delta) {
    const next = Math.max(MIN_DURATION_SEC, Math.min(MAX_DURATION_SEC, durationSec + delta));
    setDurationSec(next);
    setRemaining(next);
  }

  // --- Render branches ---

  if (available === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.helperText}>Checking sensor…</Text>
      </View>
    );
  }

  if (available === false) {
    return (
      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>Sensor unavailable</Text>
        <Text style={styles.warningBody}>
          The accelerometer isn't available here. Open this activity in Expo Go
          on a real phone to record motion.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Motion description */}
      <Text style={styles.sectionTitle}>Motion description</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. arm sweep overhead and back"
        placeholderTextColor="#9CA3AF"
        value={motion}
        onChangeText={setMotion}
        editable={phase === 'idle' || phase === 'done'}
      />

      {/* Duration picker — only visible idle */}
      {phase === 'idle' && (
        <>
          <Text style={styles.sectionTitle}>Duration</Text>
          <View style={styles.durationRow}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => adjustDuration(-1)}
              disabled={durationSec <= MIN_DURATION_SEC}
            >
              <Text style={styles.stepButtonText}>−</Text>
            </TouchableOpacity>
            <View style={styles.durationValueBox}>
              <Text style={styles.durationValue}>{durationSec}s</Text>
            </View>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => adjustDuration(1)}
              disabled={durationSec >= MAX_DURATION_SEC}
            >
              <Text style={styles.stepButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Countdown — only visible recording */}
      {phase === 'recording' && (
        <View style={styles.countdownBox}>
          <Text style={styles.countdownLabel}>RECORDING</Text>
          <Text style={styles.countdownValue}>{remaining.toFixed(1)}</Text>
          <Text style={styles.countdownUnit}>seconds left</Text>
        </View>
      )}

      {/* Result — only visible done */}
      {phase === 'done' && result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Smoothness score</Text>
          <Text style={styles.resultValue}>{result.score}</Text>
          <Text style={styles.resultUnit}>/ 100</Text>
          <View style={styles.resultMetaRow}>
            <Text style={styles.resultMeta}>
              Variance: {result.variance.toFixed(4)}
            </Text>
            <Text style={styles.resultMeta}>
              Jerk: {result.meanJerk.toFixed(2)} g/s
            </Text>
          </View>
        </View>
      )}

      {/* Controls */}
      {phase === 'idle' && (
        <TouchableOpacity style={styles.primaryButton} onPress={start}>
          <Text style={styles.primaryButtonText}>Start recording</Text>
        </TouchableOpacity>
      )}

      {phase === 'recording' && (
        <TouchableOpacity style={styles.secondaryButton} onPress={cancel}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}

      {phase === 'done' && (
        <>
          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? 'Saving…' : 'Save result'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={cancel} disabled={saving}>
            <Text style={styles.secondaryButtonText}>Discard and try again</Text>
          </TouchableOpacity>
        </>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { padding: 24, alignItems: 'center' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  stepButtonText: { fontSize: 20, color: '#374151' },
  durationValueBox: { paddingHorizontal: 24 },
  durationValue: { fontSize: 24, fontWeight: '500', color: '#1A1A1A' },
  countdownBox: {
    backgroundColor: '#F0EEF9',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
  },
  countdownLabel: {
    fontSize: 11,
    color: '#534AB7',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  countdownValue: { fontSize: 48, fontWeight: '300', color: '#534AB7' },
  countdownUnit: { fontSize: 12, color: '#534AB7', marginTop: 2 },
  resultBox: {
    backgroundColor: '#F0EEF9',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 11,
    color: '#534AB7',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultValue: { fontSize: 48, fontWeight: '500', color: '#534AB7' },
  resultUnit: { fontSize: 12, color: '#534AB7', marginTop: 2 },
  resultMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#D8D2EE',
  },
  resultMeta: { fontSize: 11, color: '#534AB7' },
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
  helperText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginVertical: 8,
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
  },
  warningTitle: { fontSize: 14, fontWeight: '500', color: '#92400E', marginBottom: 4 },
  warningBody: { fontSize: 13, color: '#78350F' },
  errorText: { color: '#D85A30', fontSize: 13, marginTop: 12 },
});
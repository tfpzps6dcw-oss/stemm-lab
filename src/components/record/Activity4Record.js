// STEM-128: Activity 4 (Earthquake) Record tab — live vibration + design comparison.

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
import { saveResult } from '../../services/resultSaveHelper';

const SAMPLE_INTERVAL_MS = 50;   // 20 Hz — plenty for vibration peaks
const RECORD_DURATION_MS = 3000; // 3-second drop window

export default function Activity4Record({ activity }) {
  const [design, setDesign] = useState('');
  const [available, setAvailable] = useState(null); // null = checking, true/false = result
  const [phase, setPhase] = useState('idle'); // idle | armed | recording | done
  const [liveMagnitude, setLiveMagnitude] = useState(0);
  const [peakG, setPeakG] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const sessionRef = useRef(null);
  const recordTimerRef = useRef(null);

  // Check accelerometer availability on mount
  useEffect(() => {
    isAccelerometerAvailable().then(setAvailable).catch(() => setAvailable(false));

    // Cleanup: stop any active session on unmount
    return () => {
      if (sessionRef.current) sessionRef.current.stop();
      if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
    };
  }, []);

  async function arm() {
    setError(null);
    setPeakG(null);
    try {
      const session = await startSampling({
        intervalMs: SAMPLE_INTERVAL_MS,
        onSample: (s) => setLiveMagnitude(s.netMagnitude),
      });
      sessionRef.current = session;
      setPhase('armed');
    } catch (err) {
      setError(err.message);
      setPhase('idle');
    }
  }

  function startRecording() {
    if (!sessionRef.current) return;
    sessionRef.current.reset(); // discard pre-record samples
    setPhase('recording');

    // After the record window, stop and capture peak
    recordTimerRef.current = setTimeout(() => {
      const { peak } = sessionRef.current.stop();
      sessionRef.current = null;
      setPeakG(peak);
      setPhase('done');
    }, RECORD_DURATION_MS);
  }

  function reset() {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
    }
    if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
    setPhase('idle');
    setLiveMagnitude(0);
    setPeakG(null);
    setError(null);
  }

  async function handleSave() {
    if (peakG === null) return;
    if (!design.trim()) {
      setError('Please describe your structure design first.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveResult({
        activityId: activity.id,
        payload: {
          design: design.trim(),
          peakG: Number(peakG.toFixed(3)),
        },
      });
      Alert.alert('Saved', 'Result recorded. Try a new design to compare.');
      setDesign('');
      reset();
    } catch (err) {
      setError(err.message || 'Failed to save result.');
    } finally {
      setSaving(false);
    }
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
          on a real phone to record vibration.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Design field */}
      <Text style={styles.sectionTitle}>Structure design</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 4 folds, 4cm tall, base reinforced"
        placeholderTextColor="#9CA3AF"
        value={design}
        onChangeText={setDesign}
        editable={phase === 'idle' || phase === 'done'}
      />

      {/* Live vibration readout */}
      <Text style={styles.sectionTitle}>Live vibration</Text>
      <View style={styles.readoutBox}>
        <Text style={styles.readoutValue}>
          {phase === 'idle' ? '—' : liveMagnitude.toFixed(2)}
        </Text>
        <Text style={styles.readoutUnit}>g (net)</Text>
      </View>

      {/* Phase-specific controls */}
      {phase === 'idle' && (
        <TouchableOpacity style={styles.primaryButton} onPress={arm}>
          <Text style={styles.primaryButtonText}>Arm sensor</Text>
        </TouchableOpacity>
      )}

      {phase === 'armed' && (
        <>
          <Text style={styles.helperText}>
            Position phone on your structure, then start the {RECORD_DURATION_MS / 1000}s record window before dropping.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={startRecording}>
            <Text style={styles.primaryButtonText}>Start record window</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={reset}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}

      {phase === 'recording' && (
        <View style={styles.recordingBox}>
          <Text style={styles.recordingText}>Recording… drop now</Text>
        </View>
      )}

      {phase === 'done' && (
        <>
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>Peak vibration</Text>
            <Text style={styles.resultValue}>{peakG?.toFixed(2)}</Text>
            <Text style={styles.resultUnit}>g</Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? 'Saving…' : 'Save result'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={reset} disabled={saving}>
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
  readoutBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  readoutValue: { fontSize: 36, fontWeight: '300', color: '#1A1A1A' },
  readoutUnit: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
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
  recordingBox: {
    backgroundColor: '#D85A30',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  recordingText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  resultBox: {
    backgroundColor: '#F0EEF9',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  resultLabel: { fontSize: 11, color: '#534AB7', marginBottom: 4, textTransform: 'uppercase' },
  resultValue: { fontSize: 36, fontWeight: '500', color: '#534AB7' },
  resultUnit: { fontSize: 12, color: '#534AB7', marginTop: 2 },
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
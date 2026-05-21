// STEM-140: Activity 7 (Breathing pace) Record tab — at rest vs after exercise.
// STEM-145: Added video recording + slow-mo playback for capturing breathing pattern evidence.
//
// Two-phase test:
//   1. Lie flat, phone on chest. Record breathing at rest for 30s.
//   2. Do 20 jumping jacks. Repeat the 30s recording.
//   3. Compare the two BPM values.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { startSampling, isAccelerometerAvailable } from '../../services/accelerometerService';
import { calculateBreathingRate } from '../../services/breathingRate';
import { saveResult } from '../../services/resultSaveHelper';
// STEM-145: Video recording and slow-mo playback for capturing breathing pattern evidence.
import VideoRecorder from '../VideoRecorder';
import VideoPlayer from '../VideoPlayer';
import { deleteVideo } from '../../services/videoService';

const SAMPLE_INTERVAL_MS = 100; // 10 Hz — breathing is slow
const DEFAULT_DURATION_SEC = 30;
const MIN_DURATION_SEC = 15;
const MAX_DURATION_SEC = 60;

export default function Activity7Record({ activity }) {
  const [available, setAvailable] = useState(null);
  const [phase, setPhase] = useState('intro');
  // intro | recording-rest | done-rest | between | recording-active | done-active | review
  const [durationSec, setDurationSec] = useState(DEFAULT_DURATION_SEC);
  const [remaining, setRemaining] = useState(durationSec);
  const [restResult, setRestResult] = useState(null);
  const [activeResult, setActiveResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [videoUri, setVideoUri] = useState(null); // STEM-145: recorded video for breathing test

  const sessionRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    isAccelerometerAvailable().then(setAvailable).catch(() => setAvailable(false));
    return () => {
      if (sessionRef.current) sessionRef.current.stop();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // STEM-145: Save recorded video URI, delete any previous video.
  const handleVideoSaved = useCallback(async (uri) => {
    if (videoUri) {
      await deleteVideo(videoUri);
    }
    setVideoUri(uri);
  }, [videoUri]);

  async function startRecording(which) {
    // which = 'rest' or 'active'
    setError(null);
    setRemaining(durationSec);
    setPhase(which === 'rest' ? 'recording-rest' : 'recording-active');

    try {
      const session = await startSampling({ intervalMs: SAMPLE_INTERVAL_MS });
      sessionRef.current = session;

      const endAt = Date.now() + durationSec * 1000;
      countdownRef.current = setInterval(() => {
        const msLeft = Math.max(0, endAt - Date.now());
        setRemaining(msLeft / 1000);
        if (msLeft <= 0) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          finishRecording(which);
        }
      }, 100);
    } catch (err) {
      setError(err.message);
      setPhase(which === 'rest' ? 'intro' : 'between');
    }
  }

  function finishRecording(which) {
    if (!sessionRef.current) return;
    const { samples } = sessionRef.current.stop();
    sessionRef.current = null;

    const result = calculateBreathingRate(samples);
    if (which === 'rest') {
      setRestResult(result);
      setPhase('done-rest');
    } else {
      setActiveResult(result);
      setPhase('done-active');
    }
  }

  function cancelRecording() {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (phase === 'recording-rest') setPhase('intro');
    else if (phase === 'recording-active') setPhase('between');
  }

  function resetAll() {
    if (sessionRef.current) sessionRef.current.stop();
    if (countdownRef.current) clearInterval(countdownRef.current);
    sessionRef.current = null;
    countdownRef.current = null;
    setPhase('intro');
    setRemaining(durationSec);
    setRestResult(null);
    setActiveResult(null);
    setError(null);
    setVideoUri(null); // STEM-145: Clear video on reset
  }

  async function handleSave() {
    if (!restResult || !activeResult) return;
    setSaving(true);
    setError(null);
    try {
      await saveResult({
        activityId: activity.id,
        payload: {
          restBpm: restResult.bpm,
          activeBpm: activeResult.bpm,
          delta: activeResult.bpm - restResult.bpm,
          durationSec,
          restConfidence: restResult.confidence,
          activeConfidence: activeResult.confidence,
          videoUri,  // STEM-145: path to recorded breathing test video
        },
      });
      resetAll();
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
          The accelerometer isn't available here. Open this activity in Expo Go on a real phone to record breathing.
        </Text>
      </View>
    );
  }

  // Intro
  if (phase === 'intro') {
    return (
      <View>
        <Text style={styles.sectionTitle}>Two recordings</Text>
        <View style={styles.introBox}>
          <Text style={styles.introItem}>1. Lie flat. Place phone face-up on your chest, then record breathing at rest.</Text>
          <Text style={styles.introItem}>2. Do 20 jumping jacks (or similar), then repeat the recording.</Text>
          <Text style={styles.introItem}>3. Compare the two BPM values and save.</Text>
        </View>

        {/* STEM-145: Video recorder — have a teammate film the breathing test. */}
        <Text style={styles.sectionTitle}>Record the test</Text>
        <VideoRecorder
          activityPrefix="breathing"
          onVideoSaved={handleVideoSaved}
          style={{ marginBottom: 12 }}
        />

        {/* STEM-145: Slow-mo playback — review chest movement patterns. */}
        {videoUri && (
          <>
            <Text style={styles.sectionTitle}>Review recording</Text>
            <VideoPlayer
              uri={videoUri}
              style={{ marginBottom: 12 }}
            />
          </>
        )}

        <Text style={styles.sectionTitle}>Recording duration</Text>
        <View style={styles.durationRow}>
          <TouchableOpacity
            style={styles.stepButton}
            onPress={() => adjustDuration(-5)}
            disabled={durationSec <= MIN_DURATION_SEC}
          >
            <Text style={styles.stepButtonText}>−</Text>
          </TouchableOpacity>
          <View style={styles.durationValueBox}>
            <Text style={styles.durationValue}>{durationSec}s</Text>
          </View>
          <TouchableOpacity
            style={styles.stepButton}
            onPress={() => adjustDuration(5)}
            disabled={durationSec >= MAX_DURATION_SEC}
          >
            <Text style={styles.stepButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => startRecording('rest')}>
          <Text style={styles.primaryButtonText}>Start recording at rest</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Recording (either phase)
  if (phase === 'recording-rest' || phase === 'recording-active') {
    const which = phase === 'recording-rest' ? 'Rest' : 'After exercise';
    return (
      <View>
        <Text style={styles.sectionTitle}>{which} recording</Text>
        <View style={styles.countdownBox}>
          <Text style={styles.countdownLabel}>RECORDING</Text>
          <Text style={styles.countdownValue}>{remaining.toFixed(1)}</Text>
          <Text style={styles.countdownUnit}>seconds left</Text>
        </View>
        <Text style={styles.helperText}>
          Stay still. Breathe normally.
        </Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={cancelRecording}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Done-rest — show result, prompt to do exercise
  if (phase === 'done-rest') {
    return (
      <View>
        <ResultBlock label="At rest" result={restResult} />
        <Text style={styles.helperText}>
          Now do 20 jumping jacks (or run on the spot for 30 seconds). Come back when your heart is racing.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setPhase('between')}>
          <Text style={styles.primaryButtonText}>I've done the exercise</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={resetAll}>
          <Text style={styles.secondaryButtonText}>Start over</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Between — ready to record active
  if (phase === 'between') {
    return (
      <View>
        <ResultBlock label="At rest" result={restResult} />
        <TouchableOpacity style={styles.primaryButton} onPress={() => startRecording('active')}>
          <Text style={styles.primaryButtonText}>Start recording after exercise</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={resetAll}>
          <Text style={styles.secondaryButtonText}>Start over</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Done-active — show both, allow save
  if (phase === 'done-active') {
    const delta = activeResult.bpm - restResult.bpm;
    return (
      <View>
        <ResultBlock label="At rest" result={restResult} />
        <ResultBlock label="After exercise" result={activeResult} />
        <View style={styles.deltaBox}>
          <Text style={styles.deltaLabel}>Difference</Text>
          <Text style={styles.deltaValue}>{delta > 0 ? `+${delta}` : delta} bpm</Text>
        </View>

        {/* STEM-145: Show video playback on final review if recorded. */}
        {videoUri && (
          <>
            <Text style={styles.sectionTitle}>Your recording</Text>
            <VideoPlayer
              uri={videoUri}
              style={{ marginBottom: 12 }}
            />
          </>
        )}

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

  return null;
}

function ResultBlock({ label, result }) {
  return (
    <View style={styles.resultBox}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{result.bpm}</Text>
      <Text style={styles.resultUnit}>bpm</Text>
      <View style={styles.resultMetaRow}>
        <Text style={styles.resultMeta}>{result.breathCount} breaths</Text>
        <Text style={styles.resultMeta}>confidence: {result.confidence}</Text>
      </View>
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
  countdownLabel: { fontSize: 11, color: '#534AB7', letterSpacing: 0.5, marginBottom: 4 },
  countdownValue: { fontSize: 48, fontWeight: '300', color: '#534AB7' },
  countdownUnit: { fontSize: 12, color: '#534AB7', marginTop: 2 },
  resultBox: {
    backgroundColor: '#F0EEF9',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginVertical: 6,
  },
  resultLabel: {
    fontSize: 11,
    color: '#534AB7',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultValue: { fontSize: 32, fontWeight: '500', color: '#534AB7' },
  resultUnit: { fontSize: 11, color: '#534AB7', marginTop: 2 },
  resultMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#D8D2EE',
  },
  resultMeta: { fontSize: 10, color: '#534AB7' },
  deltaBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deltaLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deltaValue: { fontSize: 24, fontWeight: '500', color: '#1A1A1A' },
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
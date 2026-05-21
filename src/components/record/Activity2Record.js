// STEM-117, STEM-120, STEM-121: Activity 2 Record tab — live dB sampling, 3 sound source attempts, save to data layer.
// STEM-145: Added video recording + slow-mo playback per attempt for capturing sound source evidence.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import {
  requestMicrophonePermission,
  getMicrophonePermissionStatus,
  useSoundLevelSampler,
} from '../../services/audioService';
import { processAmplitude } from '../../services/soundLevel';
import { saveResult } from '../../services/resultSaveHelper';
// STEM-145: Video recording and slow-mo playback for capturing sound source evidence.
import VideoRecorder from '../VideoRecorder';
import VideoPlayer from '../VideoPlayer';
import { deleteVideo } from '../../services/videoService';

// STEM-120: 3 sound source attempts (e.g. dropping book, talking, stamping feet).
const ATTEMPT_LABELS = ['Sound 1', 'Sound 2', 'Sound 3'];
const INITIAL_ATTEMPT = {
  sourceName: '',       // e.g. "Dropping a book"
  prediction: '',       // 'louder' | 'softer' | ''  (vs previous sound)
  peakDb: null,         // captured peak during sampling
  avgDb: null,          // captured average during sampling
  videoUri: null,       // STEM-145: recorded video URI for this attempt
};

export default function Activity2Record({ activity }) {
  const [attempts, setAttempts] = useState([
    { ...INITIAL_ATTEMPT },
    { ...INITIAL_ATTEMPT },
    { ...INITIAL_ATTEMPT },
  ]);
  const [currentAttemptIdx, setCurrentAttemptIdx] = useState(0);

  // STEM-118: Permission state — null = unknown, false = denied, true = granted.
  const [hasPermission, setHasPermission] = useState(null);
  const [liveDb, setLiveDb] = useState(null);
  const [liveRisk, setLiveRisk] = useState(null);

  // STEM-120: Peak + sum tracking during a sampling session — refs avoid stale state inside the sampler callback.
  const peakRef = useRef(0);
  const sumRef = useRef(0);
  const countRef = useRef(0);

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // STEM-119: Convert each raw sample → dB + risk, and track peak/average for the active attempt.
  const handleSample = useCallback(({ metering }) => {
    const { db, risk } = processAmplitude(metering);

    if (db > peakRef.current) peakRef.current = db;
    sumRef.current += db;
    countRef.current += 1;

    setLiveDb(db);
    setLiveRisk(risk);
  }, []);

  // STEM-118: Hook owns the recorder + polling loop.
  const { start, stop, isSampling } = useSoundLevelSampler(handleSample);

  const currentAttempt = attempts[currentAttemptIdx];

  // STEM-118: Check permission status on mount so we know whether to show the gate.
  useEffect(() => {
    getMicrophonePermissionStatus().then(setHasPermission);
  }, []);

  // STEM-145: Save recorded video URI to the current attempt, delete any previous video for this attempt.
  const handleVideoSaved = useCallback(async (uri) => {
    const oldUri = attempts[currentAttemptIdx].videoUri;
    if (oldUri) {
      await deleteVideo(oldUri);
    }
    setAttempts((prev) =>
      prev.map((att, i) =>
        i === currentAttemptIdx ? { ...att, videoUri: uri } : att
      )
    );
  }, [currentAttemptIdx, attempts]);

  const updateAttemptInput = (key) => (value) => {
    setAttempts((prev) =>
      prev.map((att, i) =>
        i === currentAttemptIdx ? { ...att, [key]: value } : att
      )
    );
    setSaveStatus(null);
  };

  // STEM-118: Prompt for mic on user tap — never automatically on mount.
  async function handleRequestPermission() {
    const granted = await requestMicrophonePermission();
    setHasPermission(granted);
    if (!granted) {
      Alert.alert(
        'Microphone needed',
        'Sound Pollution Hunter needs the microphone to measure sound levels. Enable it in your phone settings.'
      );
    }
  }

  // STEM-120: Start measuring. Resets peak/avg trackers and begins live updates.
  const handleStartSampling = useCallback(async () => {
    if (isSampling) return;

    if (!hasPermission) {
      await handleRequestPermission();
      return;
    }

    peakRef.current = 0;
    sumRef.current = 0;
    countRef.current = 0;
    setLiveDb(null);
    setLiveRisk(null);

    try {
      await start();
      setSaveStatus(null);
    } catch (err) {
      console.error('Activity2Record: startSampling failed', err);
      Alert.alert('Could not start microphone', err?.message ?? 'Unknown error');
    }
  }, [isSampling, hasPermission, start]);

  // STEM-120: Stop measuring and commit peak + average to the current attempt.
  const handleStopSampling = useCallback(async () => {
    if (!isSampling) return;

    await stop();

    const avg = countRef.current > 0 ? sumRef.current / countRef.current : null;
    const peak = peakRef.current > 0 ? peakRef.current : null;

    setAttempts((prev) =>
      prev.map((att, i) =>
        i === currentAttemptIdx
          ? { ...att, peakDb: peak, avgDb: avg }
          : att
      )
    );
  }, [isSampling, currentAttemptIdx, stop]);

  // STEM-121: Save validation — every attempt needs a name + a measurement.
  const canSave =
    attempts.every((att) => att.sourceName && att.peakDb !== null) && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setSaveStatus(null);

    try {
      // STEM-121: Multi-attempt payload mirrors Activity 1's structure.
      const payload = {
        attempts: attempts.map((att) => ({
          sourceName: att.sourceName,
          prediction: att.prediction,
          peakDb: att.peakDb,
          avgDb: att.avgDb,
          videoUri: att.videoUri,  // STEM-145: path to recorded sound source video
          riskLabel:
            att.peakDb !== null
              ? processAmplitude(amplitudeFromDb(att.peakDb)).risk.label
              : null,
        })),
        loudest: getLoudestSource(attempts),
      };

      const result = await saveResult({
        activityId: String(activity.id),
        payload,
      });

      setSaveStatus(result.synced ? 'synced' : 'local');
    } catch (err) {
      console.error('Activity2Record save failed:', err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* STEM-118: Permission gate — show "Grant access" until mic is allowed. */}
      {hasPermission === false && (
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Microphone needed</Text>
          <Text style={styles.permissionBody}>
            To measure sound levels, this activity needs access to your phone's microphone.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={handleRequestPermission}>
            <Text style={styles.permissionButtonText}>Grant access</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEM-120: Attempt tabs (Sound 1, 2, 3). */}
      <Text style={styles.sectionTitle}>Test Sounds</Text>
      <View style={styles.attemptTabs}>
        {ATTEMPT_LABELS.map((label, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.attemptTab,
              currentAttemptIdx === idx && styles.attemptTabActive,
            ]}
            onPress={() => {
              if (isSampling) return; // Don't switch tabs mid-recording.
              setCurrentAttemptIdx(idx);
            }}
          >
            <Text
              style={[
                styles.attemptTabText,
                currentAttemptIdx === idx && styles.attemptTabTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.attemptBox}>
        <Text style={styles.label}>Sound source</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Dropping a book on the table"
          placeholderTextColor="#9CA3AF"
          value={currentAttempt.sourceName}
          onChangeText={updateAttemptInput('sourceName')}
          editable={!saving && !isSampling}
        />

        {/* STEM-120: Prediction picker — louder/softer vs previous sound. */}
        {currentAttemptIdx > 0 && (
          <>
            <Text style={styles.label}>
              Predict: louder or softer than {ATTEMPT_LABELS[currentAttemptIdx - 1]}?
            </Text>
            <View style={styles.predictionRow}>
              {['louder', 'softer'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.predictionChip,
                    currentAttempt.prediction === option && styles.predictionChipActive,
                  ]}
                  onPress={() => updateAttemptInput('prediction')(option)}
                  disabled={saving || isSampling}
                >
                  <Text
                    style={[
                      styles.predictionChipText,
                      currentAttempt.prediction === option && styles.predictionChipTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* STEM-145: Video recorder — students film each sound source being produced. */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Record the sound source</Text>
        <VideoRecorder
          activityPrefix={`sound_s${currentAttemptIdx + 1}`}
          onVideoSaved={handleVideoSaved}
          style={{ marginBottom: 12 }}
        />

        {/* STEM-145: Slow-mo playback — review the sound source video. */}
        {currentAttempt.videoUri && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Review recording</Text>
            <VideoPlayer
              uri={currentAttempt.videoUri}
              style={{ marginBottom: 12 }}
            />
          </>
        )}

        {/* STEM-119: Live dB readout. Big number, colour-coded risk band. */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Live reading</Text>
        <View style={styles.liveDisplay}>
          <Text
            style={[
              styles.liveDb,
              liveRisk && { color: liveRisk.color },
            ]}
          >
            {liveDb !== null ? `${liveDb.toFixed(0)}` : '–'}
            <Text style={styles.liveDbUnit}> dB</Text>
          </Text>
          {liveRisk && (
            <View style={[styles.riskBadge, { backgroundColor: `${liveRisk.color}15` }]}>
              <Text style={[styles.riskLabel, { color: liveRisk.color }]}>
                {liveRisk.label} — {liveRisk.risk}
              </Text>
            </View>
          )}
        </View>

        {/* STEM-120: Start/Stop button. */}
        {!isSampling ? (
          <TouchableOpacity
            style={[styles.sampleButton, !hasPermission && styles.sampleButtonDisabled]}
            onPress={handleStartSampling}
            disabled={!hasPermission || saving}
          >
            <Text style={styles.sampleButtonText}>Start measuring</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sampleButton, styles.sampleButtonStop]}
            onPress={handleStopSampling}
          >
            <Text style={styles.sampleButtonText}>Stop measuring</Text>
          </TouchableOpacity>
        )}

        {/* STEM-120: Captured peak + average for this attempt. */}
        {currentAttempt.peakDb !== null && (
          <View style={styles.capturedBox}>
            <ResultRow label="Peak dB" value={`${currentAttempt.peakDb.toFixed(1)} dB`} />
            <ResultRow
              label="Average dB"
              value={currentAttempt.avgDb !== null ? `${currentAttempt.avgDb.toFixed(1)} dB` : '–'}
            />
          </View>
        )}
      </View>

      {/* STEM-120: Summary table across all 3 sounds. */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Summary</Text>
      <SummaryTable attempts={attempts} />

      {/* STEM-121: Save button + status feedback (same pattern as Activity 1). */}
      <TouchableOpacity
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!canSave}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Save all sounds</Text>
        )}
      </TouchableOpacity>

      {saveStatus === 'synced' && (
        <Text style={styles.statusSynced}>✓ Saved and uploaded</Text>
      )}
      {saveStatus === 'local' && (
        <Text style={styles.statusLocal}>✓ Saved — will upload when online</Text>
      )}
      {saveStatus === 'error' && (
        <Text style={styles.statusError}>Save failed. Try again.</Text>
      )}
    </ScrollView>
  );
}

// STEM-120: Summary table — sound source, peak dB, risk label, prediction outcome.
function SummaryTable({ attempts }) {
  return (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, styles.sourceCol]}>Source</Text>
        <Text style={[styles.tableHeaderCell, styles.dbCol]}>Peak dB</Text>
        <Text style={[styles.tableHeaderCell, styles.riskCol]}>Risk</Text>
      </View>

      {attempts.map((att, i) => {
        const riskLabel =
          att.peakDb !== null
            ? processAmplitude(amplitudeFromDb(att.peakDb)).risk
            : null;

        return (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.sourceCol]}>
              {att.sourceName || '–'}
            </Text>
            <Text style={[styles.tableCell, styles.dbCol]}>
              {att.peakDb !== null ? att.peakDb.toFixed(0) : '–'}
            </Text>
            <View style={[styles.tableCell, styles.riskCol]}>
              {riskLabel ? (
                <Text style={[styles.tableRiskText, { color: riskLabel.color }]}>
                  {riskLabel.label}
                </Text>
              ) : (
                <Text style={styles.verdictDash}>–</Text>
              )}
            </View>
          </View>
        );
      })}

      {attempts.some((a) => a.peakDb !== null) && (
        <View style={styles.tableFooter}>
          <Text style={styles.tableFooterLabel}>
            Loudest sound:{' '}
            <Text style={styles.tableFooterValue}>
              {getLoudestSource(attempts) || '–'}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}

// STEM-120: Helper — which source had the highest peak dB?
function getLoudestSource(attempts) {
  const valid = attempts.filter((a) => a.peakDb !== null && a.sourceName);
  if (valid.length === 0) return null;
  return valid.reduce((prev, curr) => (curr.peakDb > prev.peakDb ? curr : prev)).sourceName;
}

// STEM-119: Reverse-map a dB value back to dBFS so the summary table can re-derive the risk label.
function amplitudeFromDb(db) {
  const t = (db - 30) / (110 - 30);
  return t * 60 - 60;
}

function ResultRow({ label, value }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },
  // STEM-118: Permission gate styling.
  permissionBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 6,
  },
  permissionBody: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 6,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  // STEM-120: Attempt tabs.
  attemptTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  attemptTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  attemptTabActive: {
    backgroundColor: '#534AB7',
    borderColor: '#534AB7',
  },
  attemptTabText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  attemptTabTextActive: {
    color: '#FFFFFF',
  },
  attemptBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  // STEM-120: Prediction chips (louder/softer).
  predictionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  predictionChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  predictionChipActive: {
    backgroundColor: '#534AB7',
    borderColor: '#534AB7',
  },
  predictionChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  predictionChipTextActive: {
    color: '#FFFFFF',
  },
  // STEM-119: Live dB display.
  liveDisplay: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  liveDb: {
    fontSize: 64,
    fontWeight: '300',
    color: '#1A1A1A',
    fontVariant: ['tabular-nums'],
  },
  liveDbUnit: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 8,
  },
  riskLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  // STEM-120: Start/stop sampling button.
  sampleButton: {
    backgroundColor: '#534AB7',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  sampleButtonStop: {
    backgroundColor: '#D85A30',
  },
  sampleButtonDisabled: {
    opacity: 0.4,
  },
  sampleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  capturedBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  resultLabel: {
    fontSize: 13,
    color: '#374151',
  },
  resultValue: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  // STEM-120: Summary table.
  tableContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    marginVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  sourceCol: { flex: 2, textAlign: 'left' },
  dbCol: { flex: 1 },
  riskCol: { flex: 1.5, justifyContent: 'center', alignItems: 'center' },
  tableRiskText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  verdictDash: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  tableFooter: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tableFooterLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  tableFooterValue: {
    fontWeight: '600',
    color: '#1A1A1A',
  },
  // STEM-121: Save button + status feedback (same pattern as Activity 1).
  saveButton: {
    backgroundColor: '#7F77DD',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statusSynced: {
    fontSize: 12,
    color: '#059669',
    textAlign: 'center',
    marginTop: 10,
  },
  statusLocal: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
  },
  statusError: {
    fontSize: 12,
    color: '#D85A30',
    textAlign: 'center',
    marginTop: 10,
  },
});
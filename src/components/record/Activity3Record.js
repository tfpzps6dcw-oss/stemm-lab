// STEM-122, STEM-125: Activity 3 Record tab — fan distance chips, photo capture, bend angle input, save to data layer.
// STEM-145: Added video recording + slow-mo playback per attempt for capturing fan test evidence.

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
  Image,
  Modal,
} from 'react-native';
import { useCameraCapture, CameraView, deletePhoto } from '../../services/cameraService';
import { parseAngle, getAngleVerdict, getMostBent, ANGLE_LIMITS } from '../../services/bendAngle';
import { saveResult } from '../../services/resultSaveHelper';
// STEM-145: Video recording and slow-mo playback for capturing fan test evidence.
import VideoRecorder from '../VideoRecorder';
import VideoPlayer from '../VideoPlayer';
import { deleteVideo } from '../../services/videoService';

// STEM-125: 3 fan design attempts, mirroring Activity 1/2's multi-attempt pattern.
const ATTEMPT_LABELS = ['Design 1', 'Design 2', 'Design 3'];

// STEM-125: Distance chips from the spec (15/30/45 cm) — free choice per attempt.
const DISTANCE_OPTIONS = [15, 30, 45];
const MATERIAL_OPTIONS = ['paper', 'cardboard'];

const INITIAL_ATTEMPT = {
  designName: '',       // e.g. "1cm folds back and forward"
  material: 'paper',    // 'paper' | 'cardboard'
  distanceCm: 30,       // fan distance in cm
  predictedAngle: '',   // student's prediction (degrees)
  actualAngle: '',      // measured/observed angle (degrees)
  photoUri: null,       // STEM-123: saved photo path
  videoUri: null,       // STEM-145: recorded video URI for this attempt
};

export default function Activity3Record({ activity }) {
  const [attempts, setAttempts] = useState([
    { ...INITIAL_ATTEMPT },
    { ...INITIAL_ATTEMPT },
    { ...INITIAL_ATTEMPT },
  ]);
  const [currentAttemptIdx, setCurrentAttemptIdx] = useState(0);
  const [cameraVisible, setCameraVisible] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // STEM-123: Hook owns camera permission state + capture lifecycle.
  const { hasPermission, requestPermission, cameraRef, capture, isCapturing } = useCameraCapture();

  const currentAttempt = attempts[currentAttemptIdx];

  // STEM-123: Clean up orphan photos if the component unmounts mid-save.
  const attemptsRef = useRef(attempts);
  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

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

  // STEM-123: Open the camera modal — request permission first if needed.
  async function handleOpenCamera() {
    if (hasPermission === false) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Camera needed',
          'Hand Fan Challenge uses the camera to record your design. Enable it in your phone settings.'
        );
        return;
      }
    } else if (hasPermission === null) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    setCameraVisible(true);
  }

  // STEM-123: Capture and attach the photo to the current attempt, replacing any previous one.
  const handleCapture = useCallback(async () => {
    try {
      const uri = await capture();

      if (currentAttempt.photoUri) {
        await deletePhoto(currentAttempt.photoUri);
      }

      setAttempts((prev) =>
        prev.map((att, i) =>
          i === currentAttemptIdx ? { ...att, photoUri: uri } : att
        )
      );
      setCameraVisible(false);
      setSaveStatus(null);
    } catch (err) {
      console.error('Activity3Record: capture failed', err);
      Alert.alert('Could not take photo', err?.message ?? 'Unknown error');
    }
  }, [capture, currentAttempt.photoUri, currentAttemptIdx]);

  async function handleRetakePhoto() {
    if (currentAttempt.photoUri) {
      await deletePhoto(currentAttempt.photoUri);
      updateAttemptInput('photoUri')(null);
    }
    handleOpenCamera();
  }

  // STEM-124, STEM-125: Save validation — every attempt needs a name, photo, and actual angle.
  const canSave =
    attempts.every(
      (att) =>
        att.designName &&
        att.photoUri &&
        parseAngle(att.actualAngle) !== null
    ) && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setSaveStatus(null);

    try {
      // STEM-125: Multi-attempt payload — same shape as Activity 1/2.
      const payload = {
        attempts: attempts.map((att) => ({
          designName: att.designName,
          material: att.material,
          distanceCm: att.distanceCm,
          predictedAngle: parseAngle(att.predictedAngle),
          actualAngle: parseAngle(att.actualAngle),
          verdict: getAngleVerdict(att.predictedAngle, att.actualAngle),
          photoUri: att.photoUri,
          videoUri: att.videoUri,  // STEM-145: path to recorded fan test video
        })),
        mostBent: getMostBent(attempts),
      };

      const result = await saveResult({
        activityId: String(activity.id),
        payload,
      });

      setSaveStatus(result.synced ? 'synced' : 'local');
    } catch (err) {
      console.error('Activity3Record save failed:', err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* STEM-125: Attempt tabs. */}
      <Text style={styles.sectionTitle}>Test Designs</Text>
      <View style={styles.attemptTabs}>
        {ATTEMPT_LABELS.map((label, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.attemptTab,
              currentAttemptIdx === idx && styles.attemptTabActive,
            ]}
            onPress={() => setCurrentAttemptIdx(idx)}
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
        <Text style={styles.label}>Fan design</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 1cm back-and-forward folds"
          placeholderTextColor="#9CA3AF"
          value={currentAttempt.designName}
          onChangeText={updateAttemptInput('designName')}
          editable={!saving}
        />

        {/* STEM-125: Material chips (paper/cardboard). */}
        <Text style={styles.label}>Paper material</Text>
        <View style={styles.chipRow}>
          {MATERIAL_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.chip,
                currentAttempt.material === option && styles.chipActive,
              ]}
              onPress={() => updateAttemptInput('material')(option)}
              disabled={saving}
            >
              <Text
                style={[
                  styles.chipText,
                  currentAttempt.material === option && styles.chipTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* STEM-125: Distance chips (15/30/45 cm). */}
        <Text style={styles.label}>Fan distance</Text>
        <View style={styles.chipRow}>
          {DISTANCE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.chip,
                currentAttempt.distanceCm === option && styles.chipActive,
              ]}
              onPress={() => updateAttemptInput('distanceCm')(option)}
              disabled={saving}
            >
              <Text
                style={[
                  styles.chipText,
                  currentAttempt.distanceCm === option && styles.chipTextActive,
                ]}
              >
                {option} cm
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* STEM-145: Video recorder — students film the fan test to observe paper movement. */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Record the fan test</Text>
        <VideoRecorder
          activityPrefix={`fan_d${currentAttemptIdx + 1}`}
          onVideoSaved={handleVideoSaved}
          style={{ marginBottom: 12 }}
        />

        {/* STEM-145: Slow-mo playback — review to observe bend angle and paper movement. */}
        {currentAttempt.videoUri && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Review (slow-mo)</Text>
            <VideoPlayer
              uri={currentAttempt.videoUri}
              style={{ marginBottom: 12 }}
            />
          </>
        )}

        {/* STEM-123: Photo capture section. */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Photo evidence</Text>
        {currentAttempt.photoUri ? (
          <View style={styles.photoBox}>
            <Image source={{ uri: currentAttempt.photoUri }} style={styles.photoThumb} />
            <TouchableOpacity style={styles.retakeButton} onPress={handleRetakePhoto}>
              <Text style={styles.retakeButtonText}>Retake photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleOpenCamera}
            disabled={saving}
          >
            <Text style={styles.captureButtonText}>📷 Take photo</Text>
          </TouchableOpacity>
        )}

        {/* STEM-124: Bend angle inputs. */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Bend angle</Text>
        <Text style={styles.helperText}>
          Use a protractor or estimate by eye. Range: {ANGLE_LIMITS.min}°–{ANGLE_LIMITS.max}°.
        </Text>

        <Text style={styles.label}>Predicted angle (°)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 30"
          placeholderTextColor="#9CA3AF"
          value={currentAttempt.predictedAngle}
          onChangeText={updateAttemptInput('predictedAngle')}
          keyboardType="decimal-pad"
          editable={!saving}
        />

        <Text style={styles.label}>Actual angle (°)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 35"
          placeholderTextColor="#9CA3AF"
          value={currentAttempt.actualAngle}
          onChangeText={updateAttemptInput('actualAngle')}
          keyboardType="decimal-pad"
          editable={!saving}
        />

        {/* STEM-124: Verdict badge — only shows when both angles are valid. */}
        <VerdictBadge
          predicted={currentAttempt.predictedAngle}
          actual={currentAttempt.actualAngle}
        />
      </View>

      {/* STEM-125: Summary table. */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Summary</Text>
      <SummaryTable attempts={attempts} />

      {/* STEM-125: Save button + status feedback. */}
      <TouchableOpacity
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!canSave}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Save all designs</Text>
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

      {/* STEM-123: Full-screen camera modal — only mounted when visible to free resources otherwise. */}
      <Modal
        visible={cameraVisible}
        animationType="slide"
        onRequestClose={() => setCameraVisible(false)}
      >
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.cameraView}
            facing="back"
          />
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.cameraCancel}
              onPress={() => setCameraVisible(false)}
            >
              <Text style={styles.cameraCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shutterButton, isCapturing && styles.shutterButtonDisabled]}
              onPress={handleCapture}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>

            <View style={styles.cameraSpacer} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// STEM-124: Verdict badge — green ✓ / red ✗ / hidden until both values present.
function VerdictBadge({ predicted, actual }) {
  const verdict = getAngleVerdict(predicted, actual);
  if (verdict === null) return null;

  return (
    <View
      style={[
        styles.verdictBadge,
        verdict === 'correct' ? styles.verdictCorrectBg : styles.verdictIncorrectBg,
      ]}
    >
      <Text
        style={[
          styles.verdictText,
          verdict === 'correct' ? styles.verdictCorrectText : styles.verdictIncorrectText,
        ]}
      >
        {verdict === 'correct'
          ? `✓ Correct (within ±${ANGLE_LIMITS.tolerance}°)`
          : `✗ Off by more than ±${ANGLE_LIMITS.tolerance}°`}
      </Text>
    </View>
  );
}

// STEM-125: Summary table — design, distance, predicted vs actual, verdict.
function SummaryTable({ attempts }) {
  return (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, styles.designCol]}>Design</Text>
        <Text style={[styles.tableHeaderCell, styles.numCol]}>Dist</Text>
        <Text style={[styles.tableHeaderCell, styles.numCol]}>Pred</Text>
        <Text style={[styles.tableHeaderCell, styles.numCol]}>Actual</Text>
        <Text style={[styles.tableHeaderCell, styles.checkCol]}>Right?</Text>
      </View>

      {attempts.map((att, i) => {
        const verdict = getAngleVerdict(att.predictedAngle, att.actualAngle);
        const actualNum = parseAngle(att.actualAngle);

        return (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.designCol]}>
              {att.designName || '–'}
            </Text>
            <Text style={[styles.tableCell, styles.numCol]}>
              {att.distanceCm}cm
            </Text>
            <Text style={[styles.tableCell, styles.numCol]}>
              {att.predictedAngle ? `${att.predictedAngle}°` : '–'}
            </Text>
            <Text style={[styles.tableCell, styles.numCol]}>
              {actualNum !== null ? `${actualNum}°` : '–'}
            </Text>
            <View style={[styles.tableCell, styles.checkCol]}>
              {verdict === 'correct' && <Text style={styles.checkmark}>✓</Text>}
              {verdict === 'incorrect' && <Text style={styles.cross}>✗</Text>}
              {verdict === null && <Text style={styles.dashText}>–</Text>}
            </View>
          </View>
        );
      })}

      {attempts.some((a) => parseAngle(a.actualAngle) !== null) && (
        <View style={styles.tableFooter}>
          <Text style={styles.tableFooterLabel}>
            Bent the most:{' '}
            <Text style={styles.tableFooterValue}>
              {getMostBent(attempts) || '–'}
            </Text>
          </Text>
        </View>
      )}
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
  helperText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 6,
    fontStyle: 'italic',
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
  // STEM-125: Attempt tabs (same as Activities 1 + 2).
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
  // STEM-125: Chip rows (material + distance).
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: '#534AB7',
    borderColor: '#534AB7',
  },
  chipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  // STEM-123: Photo capture UI.
  captureButton: {
    backgroundColor: '#534AB7',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  photoBox: {
    alignItems: 'center',
    gap: 8,
  },
  photoThumb: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  retakeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  retakeButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  // STEM-124: Verdict badge.
  verdictBadge: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  verdictCorrectBg: { backgroundColor: '#ECFDF5' },
  verdictIncorrectBg: { backgroundColor: '#FEF2F2' },
  verdictText: {
    fontSize: 12,
    fontWeight: '500',
  },
  verdictCorrectText: { color: '#059669' },
  verdictIncorrectText: { color: '#D85A30' },
  // STEM-125: Summary table.
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
    paddingHorizontal: 4,
    fontSize: 10,
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
  // STEM-125: Save button + status feedback.
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
  // STEM-123: Camera modal styling.
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraView: {
    flex: 1,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cameraCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cameraCancelText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  shutterButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterButtonDisabled: { opacity: 0.5 },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
  },
  cameraSpacer: {
    width: 70,
  },
});
// STEM-114, STEM-111, STEM-112: Activity 1 Record tab — multi-attempt prototype tracking with predictions.
// STEM-145: Added video recording (VideoRecorder) and slow-mo playback (VideoPlayer) per attempt.
//   Students record each drop, review in slow-mo to measure contact time for g-force calculations.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Timer from '../Timer';
// STEM-145: Video recording and slow-mo playback components for capturing drop evidence.
import VideoRecorder from '../VideoRecorder';
import VideoPlayer from '../VideoPlayer';
import { deleteVideo } from '../../services/videoService';
import {
  calculateVelocity,
  calculateAcceleration,
  calculateNetForce,
  calculateWeight,
  calculateDragForce,
  calculateGForceNoBounce,
} from '../../services/parachutePhysics';
import { saveResult } from '../../services/resultSaveHelper';

// STEM-114: Prediction + 3 prototype attempts.
const ATTEMPT_LABELS = ['Design 1', 'Design 2', 'Design 3'];
const INITIAL_ATTEMPT = {
  designName: '',       // e.g. "4 folds + 4 pillars"
  predictedTime: '',    // seconds
  dropHeight: '',       // metres
  toyMass: '',          // kg
  contactTime: '',      // seconds (HS only)
  fallTimeMs: null,     // measured by timer
  calcs: null,          // computed physics results
  videoUri: null,       // STEM-145: recorded video URI for this attempt
};

export default function Activity1Record({ activity }) {
  // STEM-114: Single prediction input (shared across all attempts).
  const [prediction, setPrediction] = useState('');

  // STEM-114: Track 3 attempts independently.
  const [attempts, setAttempts] = useState([
    { ...INITIAL_ATTEMPT },
    { ...INITIAL_ATTEMPT },
    { ...INITIAL_ATTEMPT },
  ]);

  const [currentAttemptIdx, setCurrentAttemptIdx] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'synced' | 'local' | 'error' | null

  const currentAttempt = attempts[currentAttemptIdx];

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

  // STEM-114: Update inputs for current attempt.
  const updateAttemptInput = (key) => (value) => {
    setAttempts((prev) =>
      prev.map((att, i) =>
        i === currentAttemptIdx ? { ...att, [key]: value } : att
      )
    );
    setSaveStatus(null);
  };

  // STEM-114: Timer callback updates fallTimeMs for current attempt.
  const handleTimerStop = useCallback((elapsedMs) => {
    setAttempts((prev) =>
      prev.map((att, i) =>
        i === currentAttemptIdx ? { ...att, fallTimeMs: elapsedMs } : att
      )
    );
    setSaveStatus(null);
  }, [currentAttemptIdx]);

  // STEM-114: Live calcs for current attempt.
  const calcs = calculateAll(currentAttempt.fallTimeMs, {
    dropHeight: currentAttempt.dropHeight,
    toyMass: currentAttempt.toyMass,
    contactTime: currentAttempt.contactTime,
  });

  // STEM-114: All 3 designs must have predictions + results before saving.
  const canSave =
    prediction &&
    attempts.every(
      (att) =>
        att.designName &&
        att.dropHeight &&
        att.toyMass &&
        att.fallTimeMs !== null &&
        att.predictedTime
    ) &&
    !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setSaveStatus(null);

    try {
      // STEM-114: Compile all attempts into a single payload.
      const payload = {
        prediction, // Which design did students predict would be fastest?
        attempts: attempts.map((att) => ({
          designName: att.designName,
          predictedTimeS: parseFloat(att.predictedTime),
          dropHeightM: parseFloat(att.dropHeight),
          toyMassKg: parseFloat(att.toyMass),
          contactTimeS: att.contactTime ? parseFloat(att.contactTime) : null,
          fallTimeMs: att.fallTimeMs,
          fallTimeS: att.fallTimeMs / 1000,
          videoUri: att.videoUri,  // STEM-145: path to recorded drop video
          ...calculateAll(att.fallTimeMs, {
            dropHeight: att.dropHeight,
            toyMass: att.toyMass,
            contactTime: att.contactTime,
          }),
        })),
      };

      const result = await saveResult({
        activityId: activity.id,
        payload,
      });

      setSaveStatus(result.synced ? 'synced' : 'local');
    } catch (err) {
      console.error('Activity1Record save failed:', err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* STEM-114: Initial prediction question */}
      <Text style={styles.sectionTitle}>Prediction</Text>
      <Text style={styles.label}>
        Which design do you think will have the slowest fall?
      </Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Design with more surface area"
        placeholderTextColor="#9CA3AF"
        value={prediction}
        onChangeText={setPrediction}
        editable={!saving}
      />

      {/* STEM-114: Attempt tabs */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Test Designs</Text>
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

      {/* STEM-114: Current attempt inputs */}
      <View style={styles.attemptBox}>
        <Text style={styles.label}>Design description</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 4 folds + 4 pillars"
          placeholderTextColor="#9CA3AF"
          value={currentAttempt.designName}
          onChangeText={updateAttemptInput('designName')}
          editable={!saving}
        />

        <Text style={styles.label}>Predict fall time (s)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 1.5"
          placeholderTextColor="#9CA3AF"
          value={currentAttempt.predictedTime}
          onChangeText={updateAttemptInput('predictedTime')}
          keyboardType="decimal-pad"
          editable={!saving}
        />

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Setup</Text>
        <Text style={styles.label}>Drop height (m)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 1.0"
          placeholderTextColor="#9CA3AF"
          value={currentAttempt.dropHeight}
          onChangeText={updateAttemptInput('dropHeight')}
          keyboardType="decimal-pad"
          editable={!saving}
        />

        <Text style={styles.label}>Toy mass (kg)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 0.20"
          placeholderTextColor="#9CA3AF"
          value={currentAttempt.toyMass}
          onChangeText={updateAttemptInput('toyMass')}
          keyboardType="decimal-pad"
          editable={!saving}
        />

        {/* STEM-145: Video recorder — students film each drop attempt. */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Record the drop</Text>
        <VideoRecorder
          activityPrefix={`parachute_d${currentAttemptIdx + 1}`}
          onVideoSaved={handleVideoSaved}
          style={{ marginBottom: 12 }}
        />

        {/* STEM-145: Slow-mo playback — review the drop to measure contact time for g-force. */}
        {currentAttempt.videoUri && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Review (slow-mo)</Text>
            <VideoPlayer
              uri={currentAttempt.videoUri}
              style={{ marginBottom: 12 }}
            />
          </>
        )}

        {/* STEM-111: Timer drives fall time measurement */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Drop & time</Text>
        <Timer onStop={handleTimerStop} />

        {/* STEM-111: Live results panel */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Results</Text>

        {/* STEM-114: Predicted vs Actual comparison */}
        <ComparisonRow
          label="Predicted time"
          predicted={currentAttempt.predictedTime ? `${currentAttempt.predictedTime} s` : '–'}
          actual={
            currentAttempt.fallTimeMs !== null
              ? `${(currentAttempt.fallTimeMs / 1000).toFixed(3)} s`
              : '–'
          }
          verdict={getVerdict(
            currentAttempt.predictedTime,
            currentAttempt.fallTimeMs
          )}
        />

        <ResultRow
          label="Final velocity"
          value={formatValue(calcs.velocity, 'm/s')}
        />
        <ResultRow
          label="Acceleration"
          value={formatValue(calcs.acceleration, 'm/s²')}
        />

        {/* STEM-111: Advanced (High School) section — collapsed by default */}
        <TouchableOpacity
          onPress={() => setShowAdvanced((v) => !v)}
          style={styles.advancedToggle}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvanced ? '▾' : '▸'} High school physics
          </Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View>
            <ResultRow
              label="Net force"
              value={formatValue(calcs.netForce, 'N')}
            />
            <ResultRow label="Weight" value={formatValue(calcs.weight, 'N')} />
            <ResultRow
              label="Drag force"
              value={formatValue(calcs.dragForce, 'N')}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>
              Contact time (s) — for g-force calc
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 0.05"
              placeholderTextColor="#9CA3AF"
              value={currentAttempt.contactTime}
              onChangeText={updateAttemptInput('contactTime')}
              keyboardType="decimal-pad"
              editable={!saving}
            />
            <ResultRow
              label="G-force"
              value={formatValue(calcs.gForce, 'g')}
            />
          </View>
        )}
      </View>

      {/* STEM-114: Summary table showing all attempts */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Summary</Text>
      <SummaryTable attempts={attempts} prediction={prediction} />

      {/* STEM-112: Save button + status feedback */}
      <TouchableOpacity
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!canSave}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Save all attempts</Text>
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

// STEM-114: Comparison of predicted vs actual time with a "were you right?" badge.
function ComparisonRow({ label, predicted, actual, verdict }) {
  return (
    <View style={styles.comparisonRow}>
      <View style={styles.comparisonLeft}>
        <Text style={styles.comparisonLabel}>{label}</Text>
        <View style={styles.comparisonValues}>
          <View>
            <Text style={styles.comparisonSub}>Predicted</Text>
            <Text style={styles.comparisonValue}>{predicted}</Text>
          </View>
          <View style={styles.comparisonSpacer}>
            <Text style={styles.comparisonArrow}>→</Text>
          </View>
          <View>
            <Text style={styles.comparisonSub}>Actual</Text>
            <Text style={styles.comparisonValue}>{actual}</Text>
          </View>
        </View>
      </View>
      <View
        style={[
          styles.verdictBadge,
          verdict === 'correct' && styles.verdictCorrect,
          verdict === 'incorrect' && styles.verdictIncorrect,
          verdict === null && styles.verdictPending,
        ]}
      >
        <Text
          style={[
            styles.verdictText,
            verdict === 'correct' && styles.verdictCorrectText,
            verdict === 'incorrect' && styles.verdictIncorrectText,
          ]}
        >
          {verdict === 'correct' && '✓ Correct'}
          {verdict === 'incorrect' && '✗ Try again'}
          {verdict === null && '–'}
        </Text>
      </View>
    </View>
  );
}

// STEM-114: Summary table (Design 1/2/3, predicted vs actual times, "were you right?").
function SummaryTable({ attempts, prediction }) {
  return (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, styles.tableDesignCol]}>
          Design
        </Text>
        <Text style={[styles.tableHeaderCell, styles.tableNumCol]}>
          Predicted (s)
        </Text>
        <Text style={[styles.tableHeaderCell, styles.tableNumCol]}>
          Actual (s)
        </Text>
        <Text style={[styles.tableHeaderCell, styles.tableCheckCol]}>
          Right?
        </Text>
      </View>

      {attempts.map((att, i) => {
        const actualTime =
          att.fallTimeMs !== null ? (att.fallTimeMs / 1000).toFixed(3) : '–';
        const verdict = getVerdict(att.predictedTime, att.fallTimeMs);

        return (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableDesignCol]}>
              {att.designName || '–'}
            </Text>
            <Text style={[styles.tableCell, styles.tableNumCol]}>
              {att.predictedTime || '–'}
            </Text>
            <Text style={[styles.tableCell, styles.tableNumCol]}>
              {actualTime}
            </Text>
            <View style={[styles.tableCell, styles.tableCheckCol]}>
              {verdict === 'correct' && (
                <Text style={styles.verdictCheckmark}>✓</Text>
              )}
              {verdict === 'incorrect' && (
                <Text style={styles.verdictCross}>✗</Text>
              )}
              {verdict === null && <Text style={styles.verdictDash}>–</Text>}
            </View>
          </View>
        );
      })}

      {/* STEM-114: Show which design was fastest (answer to the prediction question). */}
      {attempts.some((a) => a.fallTimeMs !== null) && (
        <View style={styles.tableFooter}>
          <Text style={styles.tableFooterLabel}>
            Fastest design:{' '}
            <Text style={styles.tableFooterValue}>
              {getFastestDesign(attempts) || '–'}
            </Text>
          </Text>
          <Text style={styles.tableFooterLabel}>
            Your prediction:{' '}
            <Text style={styles.tableFooterValue}>{prediction || '–'}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

// STEM-114: Helper — was the prediction correct? Compare predicted vs actual times within ±0.1s tolerance.
function getVerdict(predictedStr, fallTimeMs) {
  if (!predictedStr || fallTimeMs === null) return null;

  const predicted = parseFloat(predictedStr);
  const actual = fallTimeMs / 1000;

  if (!Number.isFinite(predicted)) return null;

  const diff = Math.abs(predicted - actual);
  return diff <= 0.1 ? 'correct' : 'incorrect';
}

// STEM-114: Find the design with the slowest fall (min velocity = max fall time).
function getFastestDesign(attempts) {
  const valid = attempts.filter((a) => a.fallTimeMs !== null && a.designName);
  if (valid.length === 0) return null;

  const slowest = valid.reduce((prev, curr) =>
    curr.fallTimeMs > prev.fallTimeMs ? curr : prev
  );

  return slowest.designName || null;
}

// STEM-111: Run all calculations, returning null for fields that can't be computed yet.
function calculateAll(fallTimeMs, inputs) {
  const dropHeight = parseFloat(inputs.dropHeight);
  const toyMass = parseFloat(inputs.toyMass);
  const contactTime = parseFloat(inputs.contactTime);

  const result = {
    velocity: null,
    acceleration: null,
    netForce: null,
    weight: null,
    dragForce: null,
    gForce: null,
  };

  if (fallTimeMs === null || fallTimeMs <= 0) return result;
  const fallTimeS = fallTimeMs / 1000;

  // STEM-111: Wrap each calc in try/catch — bad inputs throw, we want to display "–".
  try {
    if (dropHeight > 0) {
      result.velocity = calculateVelocity(dropHeight, fallTimeS);
      result.acceleration = calculateAcceleration(
        result.velocity,
        fallTimeS
      );
    }
    if (toyMass > 0 && result.acceleration !== null) {
      result.netForce = calculateNetForce(toyMass, result.acceleration);
      result.weight = calculateWeight(toyMass);
      result.dragForce = calculateDragForce(toyMass, result.netForce);
    }
    if (result.velocity !== null && contactTime > 0) {
      result.gForce = calculateGForceNoBounce(result.velocity, contactTime);
    }
  } catch {
    // STEM-111: Silent — UI shows "–" for any field that didn't compute.
  }

  return result;
}

function formatValue(value, unit) {
  if (value === null || !Number.isFinite(value)) return '–';
  return `${value.toFixed(2)} ${unit}`;
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
  // STEM-114: Attempt tab styling.
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
  // STEM-114: Comparison row (predicted vs actual with verdict).
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  comparisonLeft: {
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  comparisonValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  comparisonSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  comparisonValue: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  comparisonSpacer: {
    width: 20,
    alignItems: 'center',
  },
  comparisonArrow: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  // STEM-114: Verdict badge (correct/incorrect/pending).
  verdictBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  verdictCorrect: {
    backgroundColor: '#ECFDF5',
  },
  verdictIncorrect: {
    backgroundColor: '#FEF2F2',
  },
  verdictPending: {
    backgroundColor: '#F3F4F6',
  },
  verdictText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  verdictCorrectText: {
    color: '#059669',
  },
  verdictIncorrectText: {
    color: '#D85A30',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  advancedToggle: {
    marginTop: 16,
    paddingVertical: 8,
  },
  advancedToggleText: {
    fontSize: 13,
    color: '#534AB7',
    fontWeight: '500',
  },
  // STEM-114: Summary table styling.
  tableContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    marginVertical: 16,
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
  tableDesignCol: {
    flex: 2,
    textAlign: 'left',
  },
  tableNumCol: {
    flex: 1,
  },
  tableCheckCol: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verdictCheckmark: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
  },
  verdictCross: {
    fontSize: 16,
    color: '#D85A30',
    fontWeight: '600',
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
    marginBottom: 6,
  },
  tableFooterValue: {
    fontWeight: '600',
    color: '#1A1A1A',
  },
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
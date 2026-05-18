// STEM-111, STEM-112: Activity 1 Record tab — timer + physics + saveResult.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Timer from '../Timer';
import {
  calculateVelocity,
  calculateAcceleration,
  calculateNetForce,
  calculateWeight,
  calculateDragForce,
  calculateGForceNoBounce,
} from '../../services/parachutePhysics';
import { saveResult } from '../../services/resultSaveHelper';

// STEM-111: Inputs the student measures themselves (drop height, toy mass, contact time).
const INITIAL_INPUTS = {
  dropHeight: '',     // metres
  toyMass: '',        // kg
  contactTime: '',    // seconds (optional, HS only)
};

export default function Activity1Record({ activity }) {
  const [inputs, setInputs] = useState(INITIAL_INPUTS);
  const [fallTimeMs, setFallTimeMs] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'synced' | 'local' | 'error' | null

  const handleTimerStop = useCallback((elapsedMs) => {
    setFallTimeMs(elapsedMs);
    setSaveStatus(null); // STEM-111: New attempt invalidates last save badge.
  }, []);

  const updateInput = (key) => (value) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setSaveStatus(null);
  };

  // STEM-111: Live calcs — null if inputs incomplete, so we can show "—" in the UI.
  const calcs = calculateAll(fallTimeMs, inputs);

  const canSave = fallTimeMs !== null && calcs.velocity !== null && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setSaveStatus(null);

    try {
      // STEM-112: Payload mirrors what we want to show on the Results tab + leaderboard.
      const payload = {
        fallTimeMs,
        dropHeightM: parseFloat(inputs.dropHeight),
        toyMassKg: parseFloat(inputs.toyMass),
        contactTimeS: inputs.contactTime ? parseFloat(inputs.contactTime) : null,
        velocity: calcs.velocity,
        acceleration: calcs.acceleration,
        netForce: calcs.netForce,
        weight: calcs.weight,
        dragForce: calcs.dragForce,
        gForce: calcs.gForce,
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
    <View>
      {/* STEM-111: Drop setup inputs */}
      <Text style={styles.sectionTitle}>Setup</Text>

      <Text style={styles.label}>Drop height (m)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 1.0"
        placeholderTextColor="#9CA3AF"
        value={inputs.dropHeight}
        onChangeText={updateInput('dropHeight')}
        keyboardType="decimal-pad"
        editable={!saving}
      />

      <Text style={styles.label}>Toy mass (kg)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 0.20"
        placeholderTextColor="#9CA3AF"
        value={inputs.toyMass}
        onChangeText={updateInput('toyMass')}
        keyboardType="decimal-pad"
        editable={!saving}
      />

      {/* STEM-111: Timer drives the fall time measurement */}
      <Text style={styles.sectionTitle}>Drop & time</Text>
      <Timer onStop={handleTimerStop} />

      {/* STEM-111: Live results panel */}
      <Text style={styles.sectionTitle}>Results</Text>
      <ResultRow label="Fall time" value={fallTimeMs !== null ? `${(fallTimeMs / 1000).toFixed(3)} s` : '—'} />
      <ResultRow label="Final velocity" value={formatValue(calcs.velocity, 'm/s')} />
      <ResultRow label="Acceleration" value={formatValue(calcs.acceleration, 'm/s²')} />

      {/* STEM-111: Advanced (High School) section — collapsed by default */}
      <TouchableOpacity onPress={() => setShowAdvanced((v) => !v)} style={styles.advancedToggle}>
        <Text style={styles.advancedToggleText}>
          {showAdvanced ? '▾' : '▸'} High school physics
        </Text>
      </TouchableOpacity>

      {showAdvanced && (
        <View>
          <ResultRow label="Net force" value={formatValue(calcs.netForce, 'N')} />
          <ResultRow label="Weight" value={formatValue(calcs.weight, 'N')} />
          <ResultRow label="Drag force" value={formatValue(calcs.dragForce, 'N')} />

          <Text style={[styles.label, { marginTop: 12 }]}>
            Contact time (s) — for g-force calc
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 0.05"
            placeholderTextColor="#9CA3AF"
            value={inputs.contactTime}
            onChangeText={updateInput('contactTime')}
            keyboardType="decimal-pad"
            editable={!saving}
          />
          <ResultRow label="G-force" value={formatValue(calcs.gForce, 'g')} />
        </View>
      )}

      {/* STEM-112: Save button + status feedback */}
      <TouchableOpacity
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!canSave}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Save attempt</Text>
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
    </View>
  );
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

  // STEM-111: Wrap each calc in try/catch — bad inputs throw, we want to display "—".
  try {
    if (dropHeight > 0) {
      result.velocity = calculateVelocity(dropHeight, fallTimeS);
      result.acceleration = calculateAcceleration(result.velocity, fallTimeS);
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
    // STEM-111: Silent — UI shows "—" for any field that didn't compute.
  }

  return result;
}

function formatValue(value, unit) {
  if (value === null || !Number.isFinite(value)) return '—';
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
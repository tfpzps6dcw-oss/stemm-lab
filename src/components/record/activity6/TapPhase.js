// STEM-135: Tap reaction phase — hidden button + reaction time measurement.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';

const MIN_WAIT_MS = 1500;
const MAX_WAIT_MS = 4000;
const TRIALS = 3;

export default function TapPhase({ onComplete, onCancel }) {
  const [state, setState] = useState('ready');     // ready | waiting | go | tooEarly | done
  const [trial, setTrial] = useState(0);            // 0..TRIALS-1
  const [times, setTimes] = useState([]);           // ms values from each trial
  const [falseStarts, setFalseStarts] = useState(0);

  const timeoutRef = useRef(null);
  const goAtRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function startTrial() {
    setState('waiting');
    const wait = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);
    timeoutRef.current = setTimeout(() => {
      goAtRef.current = Date.now();
      setState('go');
    }, wait);
  }

  function handleTap() {
    if (state === 'ready') {
      startTrial();
      return;
    }
    if (state === 'waiting') {
      // Tapped before the green — false start
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setFalseStarts((f) => f + 1);
      setState('tooEarly');
      return;
    }
    if (state === 'go') {
      const reaction = Date.now() - goAtRef.current;
      const newTimes = [...times, reaction];
      setTimes(newTimes);

      if (newTimes.length >= TRIALS) {
        setState('done');
        const avg = Math.round(newTimes.reduce((a, b) => a + b, 0) / newTimes.length);
        // Slight delay so user sees the value before transitioning
        setTimeout(() => {
          onComplete({ reactionMs: avg, falseStarts });
        }, 600);
      } else {
        setTrial((t) => t + 1);
        setState('ready');
      }
      return;
    }
    if (state === 'tooEarly') {
      // Retry same trial
      setState('ready');
    }
  }

  const isGreen = state === 'go';
  const bgColor =
    state === 'go' ? '#1D9E75' :
    state === 'tooEarly' ? '#D85A30' :
    state === 'waiting' ? '#374151' :
    state === 'done' ? '#534AB7' :
    '#6B7280';

  const message =
    state === 'ready' ? `Tap to start trial ${trial + 1} of ${TRIALS}` :
    state === 'waiting' ? 'Wait for green…' :
    state === 'go' ? 'TAP NOW' :
    state === 'tooEarly' ? 'Too early! Tap to retry' :
    'Done — calculating…';

  return (
    <View>
      <Text style={styles.sectionTitle}>Phase 1 of 2 — Tap reaction</Text>

      <Pressable style={[styles.target, { backgroundColor: bgColor }]} onPress={handleTap}>
        <Text style={styles.targetText}>{message}</Text>
      </Pressable>

      {times.length > 0 && (
        <View style={styles.timesRow}>
          {times.map((t, i) => (
            <View key={i} style={styles.timeChip}>
              <Text style={styles.timeChipText}>{t} ms</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.helperText}>
        3 trials. Tap as soon as the screen turns green. Tap early = false start.
      </Text>

      <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
        <Text style={styles.secondaryButtonText}>Cancel</Text>
      </TouchableOpacity>
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
  target: {
    height: 220,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  targetText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  timesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 6,
  },
  timeChip: {
    backgroundColor: '#F0EEF9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    margin: 3,
  },
  timeChipText: { color: '#534AB7', fontSize: 12, fontWeight: '500' },
  helperText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginVertical: 8,
    textAlign: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: { color: '#374151', fontSize: 13 },
});
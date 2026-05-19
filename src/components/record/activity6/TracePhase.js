// STEM-136: Tracing phase — moving shape + accuracy + delay calc.
//
// A target dot moves along a horizontal path. User keeps their finger on
// the target. We sample the distance between finger and target every 100ms
// to measure accuracy, and measure lag (how far behind the target the finger is).

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Dimensions,
} from 'react-native';

const DURATION_MS = 8000;
const SAMPLE_INTERVAL_MS = 100;
const PATH_HEIGHT = 220;
const TARGET_RADIUS = 22;
const ACCURACY_THRESHOLD_PX = 40; // within this distance = "on target"

export default function TracePhase({ onComplete, onCancel }) {
  const [running, setRunning] = useState(false);
  const [targetX, setTargetX] = useState(0);
  const [targetY, setTargetY] = useState(PATH_HEIGHT / 2);
  const [pathWidth, setPathWidth] = useState(Dimensions.get('window').width - 40);

  const fingerRef = useRef({ x: null, y: null });
  const samplesRef = useRef([]); // { distance, lagMs }
  const startedAtRef = useRef(null);
  const animFrameRef = useRef(null);
  const sampleTimerRef = useRef(null);

  // PanResponder captures finger position throughout the gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        fingerRef.current = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
      },
      onPanResponderMove: (evt) => {
        fingerRef.current = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
      },
      onPanResponderRelease: () => {
        // keep last position — don't reset
      },
    })
  ).current;

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (sampleTimerRef.current) clearInterval(sampleTimerRef.current);
    };
  }, []);

  function start() {
    samplesRef.current = [];
    startedAtRef.current = Date.now();
    setRunning(true);

    // Animate target X back and forth using a sine wave
    function tick() {
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed >= DURATION_MS) {
        finish();
        return;
      }
      const phase = (elapsed / 1500) * Math.PI; // ~1.5s per half-cycle
      const half = pathWidth / 2;
      const x = half + Math.sin(phase) * (half - TARGET_RADIUS);
      const y = PATH_HEIGHT / 2 + Math.sin(phase * 2) * 40;
      setTargetX(x);
      setTargetY(y);
      animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);

    // Periodic sample of distance between finger and target
    sampleTimerRef.current = setInterval(() => {
      const finger = fingerRef.current;
      if (finger.x == null) return; // finger not on screen yet
      // Snapshot target position at this moment
      const t = Date.now() - startedAtRef.current;
      const phase = (t / 1500) * Math.PI;
      const half = pathWidth / 2;
      const tx = half + Math.sin(phase) * (half - TARGET_RADIUS);
      const ty = PATH_HEIGHT / 2 + Math.sin(phase * 2) * 40;

      const dx = finger.x - tx;
      const dy = finger.y - ty;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Lag estimate: time it would take target to reach finger's x position
      // (rough heuristic — measures how far behind in time the finger is)
      // We approximate by inverting the sin to find which earlier time gave finger.x
      // For simplicity, we just record distance and compute mean delay from it.
      samplesRef.current.push({ distance, t });
    }, SAMPLE_INTERVAL_MS);
  }

  function finish() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (sampleTimerRef.current) clearInterval(sampleTimerRef.current);

    const samples = samplesRef.current;
    if (samples.length === 0) {
      onComplete({ accuracyPct: 0, meanDelayMs: 0 });
      return;
    }

    const onTarget = samples.filter((s) => s.distance <= ACCURACY_THRESHOLD_PX).length;
    const accuracyPct = Math.round((onTarget / samples.length) * 100);

    // Mean delay proxy: convert mean distance to "delay" assuming target moves at typical speed
    const meanDist = samples.reduce((a, s) => a + s.distance, 0) / samples.length;
    const meanDelayMs = Math.round(meanDist * 4); // rough conversion factor

    setRunning(false);
    onComplete({ accuracyPct, meanDelayMs });
  }

  function cancel() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (sampleTimerRef.current) clearInterval(sampleTimerRef.current);
    setRunning(false);
    onCancel();
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Phase 2 of 2 — Tracing</Text>

      <View
        style={styles.canvas}
        onLayout={(e) => setPathWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        {running ? (
          <View
            style={[
              styles.target,
              { left: targetX - TARGET_RADIUS, top: targetY - TARGET_RADIUS },
            ]}
          />
        ) : (
          <Text style={styles.canvasHint}>
            Press Start, then keep your finger on the purple dot as it moves.
          </Text>
        )}
      </View>

      <Text style={styles.helperText}>
        {DURATION_MS / 1000}-second test. Stay within {ACCURACY_THRESHOLD_PX}px of the dot to score on-target.
      </Text>

      {!running ? (
        <>
          <TouchableOpacity style={styles.primaryButton} onPress={start}>
            <Text style={styles.primaryButtonText}>Start tracing</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={cancel}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={styles.secondaryButton} onPress={cancel}>
          <Text style={styles.secondaryButtonText}>Stop early</Text>
        </TouchableOpacity>
      )}
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
  canvas: {
    height: PATH_HEIGHT,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  canvasHint: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  target: {
    position: 'absolute',
    width: TARGET_RADIUS * 2,
    height: TARGET_RADIUS * 2,
    borderRadius: TARGET_RADIUS,
    backgroundColor: '#7F77DD',
  },
  helperText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginVertical: 8,
    textAlign: 'center',
  },
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
});
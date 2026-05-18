// STEM-109: Timer UI for activity screens — start/stop/reset with live readout.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTimer } from '../hooks/useTimer';

// STEM-109: Caller gets elapsedMs via onTick + onStop callbacks (no ref hacking).
export default function Timer({ onStop, onTick }) {
  const { elapsedMs, isRunning, start, stop, reset } = useTimer();

  // STEM-109: Forward elapsed time so activity screens can run live calcs.
  React.useEffect(() => {
    onTick?.(elapsedMs);
  }, [elapsedMs, onTick]);

  function handleStop() {
    stop();
    onStop?.(elapsedMs);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.display}>{formatSeconds(elapsedMs)}</Text>

      <View style={styles.buttonRow}>
        {!isRunning ? (
          <TouchableOpacity style={[styles.button, styles.startButton]} onPress={start}>
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={handleStop}>
            <Text style={styles.buttonText}>Stop</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.resetButton, isRunning && styles.buttonDisabled]}
          onPress={reset}
          disabled={isRunning}
        >
          <Text style={[styles.buttonText, styles.resetButtonText]}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// STEM-109: 1234 → "1.234 s"
export function formatSeconds(ms) {
  const seconds = ms / 1000;
  return `${seconds.toFixed(3)} s`;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  display: {
    fontSize: 48,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    color: '#1A1A1A',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#7F77DD',
  },
  stopButton: {
    backgroundColor: '#D85A30',
  },
  resetButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  resetButtonText: {
    color: '#374151',
  },
});

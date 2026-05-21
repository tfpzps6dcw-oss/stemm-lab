// STEM-145: Reusable video recorder component — camera preview + record/stop controls.
//   Drop into any activity's Record tab to capture video evidence.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useVideoRecorder } from '../services/videoService';

// STEM-145: Formats elapsed seconds into MM:SS for the recording timer overlay.
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function VideoRecorder({ activityPrefix, onVideoSaved, style }) {
  const {
    hasPermission,
    requestPermission,
    cameraRef,
    startRecording,
    stopRecording,
    isRecording,
  } = useVideoRecorder();

  const [elapsed, setElapsed] = useState(0);
  const [isStopping, setIsStopping] = useState(false);

  // STEM-145: Tick the elapsed counter every second while recording.
  useEffect(() => {
    if (!isRecording) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // STEM-145: Handle stop — save video, notify parent via callback.
  const handleStop = useCallback(async () => {
    setIsStopping(true);
    try {
      const uri = await stopRecording(activityPrefix);
      if (uri && onVideoSaved) {
        onVideoSaved(uri);
      }
    } finally {
      setIsStopping(false);
    }
  }, [stopRecording, activityPrefix, onVideoSaved]);

  // STEM-145: Permission not yet requested — show a prompt button.
  if (hasPermission === null) {
    return (
      <View style={[styles.container, styles.center, style]}>
        <Text style={styles.permText}>Camera & microphone access needed to record video</Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // STEM-145: Permission denied — tell the user to fix it in settings.
  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.center, style]}>
        <Text style={styles.permText}>
          Camera or microphone permission was denied. Please enable it in your device settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* STEM-145: Camera preview — mode="video" enables recording capability. */}
      <View style={styles.previewWrapper}>
        <CameraView
          ref={cameraRef}
          style={styles.preview}
          facing="back"
          mode="video"
        />

        {/* STEM-145: Recording timer overlay — only visible while recording. */}
        {isRecording && (
          <View style={styles.timerOverlay}>
            <View style={styles.redDot} />
            <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
          </View>
        )}
      </View>

      {/* STEM-145: Record / Stop button */}
      <View style={styles.controls}>
        {isStopping ? (
          <ActivityIndicator size="large" color="#EF4444" />
        ) : isRecording ? (
          <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
            <View style={styles.stopSquare} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
            <View style={styles.recordDot} />
          </TouchableOpacity>
        )}

        <Text style={styles.hint}>
          {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 200,
  },
  // STEM-145: 4:3 aspect ratio keeps video preview consistent across devices.
  previewWrapper: {
    width: '100%',
    aspectRatio: 4 / 3,
    position: 'relative',
  },
  preview: {
    flex: 1,
  },
  timerOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  timerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  controls: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#111',
  },
  // STEM-145: Classic circular record button with red centre dot.
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
  },
  // STEM-145: Stop button — white ring with red square inside.
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopSquare: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  hint: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
  },
  permText: {
    color: '#D1D5DB',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  permButton: {
    backgroundColor: '#534AB7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
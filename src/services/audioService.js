// STEM-118: Microphone permission + amplitude sampling via expo-audio for Activity 2 (Sound Pollution Hunter).
// STEM-118: Refactored to a hook — expo-audio only exposes recording through useAudioRecorder, not a class constructor.

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
  setAudioModeAsync,
} from 'expo-audio';

// STEM-118: 8x/second sampling — smooth live display without hammering the battery.
const SAMPLE_INTERVAL_MS = 125;

// STEM-118: Ask the OS for mic access. Returns true if granted, false otherwise.
export async function requestMicrophonePermission() {
  try {
    const result = await AudioModule.requestRecordingPermissionsAsync();
    return result.granted;
  } catch (err) {
    console.warn('requestMicrophonePermission failed:', err?.message ?? err);
    return false;
  }
}

// STEM-118: Check existing permission without prompting — drives the "permission needed" UI gate.
export async function getMicrophonePermissionStatus() {
  try {
    const result = await AudioModule.getRecordingPermissionsAsync();
    return result.granted;
  } catch (err) {
    console.warn('getMicrophonePermissionStatus failed:', err?.message ?? err);
    return false;
  }
}

// STEM-118: Hook that wraps useAudioRecorder + manual polling of metering values.
//   Components call start()/stop() and get a steady stream of dBFS readings via onSample.
//   onSample is held in a ref so a fresh closure doesn't tear down the polling loop.
export function useSoundLevelSampler(onSample) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isSampling, setIsSampling] = useState(false);
  const pollIntervalRef = useRef(null);
  const onSampleRef = useRef(onSample);

  // STEM-118: Keep the callback ref current so polling always calls the latest handler.
  useEffect(() => {
    onSampleRef.current = onSample;
  }, [onSample]);

  // STEM-118: Clean up the recorder if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const start = useCallback(async () => {
    if (isSampling) return;

    // STEM-118: setAudioMode is required on iOS — without allowsRecording, the recorder silently fails.
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    });

    // STEM-118: isMeteringEnabled MUST be passed to prepareToRecordAsync (not the hook), per expo-audio quirk.
    await recorder.prepareToRecordAsync({
      ...RecordingPresets.HIGH_QUALITY,
      isMeteringEnabled: true,
    });
    recorder.record();
    setIsSampling(true);

    // STEM-118: Poll recorder status — expo-audio doesn't push metering updates, we have to pull.
    pollIntervalRef.current = setInterval(() => {
      try {
        const status = recorder.getStatus();
        if (status?.isRecording && typeof status.metering === 'number') {
          onSampleRef.current?.({
            metering: status.metering,
            durationMs: status.durationMillis ?? 0,
          });
        }
      } catch (err) {
        console.warn('useSoundLevelSampler poll error:', err?.message ?? err);
      }
    }, SAMPLE_INTERVAL_MS);
  }, [isSampling, recorder]);

  const stop = useCallback(async () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    try {
      await recorder.stop();
    } catch (err) {
      // STEM-118: Ignore stop errors — we're tearing down anyway.
      console.warn('useSoundLevelSampler: recorder stop failed (non-fatal)', err?.message ?? err);
    }
    setIsSampling(false);
  }, [recorder]);

  return { start, stop, isSampling };
}

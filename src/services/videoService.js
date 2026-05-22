// STEM-145: Video recording + persistent storage for slow-mo review across all activities.
// STEM-145-fix: Fixed permission flow — track whether user has been prompted.
// STEM-145-fix: Fixed recording flow — recordAsync returns the video URI on resolve,
//   stopRecording just triggers the stop. Used a ref to bridge the two.

import { useRef, useState, useCallback } from 'react';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';

// STEM-145: Videos live under documents/videos/ — persists across app restarts.
const VIDEO_DIR = `${FileSystem.documentDirectory}videos/`;

// STEM-145: Ensure the videos directory exists before any save attempt.
async function ensureVideoDir() {
  const info = await FileSystem.getInfoAsync(VIDEO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(VIDEO_DIR, { intermediates: true });
  }
}

// STEM-145: Hook for video recording — manages permissions, start/stop, and file persistence.
export function useVideoRecorder() {
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const cameraRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  // STEM-145-fix: recordAsync resolves with { uri } when recording stops.
  //   We store that promise so stopRecording can await it and get the URI.
  const recordPromiseRef = useRef(null);

  const hasPermission =
    camPermission?.granted && micPermission?.granted
      ? true
      : hasRequested
        ? false
        : null;

  const requestPermission = useCallback(async () => {
    const cam = await requestCamPermission();
    const mic = await requestMicPermission();
    setHasRequested(true);
    return cam.granted && mic.granted;
  }, [requestCamPermission, requestMicPermission]);

  // STEM-145-fix: Start recording — stores the recordAsync promise in a ref.
  //   recordAsync resolves when recording ends (triggered by stopRecording).
  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording) return;

    setIsRecording(true);
    try {
      // STEM-145-fix: Don't await here — recordAsync resolves when stop is called.
      //   Store the promise so stopRecording can await it for the video URI.
      recordPromiseRef.current = cameraRef.current.recordAsync({ maxDuration: 60 });
    } catch (err) {
      console.warn('startRecording error:', err?.message ?? err);
      recordPromiseRef.current = null;
      setIsRecording(false);
    }
  }, [isRecording]);

  // STEM-145-fix: Stop recording — triggers stop, then awaits the recordAsync promise
  //   to get the video URI. Moves video from cache to persistent storage.
  const stopRecording = useCallback(async (activityPrefix = 'vid') => {
    if (!cameraRef.current || !isRecording) return null;

    try {
      // STEM-145-fix: stopRecording triggers the end — recordAsync promise then resolves.
      cameraRef.current.stopRecording();

      // STEM-145-fix: Await the promise from recordAsync to get { uri }.
      const video = recordPromiseRef.current ? await recordPromiseRef.current : null;
      recordPromiseRef.current = null;

      if (!video?.uri) return null;

      await ensureVideoDir();

      const filename = `${activityPrefix}_${Date.now()}.mp4`;
      const finalUri = `${VIDEO_DIR}${filename}`;
      await FileSystem.moveAsync({ from: video.uri, to: finalUri });

      return finalUri;
    } catch (err) {
      console.warn('stopRecording error:', err?.message ?? err);
      return null;
    } finally {
      recordPromiseRef.current = null;
      setIsRecording(false);
    }
  }, [isRecording]);

  return {
    hasPermission,
    requestPermission,
    cameraRef,
    startRecording,
    stopRecording,
    isRecording,
  };
}

// STEM-145: Delete a saved video — safe to call with null/missing URI.
export async function deleteVideo(uri) {
  if (!uri) return;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (err) {
    console.warn('deleteVideo failed (non-fatal):', err?.message ?? err);
  }
}

// STEM-145: Re-export CameraView for the VideoRecorder component to mount the preview.
export { CameraView };
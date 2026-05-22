// STEM-145: Video recording + persistent storage for slow-mo review across all activities.
// STEM-145-fix: Fixed permission flow — track whether user has been prompted, so "never asked"
//   doesn't show the "denied" message. Now always shows "Grant Access" until explicitly denied.

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
//   Returns { hasPermission, requestPermission, cameraRef, startRecording, stopRecording, isRecording }.
export function useVideoRecorder() {
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const cameraRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  // STEM-145-fix: Track whether we've actually prompted the user yet.
  //   expo-camera returns { granted: false } for both "never asked" and "denied",
  //   so without this flag we can't tell the difference.
  const [hasRequested, setHasRequested] = useState(false);

  // STEM-145-fix: Permission state logic:
  //   - Both granted → true (show camera preview)
  //   - We've asked and at least one denied → false (show "denied" message)
  //   - Haven't asked yet → null (show "Grant Access" button)
  const hasPermission =
    camPermission?.granted && micPermission?.granted
      ? true
      : hasRequested
        ? false
        : null;

  // STEM-145-fix: Request both permissions and mark that we've asked.
  const requestPermission = useCallback(async () => {
    const cam = await requestCamPermission();
    const mic = await requestMicPermission();
    setHasRequested(true);
    return cam.granted && mic.granted;
  }, [requestCamPermission, requestMicPermission]);

  // STEM-145: Start recording — returns nothing, call stopRecording to get the URI.
  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording) return;

    setIsRecording(true);
    try {
      // STEM-145: maxDuration caps at 60s to keep file sizes manageable for students.
      await cameraRef.current.recordAsync({ maxDuration: 60 });
    } catch (err) {
      console.warn('startRecording error:', err?.message ?? err);
      setIsRecording(false);
    }
  }, [isRecording]);

  // STEM-145: Stop recording — moves video from cache to persistent storage, returns saved URI.
  const stopRecording = useCallback(async (activityPrefix = 'vid') => {
    if (!cameraRef.current || !isRecording) return null;

    try {
      const video = await cameraRef.current.stopRecording();
      if (!video?.uri) return null;

      await ensureVideoDir();

      // STEM-145: Prefix with activity name so videos are easy to identify in storage.
      const filename = `${activityPrefix}_${Date.now()}.mp4`;
      const finalUri = `${VIDEO_DIR}${filename}`;
      await FileSystem.moveAsync({ from: video.uri, to: finalUri });

      return finalUri;
    } catch (err) {
      console.warn('stopRecording error:', err?.message ?? err);
      return null;
    } finally {
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
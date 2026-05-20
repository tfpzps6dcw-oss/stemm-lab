// STEM-123: Camera permission + basic photo capture via expo-camera for Activity 3 (Hand Fan Challenge).

import { useRef, useState, useCallback } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';

// STEM-123: Photos live under documents/photos/ so they survive app restarts.
//   FileSystem.documentDirectory is per-app and persists across launches.
const PHOTO_DIR = `${FileSystem.documentDirectory}photos/`;

// STEM-123: Make sure the photos directory exists before any save attempt.
async function ensurePhotoDir() {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

// STEM-123: Hook wrapping useCameraPermissions + a ref for triggering capture from a parent component.
//   Returns { hasPermission, requestPermission, cameraRef, capture, isCapturing }.
export function useCameraCapture() {
  const [permission, requestExpoPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // STEM-123: Treat null permission as "not yet asked" — UI gates on this.
  const hasPermission = permission?.granted ?? null;

  const requestPermission = useCallback(async () => {
    const result = await requestExpoPermission();
    return result.granted;
  }, [requestExpoPermission]);

  // STEM-123: Capture a photo and move it from cache → persistent storage. Returns the saved URI.
  const capture = useCallback(async () => {
    if (!cameraRef.current) {
      throw new Error('capture: camera not ready');
    }
    if (isCapturing) {
      throw new Error('capture: already capturing');
    }

    setIsCapturing(true);
    try {
      await ensurePhotoDir();

      // STEM-123: Lower quality keeps photo size small enough for SQLite payload references + Firestore.
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: true,
      });

      // STEM-123: Move from cache to persistent docs dir so it survives app restarts.
      const filename = `fan_${Date.now()}.jpg`;
      const finalUri = `${PHOTO_DIR}${filename}`;
      await FileSystem.moveAsync({ from: photo.uri, to: finalUri });

      return finalUri;
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  return {
    hasPermission,
    requestPermission,
    cameraRef,
    capture,
    isCapturing,
  };
}

// STEM-123: Delete a saved photo when an attempt is reset or a new photo is taken.
//   Safe to call with a missing URI — silently no-ops.
export async function deletePhoto(uri) {
  if (!uri) return;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (err) {
    // STEM-123: Non-fatal — orphaned photos take up trivial space, not worth crashing over.
    console.warn('deletePhoto failed (non-fatal):', err?.message ?? err);
  }
}

// STEM-123: Re-export CameraView so the Record screen can mount the preview view.
//   expo-camera renamed Camera → CameraView; this is the React component that renders the preview.
export { CameraView };

// STEM-146: GPS permission + current location helper.
import * as Location from 'expo-location';

// STEM-146: Ask for foreground location permission.
// Returns true if granted, false if denied.
export async function requestLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

// STEM-146: Get the device's current GPS coordinates.
// Returns { latitude, longitude } or null if unavailable.
export async function getCurrentCoords() {
  const granted = await requestLocationPermission();
  if (!granted) return null;

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}
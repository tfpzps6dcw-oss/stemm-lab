// STEM-146: Map screen — shows Firestore result pins on a live map.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { fetchResultsWithCoords } from '../services/firestoreResults';

// STEM-146: Activity labels for pin callouts.
const ACTIVITY_LABELS = {
  1: 'Parachute Drop',
  2: 'Sound Pollution',
  3: 'Hand Fan',
  4: 'Earthquake Structure',
  5: 'Stretch & Grace',
  6: 'Reaction Board',
  7: 'Breathing Pace',
};

export default function MapScreen() {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // STEM-146: Load all results with coords when screen mounts.
  useEffect(() => {
    async function loadPins() {
      try {
        const results = await fetchResultsWithCoords();
        // STEM-146: Filter out any results missing valid coords just in case.
        const valid = results.filter(
          (r) =>
            r.payload?.coords?.latitude != null &&
            r.payload?.coords?.longitude != null
        );
        setPins(valid);
      } catch (err) {
        console.warn('MapScreen: failed to load pins', err);
        setError('Could not load map data. Check your connection.');
      } finally {
        setLoading(false);
      }
    }
    loadPins();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7F77DD" />
        <Text style={styles.loadingText}>Loading map pins...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        // STEM-146: Default to Australia on first load.
        latitude: -25.2744,
        longitude: 133.7751,
        latitudeDelta: 30,
        longitudeDelta: 30,
      }}
    >
      {/* STEM-146: Drop a pin for each result that has GPS coords. */}
      {pins.map((pin) => (
        <Marker
          key={pin.firestoreId}
          coordinate={{
            latitude: pin.payload.coords.latitude,
            longitude: pin.payload.coords.longitude,
          }}
          title={ACTIVITY_LABELS[pin.activityId] ?? `Activity ${pin.activityId}`}
          description={`Team: ${pin.teamName ?? 'Unknown'}`}
          pinColor="#7F77DD"
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    color: '#888',
    fontSize: 14,
  },
  errorText: {
    color: '#CC3333',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
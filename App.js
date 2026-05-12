import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { loadTeam, clearTeam } from './src/services/teamStorage';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);

  // On app launch, check if a team has already been saved
  useEffect(() => {
    async function checkForSavedTeam() {
      const savedTeam = await loadTeam();
      setTeam(savedTeam);
      setLoading(false);
    }
    checkForSavedTeam();
  }, []);

  const handleResetTeam = async () => {
    Alert.alert(
      'Reset team',
      'This will clear your saved team. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearTeam();
            setTeam(null);
          },
        },
      ]
    );
  };

  // Loading state while we check storage
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7F77DD" />
      </View>
    );
  }

  // No team saved → show onboarding
  if (!team) {
    return (
      <>
        <StatusBar style="dark" />
        <OnboardingScreen onComplete={setTeam} />
      </>
    );
  }

  // Team is set → placeholder home screen
  return (
    <View style={styles.home}>
      <StatusBar style="dark" />
      <Text style={styles.welcome}>Welcome, {team.teamName}!</Text>
      <Text style={styles.info}>Discriminator: {team.discriminator}</Text>
      <Text style={styles.info}>Members: {team.members.join(', ')}</Text>
      <Text style={styles.info}>Grade: {team.grade}</Text>
      <Text style={styles.placeholder}>
        Home screen with activity list coming in STEM-16
      </Text>
      <TouchableOpacity style={styles.resetButton} onPress={handleResetTeam}>
        <Text style={styles.resetText}>Reset team (for testing)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  home: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    paddingTop: 80,
  },
  welcome: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  info: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  placeholder: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 24,
    fontStyle: 'italic',
  },
  resetButton: {
    marginTop: 40,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  resetText: {
    color: '#6B7280',
    fontSize: 13,
  },
});
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { generateDiscriminator } from '../utils/discriminator';
import { saveTeam } from '../services/teamStorage';

const GRADES = ['Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9'];

export default function OnboardingScreen({ onComplete }) {
  const [teamName, setTeamName] = useState('');
  const [member1, setMember1] = useState('');
  const [member2, setMember2] = useState('');
  const [grade, setGrade] = useState('');
  const [discriminator] = useState(generateDiscriminator());
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!teamName.trim()) {
      Alert.alert('Missing info', 'Please enter a team name.');
      return;
    }
    if (!member1.trim()) {
      Alert.alert('Missing info', 'Please enter at least one team member name.');
      return;
    }
    if (!grade) {
      Alert.alert('Missing info', 'Please select your year level.');
      return;
    }

    // Build the team object
    const members = [member1.trim(), member2.trim()].filter(Boolean);
    const team = {
      teamName: teamName.trim(),
      members,
      grade,
      discriminator,
      createdAt: new Date().toISOString(),
    };

    // Save and notify the parent
    setSaving(true);
    try {
      await saveTeam(team);
      onComplete(team);
    } catch (error) {
      Alert.alert('Save failed', 'Could not save team. Please try again.');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Welcome to STEMM Lab</Text>
        <Text style={styles.subtitle}>Set up your team to get started</Text>

        {/* Team name */}
        <Text style={styles.label}>Team name</Text>
        <TextInput
          style={styles.input}
          value={teamName}
          onChangeText={setTeamName}
          placeholder="e.g. Team Rocket"
          placeholderTextColor="#9CA3AF"
          maxLength={40}
        />

        {/* Team members */}
        <Text style={styles.label}>Team members</Text>
        <TextInput
          style={styles.input}
          value={member1}
          onChangeText={setMember1}
          placeholder="First name"
          placeholderTextColor="#9CA3AF"
          maxLength={20}
        />
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          value={member2}
          onChangeText={setMember2}
          placeholder="First name (optional)"
          placeholderTextColor="#9CA3AF"
          maxLength={20}
        />

        {/* Grade picker */}
        <Text style={styles.label}>Year level</Text>
        <View style={styles.gradeRow}>
          {GRADES.map((g) => (
            <TouchableOpacity
              key={g}
              style={[
                styles.gradeChip,
                grade === g && styles.gradeChipActive,
              ]}
              onPress={() => setGrade(g)}
            >
              <Text
                style={[
                  styles.gradeChipText,
                  grade === g && styles.gradeChipTextActive,
                ]}
              >
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Discriminator display */}
        <View style={styles.discBox}>
          <Text style={styles.discLabel}>Your team discriminator</Text>
          <Text style={styles.discCode}>{discriminator}</Text>
          <Text style={styles.discNote}>
            Auto-assigned · share with your teacher
          </Text>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving...' : 'Start activities'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 20, paddingTop: 40 },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 28,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1A1A1A',
    backgroundColor: '#F9FAFB',
  },
  gradeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gradeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  gradeChipActive: {
    backgroundColor: '#EEEDFE',
    borderColor: '#7F77DD',
  },
  gradeChipText: { fontSize: 14, color: '#374151' },
  gradeChipTextActive: { color: '#3C3489', fontWeight: '500' },
  discBox: {
    backgroundColor: '#EEEDFE',
    borderRadius: 10,
    padding: 14,
    marginTop: 24,
  },
  discLabel: {
    fontSize: 12,
    color: '#534AB7',
    marginBottom: 4,
  },
  discCode: {
    fontSize: 22,
    fontWeight: '600',
    color: '#3C3489',
    letterSpacing: 2,
  },
  discNote: {
    fontSize: 11,
    color: '#7F77DD',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#7F77DD',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
});
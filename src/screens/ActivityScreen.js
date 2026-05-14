import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { getActivityById, CATEGORY_COLORS } from '../constants/activities';
import ActivityTabs, { ACTIVITY_TABS } from '../components/ActivityTabs';
import ResultsTable from '../components/ResultsTable';

export default function ActivityScreen({ route, navigation }) {
  const { activityId } = route.params;
  const activity = getActivityById(activityId);
  const [activeTab, setActiveTab] = useState('info');

  if (!activity) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Activity not found.</Text>
      </View>
    );
  }

  const colors = CATEGORY_COLORS[activity.category];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {activity.id}. {activity.title}
        </Text>
        <View style={[styles.badge, { backgroundColor: colors.badgeBg }]}>
          <Text style={[styles.badgeText, { color: colors.badgeText }]}>
            {activity.subject}
          </Text>
        </View>
      </View>
      <Text style={styles.description}>{activity.description}</Text>

      {/* Tab bar */}
      <ActivityTabs
        tabs={ACTIVITY_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab content */}
      {activeTab === 'info' && <InstructionsTab activity={activity} />}
      {activeTab === 'record' && <RecordTab activity={activity} />}
      {activeTab === 'results' && <ResultsTab activity={activity} />}
      {activeTab === 'reflect' && <ReflectTab activity={activity} />}

      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back to activities</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/**
 * Instructions tab — shows the activity overview, equipment list, and steps.
 */
function InstructionsTab({ activity }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Overview</Text>
      <Text style={styles.paragraph}>{activity.overview}</Text>

      <Text style={styles.sectionTitle}>Equipment</Text>
      {activity.equipment.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Steps</Text>
      {activity.steps.map((step, i) => (
        <View key={i} style={styles.stepRow}>
          <Text style={styles.stepNumber}>{i + 1}.</Text>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Record tab — placeholder for Sprint 2 sensor work.
 */
function RecordTab({ activity }) {
  return (
    <View style={styles.placeholderBox}>
      <Text style={styles.placeholderLabel}>Sensor: {activity.sensor}</Text>
      <Text style={styles.placeholderTitle}>Coming in Sprint 2</Text>
      <Text style={styles.placeholderBody}>
        This tab will provide live recording for the {activity.title}.
      </Text>
    </View>
  );
}

/**
 * Results tab — shows the results table (empty for now, populated in Sprint 2).
 */
function ResultsTab({ activity }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Your attempts</Text>
      <ResultsTable columns={activity.resultsColumns} rows={[]} />
      <Text style={styles.helperText}>
        Submit your first recording in the Record tab to see results here.
      </Text>
    </View>
  );
}

/**
 * Reflect tab — placeholder for Sprint 2 reflection notes.
 */
function ReflectTab({ activity }) {
  return (
    <View style={styles.placeholderBox}>
      <Text style={styles.placeholderTitle}>Reflection notes</Text>
      <Text style={styles.placeholderBody}>
        After completing this activity, students can record their predictions,
        observations, and reflections here. Coming in Sprint 2.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingTop: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { fontSize: 14, color: '#6B7280' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    paddingRight: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  paragraph: {
    fontSize: 13,
    color: '#1A1A1A',
    lineHeight: 20,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 4,
  },
  bullet: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 8,
    width: 12,
  },
  bulletText: {
    fontSize: 13,
    color: '#1A1A1A',
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: '#534AB7',
    width: 22,
  },
  stepText: {
    fontSize: 13,
    color: '#1A1A1A',
    flex: 1,
    lineHeight: 20,
  },
  helperText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  placeholderBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  placeholderLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  placeholderBody: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 32,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: '#374151',
  },
});
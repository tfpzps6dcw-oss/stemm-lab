// STEM-111: ResultsTab now dispatches via ResultsRouter (was hardcoded empty rows).
// STEM-125: Tabs stay mounted (hidden via display:none) so in-progress Record data
//   — typed inputs, captured photos, summary state — survives tab switches.
// STEM-147: Added BatteryIndicator in header and AdBanner at bottom of screen.

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
import RecordRouter from '../components/record/RecordRouter';
import ResultsRouter from '../components/results/ResultsRouter';
// STEM-147: Battery monitoring and AdMob banner.
import BatteryIndicator from '../components/BatteryIndicator';
import AdBanner from '../components/AdBanner';

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
    <View style={styles.screenWrapper}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* STEM-147: Battery indicator + activity header on the same row. */}
        <View style={styles.topRow}>
          <BatteryIndicator />
        </View>

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

        <ActivityTabs
          tabs={ACTIVITY_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* STEM-125: All four tabs render at once; we toggle visibility with display.
            Keeps each tab's local state (form inputs, photos, timers) intact across switches. */}
        <View style={activeTab === 'info' ? styles.tabVisible : styles.tabHidden}>
          <InstructionsTab activity={activity} />
        </View>
        <View style={activeTab === 'record' ? styles.tabVisible : styles.tabHidden}>
          <RecordRouter activity={activity} />
        </View>
        <View style={activeTab === 'results' ? styles.tabVisible : styles.tabHidden}>
          <ResultsRouter activity={activity} isVisible={activeTab === 'results'} />
        </View>
        <View style={activeTab === 'reflect' ? styles.tabVisible : styles.tabHidden}>
          <ReflectTab activity={activity} />
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back to activities</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* STEM-147: AdMob banner fixed at the bottom of the screen. */}
      <AdBanner />
    </View>
  );
}

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
  // STEM-147: Wrapper so AdBanner sits at the bottom outside the ScrollView.
  screenWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingTop: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { fontSize: 14, color: '#6B7280' },
  // STEM-147: Top row for battery indicator.
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', flex: 1, paddingRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '500' },
  description: { fontSize: 12, color: '#6B7280', marginBottom: 16 },
  // STEM-125: Show/hide wrappers — display:none keeps the React subtree mounted but invisible.
  tabVisible: {
    // Default flex layout when active.
  },
  tabHidden: {
    display: 'none',
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
  paragraph: { fontSize: 13, color: '#1A1A1A', lineHeight: 20, marginBottom: 8 },
  bulletRow: { flexDirection: 'row', marginBottom: 4, paddingLeft: 4 },
  bullet: { fontSize: 13, color: '#6B7280', marginRight: 8, width: 12 },
  bulletText: { fontSize: 13, color: '#1A1A1A', flex: 1 },
  stepRow: { flexDirection: 'row', marginBottom: 8 },
  stepNumber: { fontSize: 13, fontWeight: '500', color: '#534AB7', width: 22 },
  stepText: { fontSize: 13, color: '#1A1A1A', flex: 1, lineHeight: 20 },
  placeholderBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  placeholderTitle: { fontSize: 16, fontWeight: '500', color: '#1A1A1A', marginBottom: 8 },
  placeholderBody: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  backButton: {
    marginTop: 32,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  backButtonText: { fontSize: 14, color: '#374151' },
});
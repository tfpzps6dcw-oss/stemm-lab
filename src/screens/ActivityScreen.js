import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { getActivityById, CATEGORY_COLORS } from '../constants/activities';

export default function ActivityScreen({ route, navigation }) {
  const { activityId } = route.params;
  const activity = getActivityById(activityId);

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
      <View style={styles.headerRow}>
        <Text style={styles.title}>{activity.title}</Text>
        <View style={[styles.badge, { backgroundColor: colors.badgeBg }]}>
          <Text style={[styles.badgeText, { color: colors.badgeText }]}>
            {activity.subject}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{activity.description}</Text>

      {/* Tab placeholder */}
      <View style={styles.tabRow}>
        <View style={[styles.tab, styles.tabActive]}>
          <Text style={styles.tabTextActive}>Instructions</Text>
        </View>
        <View style={styles.tab}>
          <Text style={styles.tabText}>Record</Text>
        </View>
        <View style={styles.tab}>
          <Text style={styles.tabText}>Results</Text>
        </View>
        <View style={styles.tab}>
          <Text style={styles.tabText}>Reflect</Text>
        </View>
      </View>

      {/* Placeholder content */}
      <View style={styles.placeholderBox}>
        <Text style={styles.placeholderLabel}>Activity #{activity.id}</Text>
        <Text style={styles.placeholderTitle}>Coming in Sprint 2</Text>
        <Text style={styles.placeholderBody}>
          This screen will host the {activity.sensor} for the {activity.title} activity.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back to activities</Text>
      </TouchableOpacity>
    </ScrollView>
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
    fontSize: 20,
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
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 20,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#534AB7',
  },
  tabText: { fontSize: 12, color: '#9CA3AF' },
  tabTextActive: { fontSize: 12, fontWeight: '500', color: '#534AB7' },
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
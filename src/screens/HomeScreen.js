import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ACTIVITIES, CATEGORY_COLORS } from '../constants/activities';
import { clearTeam } from '../services/teamStorage';

export default function HomeScreen({ navigation, team, onResetTeam }) {
  const engineeringActivities = ACTIVITIES.filter((a) => a.category === 'engineering');
  const healthActivities = ACTIVITIES.filter((a) => a.category === 'health');

  const handleResetTeam = () => {
    Alert.alert(
      'Reset team',
      'This will clear your team and return to onboarding. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearTeam();
            onResetTeam();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>STEMM Lab</Text>
          <Text style={styles.headerSubtitle}>
            {team.teamName} · {team.discriminator}
          </Text>
        </View>
        <TouchableOpacity onPress={handleResetTeam} style={styles.resetButton}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Engineering section */}
        <Text style={styles.sectionTitle}>Engineering challenges</Text>
        {engineeringActivities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onPress={() =>
              navigation.navigate('Activity', { activityId: activity.id })
            }
          />
        ))}

        {/* Health section */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          Health and medical
        </Text>
        {healthActivities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onPress={() =>
              navigation.navigate('Activity', { activityId: activity.id })
            }
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Reusable activity card. Tapping it navigates to the activity screen.
 */
function ActivityCard({ activity, onPress }) {
  const colors = CATEGORY_COLORS[activity.category];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>
          {activity.id}. {activity.title}
        </Text>
        <View style={[styles.badge, { backgroundColor: colors.badgeBg }]}>
          <Text style={[styles.badgeText, { color: colors.badgeText }]}>
            {activity.subject}
          </Text>
        </View>
      </View>
      <Text style={styles.cardDescription}>{activity.description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  resetButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resetButtonText: {
    fontSize: 12,
    color: '#6B7280',
  },
  scroll: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    flex: 1,
    paddingRight: 8,
  },
  cardDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
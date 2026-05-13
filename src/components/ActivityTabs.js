import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Tab bar for the activity screen.
 *

 * />
 */
export default function ActivityTabs({ tabs, activeTab, onTabChange }) {
  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Standard tab definitions used by every activity screen.
 */
export const ACTIVITY_TABS = [
  { id: 'info', label: 'Instructions' },
  { id: 'record', label: 'Record' },
  { id: 'results', label: 'Results' },
  { id: 'reflect', label: 'Reflect' },
];

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#534AB7',
  },
  tabText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#534AB7',
    fontWeight: '500',
  },
});
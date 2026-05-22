// STEM-147: AdMob banner component — shows a banner ad at the bottom of activity screens.
//   Uses Google test ad unit IDs for development. Replace with real IDs before production.
//   Falls back to a placeholder when running in Expo Go (native module unavailable).

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// STEM-147: Safely try to import AdMob — fails in Expo Go since it needs a native build.
let BannerAd = null;
let BannerAdSize = null;
let TestIds = null;

try {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  TestIds = ads.TestIds;
} catch {
  // STEM-147: Module not available — running in Expo Go or native module missing.
}

export default function AdBanner() {
  const [adError, setAdError] = useState(false);

  // STEM-147: Show placeholder when AdMob native module isn't available (Expo Go).
  if (!BannerAd || !TestIds) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Ad Banner</Text>
          <Text style={styles.placeholderSub}>Requires development build</Text>
        </View>
      </View>
    );
  }

  // STEM-147: Don't render if ad fails to load — keeps the UI clean.
  if (adError) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={TestIds.ADAPTIVE_BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          // STEM-147: Tag for child-directed treatment since target audience is school students.
          requestNonPersonalizedAdsOnly: true,
          tagForChildDirectedTreatment: true,
        }}
        onAdFailedToLoad={(error) => {
          console.warn('AdBanner: failed to load', error?.message ?? error);
          setAdError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  // STEM-147: Placeholder banner for Expo Go — shows where the ad will appear.
  placeholder: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  placeholderSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
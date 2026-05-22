// STEM-145: Reusable video player with slow-motion speed controls.
//   Used across activities for reviewing recorded evidence — especially parachute
//   g-force analysis (contact time) and hand fan bend angle measurement.

import React, { useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

// STEM-145: Playback speed options — 0.25x is critical for slow-mo analysis of impacts/bounces.
const SPEED_OPTIONS = [
  { label: '0.25x', value: 0.25 },
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1.0 },
  { label: '2x', value: 2.0 },
];

export default function VideoPlayer({ uri, style }) {
  const [activeSpeed, setActiveSpeed] = useState(1.0);

  // STEM-145: expo-video's useVideoPlayer takes a source and a setup callback
  //   that runs once when the player is created.
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.playbackRate = 1.0;
  });

  // STEM-145: Change playback speed — updates both local state and the player instance.
  const handleSpeedChange = useCallback((speed) => {
    setActiveSpeed(speed);
    if (player) {
      player.playbackRate = speed;
    }
  }, [player]);

  // STEM-145: Play/pause toggle.
  const handlePlayPause = useCallback(() => {
    if (!player) return;
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  if (!uri) {
    return (
      <View style={[styles.container, styles.empty, style]}>
        <Text style={styles.emptyText}>No video recorded yet</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* STEM-145: VideoView renders the player — nativeControls off so we use our own speed buttons. */}
      <View style={styles.videoWrapper}>
        <VideoView
          player={player}
          style={styles.video}
          nativeControls={false}
          contentFit="contain"
        />
      </View>

      {/* STEM-145: Playback controls row — play/pause + speed selector. */}
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.playPauseBtn} onPress={handlePlayPause}>
          <Text style={styles.playPauseText}>⏯</Text>
        </TouchableOpacity>

        {/* STEM-145: Speed buttons — highlighted when active. */}
        <View style={styles.speedRow}>
          {SPEED_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.speedBtn,
                activeSpeed === opt.value && styles.speedBtnActive,
              ]}
              onPress={() => handleSpeedChange(opt.value)}
            >
              <Text
                style={[
                  styles.speedText,
                  activeSpeed === opt.value && styles.speedTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* STEM-145: Hint for students on what slow-mo is useful for. */}
      <Text style={styles.hint}>
        Use 0.25x to measure contact time and observe bounces
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 120,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
  },
  // STEM-145: 16:9 matches standard phone video aspect ratio.
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  video: {
    flex: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#111',
  },
  playPauseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playPauseText: {
    fontSize: 18,
    color: '#FFF',
  },
  speedRow: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
  },
  speedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#333',
  },
  speedBtnActive: {
    backgroundColor: '#534AB7',
  },
  speedText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  speedTextActive: {
    color: '#FFF',
  },
  hint: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#111',
  },
});
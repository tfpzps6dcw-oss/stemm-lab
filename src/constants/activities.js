/**
 * Master list of all STEMM Lab activities.
 * Each activity is rendered as a card on the home screen
 * and has its own activity screen.
 */
export const ACTIVITIES = [
  {
    id: 1,
    title: 'Parachute drop',
    category: 'engineering',
    subject: 'Physics',
    description: 'Forces · timer · slow-mo video',
    sensor: 'timer + camera',
  },
  {
    id: 2,
    title: 'Sound pollution hunter',
    category: 'engineering',
    subject: 'Environmental science',
    description: 'Microphone · dB levels',
    sensor: 'microphone',
  },
  {
    id: 3,
    title: 'Hand fan challenge',
    category: 'engineering',
    subject: 'Physics',
    description: 'Air movement · bend angles',
    sensor: 'camera',
  },
  {
    id: 4,
    title: 'Earthquake-resistant structure',
    category: 'engineering',
    subject: 'Engineering',
    description: 'Vibration sensor · structural design',
    sensor: 'accelerometer',
  },
  {
    id: 5,
    title: 'Stretch speed and gracefulness',
    category: 'health',
    subject: 'Biomechanics',
    description: 'Movement · smoothness · coordination',
    sensor: 'accelerometer',
  },
  {
    id: 6,
    title: 'Reaction board challenge',
    category: 'health',
    subject: 'Neuroscience',
    description: 'Reaction time · coordination',
    sensor: 'touch + timer',
  },
  {
    id: 7,
    title: 'Breathing pace trainer',
    category: 'health',
    subject: 'Medical',
    description: 'Breathing rate · rest vs exercise',
    sensor: 'accelerometer',
  },
];

/**
 * Activity category colours used throughout the app.
 * engineering = blue, health = green
 */
export const CATEGORY_COLORS = {
  engineering: {
    badgeBg: '#E6F1FB',
    badgeText: '#0C447C',
  },
  health: {
    badgeBg: '#E1F5EE',
    badgeText: '#085041',
  },
};

/**
 * Helper to find a specific activity by id.
 */
export function getActivityById(id) {
  return ACTIVITIES.find((a) => a.id === id);
}
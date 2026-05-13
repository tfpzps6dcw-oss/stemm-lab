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
    overview:
      'Design and test a parachute for a small toy to reduce its landing speed and impact force. Iterate your design under time and material constraints.',
    equipment: [
      'Small toy (e.g. army toy soldier)',
      'Table or elevated surface',
      'Paper or plastic',
      'String, scissors, tape',
    ],
    steps: [
      'Drop the toy without a parachute and record the fall as your baseline.',
      'Build a parachute using your materials.',
      'Drop the toy from the same height and record the fall.',
      'Review speed and landing results in the app.',
      'Redesign and test up to three prototypes within 20 minutes.',
    ],
    resultsColumns: ['Design', 'Predict', 'Outcome', 'OK?'],
  },
  {
    id: 2,
    title: 'Sound pollution hunter',
    category: 'engineering',
    subject: 'Environmental science',
    description: 'Microphone · dB levels',
    sensor: 'microphone',
    overview:
      'Measure and compare sound levels in different classroom activities. Map loud and quiet zones to understand sound pollution.',
    equipment: ['Phone with STEMM Lab app', 'Various objects for testing sound'],
    steps: [
      'Predict which actions will be loudest.',
      'Measure noise from each action: dropping objects, talking, walking, stamping feet.',
      'Record the decibel levels for each action.',
      'Compare predictions with outcomes.',
      'Discuss whether ear protection should be worn in the classroom.',
    ],
    resultsColumns: ['Action', 'Predict', 'Outcome (dB)', 'OK?'],
  },
  {
    id: 3,
    title: 'Hand fan challenge',
    category: 'engineering',
    subject: 'Physics',
    description: 'Air movement · bend angles',
    sensor: 'camera',
    overview:
      'Test how air movement affects flexible materials. Compare bend angles using different fan designs and materials.',
    equipment: ['Paper and cardboard', 'Scissors', 'Sticky tape', 'Phone'],
    steps: [
      'Stand paper upright on a table.',
      'Fan air from 30 cm away.',
      'Observe and measure how much the paper bends.',
      'Repeat with different fan designs and distances (15cm, 30cm, 45cm).',
      'Repeat with cardboard instead of paper.',
    ],
    resultsColumns: ['Design', 'Predict', 'Bend angle', 'OK?'],
  },
  {
    id: 4,
    title: 'Earthquake-resistant structure',
    category: 'engineering',
    subject: 'Engineering',
    description: 'Vibration sensor · structural design',
    sensor: 'accelerometer',
    overview:
      'Design structures that withstand vibration, simulating earthquakes. Use the phone\'s accelerometer to measure how much your structure shakes.',
    equipment: ['Cardboard, paper', 'Scissors, sticky tape', 'Plastic/paper cups', 'Phone'],
    steps: [
      'Build an anti-vibration layer by folding paper or cardboard.',
      'Place a flat cardboard platform on top.',
      'Place the phone in the centre and activate vibration mode.',
      'Modify the structure to reduce phone movement.',
      'Test multiple design iterations.',
    ],
    resultsColumns: ['Design', 'Predict', 'Movement', 'OK?'],
  },
  {
    id: 5,
    title: 'Stretch speed and gracefulness',
    category: 'health',
    subject: 'Biomechanics',
    description: 'Movement · smoothness · coordination',
    sensor: 'accelerometer',
    overview:
      'Investigate how the human body moves by measuring speed, smoothness, and coordination during controlled stretching activities.',
    equipment: ['Phone with STEMM Lab app', 'Open space to move safely'],
    steps: [
      'Hold the phone firmly in one hand.',
      'Activate the vibration sensor in the app.',
      'Perform guided movements slowly as shown.',
      'Repeat with vibration feedback enabled.',
      'Review speed, smoothness, and range-of-motion data.',
    ],
    resultsColumns: ['Attempt', 'Predict', 'Outcome', 'OK?'],
  },
  {
    id: 6,
    title: 'Reaction board challenge',
    category: 'health',
    subject: 'Neuroscience',
    description: 'Reaction time · coordination',
    sensor: 'touch + timer',
    overview:
      'Measure reaction time, coordination, and improvement through repeated digital and physical challenges.',
    equipment: ['Phone with STEMM Lab app', 'Clear working space'],
    steps: [
      'Phase 1: Tap the screen as soon as the hidden button appears.',
      'Phase 2: Repeat using your non-dominant hand.',
      'Phase 3: Trace a moving shape on the screen.',
      'Rotate through each team member.',
      'Compare results across attempts and hands.',
    ],
    resultsColumns: ['Attempt', 'Predict', 'Time', 'OK?'],
  },
  {
    id: 7,
    title: 'Breathing pace trainer',
    category: 'health',
    subject: 'Medical',
    description: 'Breathing rate · rest vs exercise',
    sensor: 'accelerometer',
    overview:
      'Analyse breathing patterns at rest and after exercise. See how exercise affects breathing rate.',
    equipment: ['Phone with STEMM Lab app', 'Flat surface or mat'],
    steps: [
      'Place the phone gently on your chest.',
      'Record breathing at rest for one minute.',
      'Perform light exercise — jog one minute on the spot.',
      'Record breathing again immediately after.',
      'Do 100 star jumps and record breathing once more.',
    ],
    resultsColumns: ['State', 'Predict (bpm)', 'Outcome (bpm)', 'OK?'],
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
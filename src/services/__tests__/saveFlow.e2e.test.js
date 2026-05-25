// STEM-133 (P2 end-to-end test): full "record → calculate → save → read back" flow.
//
// This is an END-TO-END test of the data path a student triggers when they
// finish an activity:
//   1. accelerometer samples are scored (smoothness algorithm)
//   2. saveResult() persists the result (SQLite first, then Firestore sync)
//   3. the saved result can be read back for the Results tab
//
// All external boundaries (auth, team storage, Firestore, and the SQLite layer)
// are mocked with an in-memory store so the whole flow runs without a device.

import { calculateSmoothness } from '../smoothnessScore';

// --- In-memory SQLite stand-in (mock-prefixed so jest.mock can use them) ---
const mockDb = [];
let mockNextId = 1;

jest.mock('../resultsService', () => ({
  insertResult: jest.fn(async (row) => {
    const id = mockNextId++;
    mockDb.push({ id, synced: 0, firestoreId: null, createdAt: Date.now(), ...row });
    return id;
  }),
  markSynced: jest.fn(async (localId, firestoreId) => {
    const row = mockDb.find((r) => r.id === localId);
    if (row) {
      row.synced = 1;
      row.firestoreId = firestoreId;
    }
  }),
  getResultsByActivity: jest.fn(async (activityId) =>
    mockDb.filter((r) => String(r.activityId) === String(activityId))
  ),
}));

// --- Firestore stand-in: returns a fake document id ---
jest.mock('../firestoreResults', () => ({
  uploadResult: jest.fn(async () => 'fake-firestore-id-123'),
}));

// --- Auth stand-in: a logged-in user ---
jest.mock('../authService', () => ({
  getCurrentUser: jest.fn(() => ({ uid: 'user-abc', email: 'student@school.edu' })),
}));

// --- Team storage stand-in: an onboarded team ---
jest.mock('../teamStorage', () => ({
  loadTeam: jest.fn(async () => ({
    teamName: 'Team Rocket',
    discriminator: 'TM-1234',
    grade: 'Year 8',
  })),
}));

import { saveResult } from '../resultSaveHelper';
import { insertResult, getResultsByActivity } from '../resultsService';
import { uploadResult } from '../firestoreResults';

describe('end-to-end: record Activity 5 result → save → read back', () => {
  beforeEach(() => {
    mockDb.length = 0;
    mockNextId = 1;
    jest.clearAllMocks();
  });

  test('a recorded smoothness result is scored, saved locally, synced, and readable', async () => {
    // STEP 1 — simulate a recorded stretch motion and score it
    const samples = Array.from({ length: 50 }, (_, i) => ({
      x: 0, y: 0, z: 1, magnitude: 1, netMagnitude: 0, t: i * 50,
    }));
    const scored = calculateSmoothness(samples);
    expect(scored.score).toBe(100); // still motion → perfect score

    // STEP 2 — save the result through the real saveResult orchestration
    const saveOutcome = await saveResult({
      activityId: 5,
      payload: { motion: 'arm sweep', score: scored.score },
    });

    // It should have written to SQLite and synced to Firestore
    expect(insertResult).toHaveBeenCalledTimes(1);
    expect(uploadResult).toHaveBeenCalledTimes(1);
    expect(saveOutcome.synced).toBe(true);
    expect(saveOutcome.firestoreId).toBe('fake-firestore-id-123');

    // STEP 3 — read the result back (what the Results tab does)
    const stored = await getResultsByActivity(5);
    expect(stored).toHaveLength(1);
    expect(stored[0].payload.score).toBe(100);
    expect(stored[0].teamName).toBe('Team Rocket');
    expect(stored[0].synced).toBe(1); // marked synced after Firestore upload
  });

  test('result is still saved locally even when Firestore upload fails (offline)', async () => {
    // Force the Firestore upload to fail this time
    uploadResult.mockRejectedValueOnce(new Error('network offline'));

    const outcome = await saveResult({
      activityId: 5,
      payload: { motion: 'leg stretch', score: 80 },
    });

    // Local save still succeeded; sync is deferred
    expect(outcome.synced).toBe(false);
    expect(outcome.localId).toBeGreaterThan(0);

    const stored = await getResultsByActivity(5);
    expect(stored).toHaveLength(1);
    expect(stored[0].synced).toBe(0); // unsynced — will retry later
  });

  test('rejects a save with no signed-in user', async () => {
    const { getCurrentUser } = require('../authService');
    getCurrentUser.mockReturnValueOnce(null);

    await expect(
      saveResult({ activityId: 5, payload: { score: 50 } })
    ).rejects.toThrow(/no signed-in user/i);
  });
});

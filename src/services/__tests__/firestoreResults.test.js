// STEM-107: Tests for Firestore results service with firebase/firestore mocked.

import {
  uploadResult,
  fetchResultsByTeam,
  listenToResultsByActivity,
  listenToTeamResults,
} from '../firestoreResults';

// STEM-107: Minimal mock of firebase/firestore — captures calls and returns canned data.
jest.mock('firebase/firestore', () => {
  const mockAddDoc = jest.fn();
  const mockGetDocs = jest.fn();
  const mockOnSnapshot = jest.fn();

  return {
    collection: jest.fn((db, name) => ({ __collection: name })),
    addDoc: mockAddDoc,
    query: jest.fn((coll, ...constraints) => ({ __query: { coll, constraints } })),
    where: jest.fn((field, op, value) => ({ __where: { field, op, value } })),
    orderBy: jest.fn((field, dir) => ({ __orderBy: { field, dir } })),
    limit: jest.fn((n) => ({ __limit: n })),
    onSnapshot: mockOnSnapshot,
    getDocs: mockGetDocs,
    serverTimestamp: jest.fn(() => '__SERVER_TIMESTAMP__'),
  };
});

// STEM-107: firebase.js depends on react-native-config which Jest can't load — stub it.
jest.mock('../firebase', () => ({
  db: { __fake: 'db' },
}));

const firestore = require('firebase/firestore');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('firestoreResults', () => {
  const samplePayload = { bestDesign: 'plastic parachute', timeToHit: 1.2 };

  describe('uploadResult', () => {
    test('uploads with all expected fields', async () => {
      firestore.addDoc.mockResolvedValue({ id: 'firestore_abc123' });

      const id = await uploadResult({
        activityId: 'activity_1',
        teamId: 'team_alpha',
        userId: 'uid_xyz',
        teamName: 'The Alphas',
        payload: samplePayload,
        createdAt: 1700000000000,
        localId: 42,
      });

      expect(id).toBe('firestore_abc123');
      expect(firestore.addDoc).toHaveBeenCalledTimes(1);

      const [, doc] = firestore.addDoc.mock.calls[0];
      expect(doc).toMatchObject({
        activityId: 'activity_1',
        teamId: 'team_alpha',
        userId: 'uid_xyz',
        teamName: 'The Alphas',
        payload: samplePayload,
        createdAt: 1700000000000,
        localId: 42,
        serverCreatedAt: '__SERVER_TIMESTAMP__',
      });
    });

    test('defaults createdAt to now if not provided', async () => {
      firestore.addDoc.mockResolvedValue({ id: 'firestore_xyz' });
      const before = Date.now();

      await uploadResult({
        activityId: 'activity_1',
        teamId: 'team_a',
        payload: samplePayload,
      });

      const [, doc] = firestore.addDoc.mock.calls[0];
      expect(doc.createdAt).toBeGreaterThanOrEqual(before);
      expect(doc.createdAt).toBeLessThanOrEqual(Date.now());
    });

    test('rejects missing required fields', async () => {
      await expect(
        uploadResult({ teamId: 't', payload: {} })
      ).rejects.toThrow(/activityId/);

      await expect(
        uploadResult({ activityId: 'a', payload: {} })
      ).rejects.toThrow(/teamId/);

      await expect(
        uploadResult({ activityId: 'a', teamId: 't', payload: null })
      ).rejects.toThrow(/payload/);
    });
  });

  describe('fetchResultsByTeam', () => {
    test('returns hydrated rows', async () => {
      firestore.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'fs_1',
            data: () => ({
              activityId: 'activity_1',
              teamId: 'team_a',
              userId: 'u1',
              teamName: 'A',
              payload: { x: 1 },
              createdAt: 100,
              serverCreatedAt: { toMillis: () => 105 },
              localId: 1,
            }),
          },
          {
            id: 'fs_2',
            data: () => ({
              activityId: 'activity_2',
              teamId: 'team_a',
              payload: { y: 2 },
              createdAt: 200,
            }),
          },
        ],
      });

      const rows = await fetchResultsByTeam('team_a');

      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({
        firestoreId: 'fs_1',
        activityId: 'activity_1',
        teamId: 'team_a',
        userId: 'u1',
        teamName: 'A',
        payload: { x: 1 },
        createdAt: 100,
        serverCreatedAt: 105,
        localId: 1,
      });
      // Second row tests the null/default fallbacks
      expect(rows[1].userId).toBeNull();
      expect(rows[1].teamName).toBeNull();
      expect(rows[1].serverCreatedAt).toBeNull();
    });
  });

  describe('listenToResultsByActivity', () => {
    test('invokes callback with hydrated rows on snapshot', () => {
      const callback = jest.fn();
      const unsubscribe = jest.fn();

      firestore.onSnapshot.mockImplementation((q, onNext) => {
        onNext({
          docs: [
            {
              id: 'fs_1',
              data: () => ({
                activityId: 'activity_1',
                teamId: 'team_a',
                payload: { score: 10 },
                createdAt: 100,
              }),
            },
          ],
        });
        return unsubscribe;
      });

      const result = listenToResultsByActivity('activity_1', callback);

      expect(callback).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            firestoreId: 'fs_1',
            activityId: 'activity_1',
            payload: { score: 10 },
          }),
        ],
        null
      );
      expect(result).toBe(unsubscribe);
    });

    test('passes error to callback when snapshot fails', () => {
      const callback = jest.fn();

      firestore.onSnapshot.mockImplementation((q, onNext, onError) => {
        onError(new Error('permission denied'));
        return jest.fn();
      });

      listenToResultsByActivity('activity_1', callback);

      expect(callback).toHaveBeenCalledWith([], expect.any(Error));
    });
  });

  describe('listenToTeamResults', () => {
    test('returns the unsubscribe function from onSnapshot', () => {
      const unsubscribe = jest.fn();
      firestore.onSnapshot.mockImplementation(() => unsubscribe);

      const result = listenToTeamResults('team_a', jest.fn());
      expect(result).toBe(unsubscribe);
    });
  });
});

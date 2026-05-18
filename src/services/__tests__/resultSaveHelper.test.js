// STEM-108: Tests for saveResult — mocks all four dependencies.

import { saveResult } from '../resultSaveHelper';
import { insertResult, markSynced } from '../resultsService';
import { uploadResult } from '../firestoreResults';
import { getCurrentUser } from '../authService';
import { loadTeam } from '../teamStorage';

jest.mock('../resultsService', () => ({
  insertResult: jest.fn(),
  markSynced: jest.fn(),
}));

jest.mock('../firestoreResults', () => ({
  uploadResult: jest.fn(),
}));

jest.mock('../authService', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('../teamStorage', () => ({
  loadTeam: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();

  // STEM-108: Reasonable defaults — individual tests override as needed.
  getCurrentUser.mockReturnValue({ uid: 'uid_abc', email: 'student@school.edu' });
  loadTeam.mockResolvedValue({
    teamName: 'The Alphas',
    members: ['Alex', 'Bo'],
    grade: '7',
    discriminator: 'team_xyz',
  });
  insertResult.mockResolvedValue(42);
  uploadResult.mockResolvedValue('firestore_doc_123');
  markSynced.mockResolvedValue(undefined);
});

const samplePayload = { bestDesign: 'plastic parachute', timeToHit: 1.42 };

describe('saveResult', () => {
  describe('happy path', () => {
    test('saves locally, uploads, marks synced, returns full result', async () => {
      const result = await saveResult({
        activityId: 'activity_1',
        payload: samplePayload,
      });

      expect(result).toEqual({
        localId: 42,
        firestoreId: 'firestore_doc_123',
        synced: true,
      });

      expect(insertResult).toHaveBeenCalledWith({
        activityId: 'activity_1',
        teamId: 'team_xyz',
        userId: 'uid_abc',
        teamName: 'The Alphas',
        payload: samplePayload,
      });

      expect(uploadResult).toHaveBeenCalledWith(
        expect.objectContaining({
          activityId: 'activity_1',
          teamId: 'team_xyz',
          userId: 'uid_abc',
          teamName: 'The Alphas',
          payload: samplePayload,
          localId: 42,
        })
      );

      expect(markSynced).toHaveBeenCalledWith(42, 'firestore_doc_123');
    });
  });

  describe('offline / Firestore failure', () => {
    test('returns synced=false but local save still succeeds', async () => {
      uploadResult.mockRejectedValue(new Error('network request failed'));

      const result = await saveResult({
        activityId: 'activity_1',
        payload: samplePayload,
      });

      expect(result).toEqual({
        localId: 42,
        firestoreId: null,
        synced: false,
      });

      // STEM-108: Local row must still exist for later sync retry.
      expect(insertResult).toHaveBeenCalledTimes(1);
      // STEM-108: markSynced must NOT be called on upload failure.
      expect(markSynced).not.toHaveBeenCalled();
    });

    test('does not throw on Firestore failure (resolves normally)', async () => {
      uploadResult.mockRejectedValue(new Error('boom'));

      await expect(
        saveResult({ activityId: 'activity_1', payload: samplePayload })
      ).resolves.toBeDefined();
    });
  });

  describe('validation', () => {
    test('rejects missing activityId', async () => {
      await expect(
        saveResult({ payload: samplePayload })
      ).rejects.toThrow(/activityId/);
    });

    test('rejects non-object payload', async () => {
      await expect(
        saveResult({ activityId: 'activity_1', payload: null })
      ).rejects.toThrow(/payload/);

      await expect(
        saveResult({ activityId: 'activity_1', payload: 'string' })
      ).rejects.toThrow(/payload/);
    });

    test('rejects when no user signed in', async () => {
      getCurrentUser.mockReturnValue(null);

      await expect(
        saveResult({ activityId: 'activity_1', payload: samplePayload })
      ).rejects.toThrow(/signed-in user/);

      // STEM-108: Must not write to SQLite without a userId.
      expect(insertResult).not.toHaveBeenCalled();
    });

    test('rejects when no team set up (onboarding incomplete)', async () => {
      loadTeam.mockResolvedValue(null);

      await expect(
        saveResult({ activityId: 'activity_1', payload: samplePayload })
      ).rejects.toThrow(/team set up/);

      expect(insertResult).not.toHaveBeenCalled();
    });
  });

  describe('SQLite failure', () => {
    test('throws if local save fails — no upload attempted', async () => {
      insertResult.mockRejectedValue(new Error('disk full'));

      await expect(
        saveResult({ activityId: 'activity_1', payload: samplePayload })
      ).rejects.toThrow(/disk full/);

      expect(uploadResult).not.toHaveBeenCalled();
      expect(markSynced).not.toHaveBeenCalled();
    });
  });
});

// src/services/__tests__/resultsService.test.js
// Unit tests for the SQLite results service.
//
// We mock expo-sqlite with a tiny in-memory fake so tests run fast
// and don't touch the device filesystem.

import {
  insertResult,
  markSynced,
  getPendingSync,
  getResultsByActivity,
  getResultsByTeam,
  clearAllResults,
  clearResultsByActivity,
  getPendingSyncCount,
} from '../resultsService';

// ---- expo-sqlite mock ----
// Stores rows in a JS array; supports the handful of queries our service uses.
jest.mock('expo-sqlite', () => {
  let rows = [];
  let nextId = 1;

  const fakeDb = {
    execAsync: jest.fn().mockResolvedValue(undefined),
    getFirstAsync: jest.fn(async (sql, params) => {
      if (sql.includes('PRAGMA user_version')) return { user_version: 1 };
      if (sql.includes('COUNT(*)')) {
        return { count: rows.filter((r) => r.synced === 0).length };
      }
      return null;
    }),
    getAllAsync: jest.fn(async (sql, params) => {
      // Mimic only the SELECTs used by resultsService
      let out = [...rows];
      if (sql.includes('WHERE synced = 0')) {
        out = out.filter((r) => r.synced === 0);
      }
      if (sql.includes('activity_id = ?')) {
        out = out.filter((r) => r.activity_id === params[0]);
        if (sql.includes('team_id = ?')) {
          out = out.filter((r) => r.team_id === params[1]);
        }
      } else if (sql.includes('team_id = ?')) {
        out = out.filter((r) => r.team_id === params[0]);
      }
      out.sort((a, b) =>
        sql.includes('ASC') ? a.created_at - b.created_at : b.created_at - a.created_at
      );
      const limit = params[params.length - 1];
      return out.slice(0, typeof limit === 'number' ? limit : out.length);
    }),
    runAsync: jest.fn(async (sql, params) => {
      if (sql.startsWith('INSERT')) {
        const row = {
          id: nextId++,
          activity_id: params[0],
          team_id: params[1],
          user_id: params[2],
          team_name: params[3],
          payload: params[4],
          created_at: params[5],
          synced: 0,
          firestore_id: null,
        };
        rows.push(row);
        return { lastInsertRowId: row.id, changes: 1 };
      }
      if (sql.startsWith('UPDATE')) {
        const r = rows.find((x) => x.id === params[1]);
        if (r) {
          r.synced = 1;
          r.firestore_id = params[0];
        }
        return { changes: r ? 1 : 0 };
      }
      if (sql.startsWith('DELETE')) {
        if (sql.includes('activity_id = ?')) {
          rows = rows.filter((r) => r.activity_id !== params[0]);
        } else {
          rows = [];
        }
        return { changes: 1 };
      }
      return { changes: 0 };
    }),
    closeAsync: jest.fn().mockResolvedValue(undefined),
    __reset: () => { rows = []; nextId = 1; },
  };

  return {
    openDatabaseAsync: jest.fn().mockResolvedValue(fakeDb),
    __fakeDb: fakeDb,
  };
});

const SQLite = require('expo-sqlite');

beforeEach(() => {
  SQLite.__fakeDb.__reset();
});

describe('resultsService', () => {
  const samplePayload = {
    designs: [
      { name: 'No parachute', timeToFirstHit: 0.5, gForce: 4.1 },
      { name: 'Plastic 4-corner', timeToFirstHit: 1.2, gForce: 1.8 },
    ],
    bestDesign: 'Plastic 4-corner',
  };

  test('insertResult stores a row and returns local id', async () => {
    const id = await insertResult({
      activityId: 'activity_1',
      teamId: 'team_alpha',
      userId: 'uid_123',
      teamName: 'The Alphas',
      payload: samplePayload,
    });
    expect(id).toBe(1);
  });

  test('insertResult rejects missing required fields', async () => {
    await expect(
      insertResult({ teamId: 't', payload: {} })
    ).rejects.toThrow(/activityId/);

    await expect(
      insertResult({ activityId: 'a', payload: {} })
    ).rejects.toThrow(/teamId/);

    await expect(
      insertResult({ activityId: 'a', teamId: 't', payload: null })
    ).rejects.toThrow(/payload/);
  });

  test('newly inserted rows are unsynced by default', async () => {
    await insertResult({
      activityId: 'activity_1',
      teamId: 'team_alpha',
      payload: samplePayload,
    });
    const pending = await getPendingSync();
    expect(pending).toHaveLength(1);
    expect(pending[0].synced).toBe(false);
  });

  test('markSynced flips the synced flag and stores firestore id', async () => {
    const id = await insertResult({
      activityId: 'activity_1',
      teamId: 'team_alpha',
      payload: samplePayload,
    });

    await markSynced(id, 'firestore_abc_123');

    const pending = await getPendingSync();
    expect(pending).toHaveLength(0);

    const all = await getResultsByActivity('activity_1');
    expect(all[0].synced).toBe(true);
    expect(all[0].firestoreId).toBe('firestore_abc_123');
  });

  test('getResultsByActivity filters by activity and team', async () => {
    await insertResult({ activityId: 'activity_1', teamId: 'team_a', payload: {} });
    await insertResult({ activityId: 'activity_1', teamId: 'team_b', payload: {} });
    await insertResult({ activityId: 'activity_2', teamId: 'team_a', payload: {} });

    const a1 = await getResultsByActivity('activity_1');
    expect(a1).toHaveLength(2);

    const a1TeamA = await getResultsByActivity('activity_1', { teamId: 'team_a' });
    expect(a1TeamA).toHaveLength(1);
    expect(a1TeamA[0].teamId).toBe('team_a');
  });

  test('getResultsByTeam returns all activities for one team', async () => {
    await insertResult({ activityId: 'activity_1', teamId: 'team_a', payload: {} });
    await insertResult({ activityId: 'activity_2', teamId: 'team_a', payload: {} });
    await insertResult({ activityId: 'activity_3', teamId: 'team_b', payload: {} });

    const teamA = await getResultsByTeam('team_a');
    expect(teamA).toHaveLength(2);
  });

  test('hydrate parses JSON payload back to an object', async () => {
    await insertResult({
      activityId: 'activity_1',
      teamId: 'team_a',
      payload: samplePayload,
    });
    const rows = await getResultsByActivity('activity_1');
    expect(rows[0].payload.bestDesign).toBe('Plastic 4-corner');
    expect(rows[0].payload.designs).toHaveLength(2);
  });

  test('clearResultsByActivity only clears that activity', async () => {
    await insertResult({ activityId: 'activity_1', teamId: 'team_a', payload: {} });
    await insertResult({ activityId: 'activity_2', teamId: 'team_a', payload: {} });

    await clearResultsByActivity('activity_1');

    expect(await getResultsByActivity('activity_1')).toHaveLength(0);
    expect(await getResultsByActivity('activity_2')).toHaveLength(1);
  });

  test('clearAllResults wipes everything', async () => {
    await insertResult({ activityId: 'activity_1', teamId: 'team_a', payload: {} });
    await insertResult({ activityId: 'activity_2', teamId: 'team_b', payload: {} });

    await clearAllResults();

    expect(await getResultsByTeam('team_a')).toHaveLength(0);
    expect(await getResultsByTeam('team_b')).toHaveLength(0);
  });

  test('getPendingSyncCount returns correct count', async () => {
    await insertResult({ activityId: 'activity_1', teamId: 'team_a', payload: {} });
    const id2 = await insertResult({ activityId: 'activity_2', teamId: 'team_a', payload: {} });
    await insertResult({ activityId: 'activity_3', teamId: 'team_a', payload: {} });

    await markSynced(id2, 'firestore_id_xyz');

    expect(await getPendingSyncCount()).toBe(2);
  });
});

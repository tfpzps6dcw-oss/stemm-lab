// src/services/resultsService.js
// CRUD service for activity results.
// Activity screens should NOT call this directly — they call resultSaveHelper
// (STEM-108), which wraps this + Firestore upload.

import { getDb } from './sqliteDb';

/**
 * Inserts a new result row.
 *
 * @param {Object} params
 * @param {string} params.activityId   e.g. "activity_1"
 * @param {string} params.teamId       team discriminator
 * @param {string} [params.userId]     Firebase Auth UID
 * @param {string} [params.teamName]   denormalised for leaderboard
 * @param {Object} params.payload      activity-specific data (will be JSON.stringify'd)
 * @returns {Promise<number>} the local row id of the inserted result
 */
export async function insertResult({
  activityId,
  teamId,
  userId = null,
  teamName = null,
  payload,
}) {
  if (!activityId) throw new Error('insertResult: activityId is required');
  if (!teamId) throw new Error('insertResult: teamId is required');
  if (!payload || typeof payload !== 'object') {
    throw new Error('insertResult: payload must be an object');
  }

  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO results
       (activity_id, team_id, user_id, team_name, payload, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, 0);`,
    [
      activityId,
      teamId,
      userId,
      teamName,
      JSON.stringify(payload),
      Date.now(),
    ]
  );
  return result.lastInsertRowId;
}

/**
 * Marks a row as synced to Firestore.
 * @param {number} localId      row id from insertResult()
 * @param {string} firestoreId  the doc id returned by Firestore
 */
export async function markSynced(localId, firestoreId) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE results SET synced = 1, firestore_id = ? WHERE id = ?;`,
    [firestoreId, localId]
  );
}

/**
 * Returns rows pending upload — used by the background sync queue.
 * @param {number} [limit=50]
 */
export async function getPendingSync(limit = 50) {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT * FROM results WHERE synced = 0 ORDER BY created_at ASC LIMIT ?;`,
    [limit]
  );
  return rows.map(hydrate);
}

/**
 * Gets all results for a specific activity (e.g. for a results table display).
 * @param {string} activityId
 * @param {Object} [opts]
 * @param {string} [opts.teamId]  filter to one team
 * @param {number} [opts.limit=100]
 */
export async function getResultsByActivity(activityId, opts = {}) {
  const { teamId, limit = 100 } = opts;
  const db = await getDb();

  let sql = `SELECT * FROM results WHERE activity_id = ?`;
  const params = [activityId];

  if (teamId) {
    sql += ` AND team_id = ?`;
    params.push(teamId);
  }
  sql += ` ORDER BY created_at DESC LIMIT ?;`;
  params.push(limit);

  const rows = await db.getAllAsync(sql, params);
  return rows.map(hydrate);
}

/**
 * Gets all results for a team across all activities.
 */
export async function getResultsByTeam(teamId, limit = 100) {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT * FROM results WHERE team_id = ?
     ORDER BY created_at DESC LIMIT ?;`,
    [teamId, limit]
  );
  return rows.map(hydrate);
}

/**
 * Clears all rows. Useful for "reset app" or end-of-class cleanup.
 * Be careful — this is destructive.
 */
export async function clearAllResults() {
  const db = await getDb();
  await db.runAsync(`DELETE FROM results;`);
}

/**
 * Clears results for a single activity.
 */
export async function clearResultsByActivity(activityId) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM results WHERE activity_id = ?;`, [activityId]);
}

/**
 * Counts pending sync rows — useful for a "5 results not uploaded" badge.
 */
export async function getPendingSyncCount() {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT COUNT(*) AS count FROM results WHERE synced = 0;`
  );
  return row?.count ?? 0;
}

// ---- internal helpers ----

/**
 * Converts a raw DB row into a friendly JS object:
 * - parses JSON payload
 * - converts synced int -> bool
 */
function hydrate(row) {
  let payload = {};
  try {
    payload = JSON.parse(row.payload);
  } catch (e) {
    console.warn(`resultsService: malformed payload on row ${row.id}`, e);
  }
  return {
    id: row.id,
    activityId: row.activity_id,
    teamId: row.team_id,
    userId: row.user_id,
    teamName: row.team_name,
    payload,
    createdAt: row.created_at,
    synced: row.synced === 1,
    firestoreId: row.firestore_id,
  };
}

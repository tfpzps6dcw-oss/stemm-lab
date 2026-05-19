// STEM-112: CRUD service for activity results stored in SQLite.
// Activity screens call resultSaveHelper (STEM-108), which wraps this + Firestore.

import { getDb } from './sqliteDb';

// STEM-112: Insert a new result row — called by resultSaveHelper after user taps "Save".
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

// STEM-112: Flag a row as synced after successful Firestore upload.
export async function markSynced(localId, firestoreId) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE results SET synced = 1, firestore_id = ? WHERE id = ?;`,
    [firestoreId, localId]
  );
}

// STEM-112: Fetch rows that haven't been uploaded yet — used by background sync.
export async function getPendingSync(limit = 50) {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT * FROM results WHERE synced = 0 ORDER BY created_at ASC LIMIT ?;`,
    [limit]
  );
  return rows.map(hydrate);
}

// STEM-112: Load all results for a given activity — powers the Results tab.
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

// STEM-112: Load all results for a team across activities — used by leaderboard/profile.
export async function getResultsByTeam(teamId, limit = 100) {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT * FROM results WHERE team_id = ?
     ORDER BY created_at DESC LIMIT ?;`,
    [teamId, limit]
  );
  return rows.map(hydrate);
}

// STEM-112: Wipe all results — "reset app" or end-of-class cleanup.
export async function clearAllResults() {
  const db = await getDb();
  await db.runAsync(`DELETE FROM results;`);
}

// STEM-112: Wipe results for one activity only.
export async function clearResultsByActivity(activityId) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM results WHERE activity_id = ?;`, [activityId]);
}

// STEM-112: Count un-synced rows — powers "5 results pending upload" badge.
export async function getPendingSyncCount() {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT COUNT(*) AS count FROM results WHERE synced = 0;`
  );
  return row?.count ?? 0;
}

// STEM-112: Convert raw DB row → JS object (parse JSON payload, synced int → bool).
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

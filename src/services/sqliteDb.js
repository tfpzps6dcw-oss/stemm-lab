// src/services/sqliteDb.js


import * as SQLite from 'expo-sqlite';

const DB_NAME = 'stemm_lab.db';

// Bumped when schema changes — used to run migrations
const SCHEMA_VERSION = 1;

let dbInstance = null;

/**
 * Opens (or returns the cached) database handle.
 * Safe to call repeatedly — only opens once.
 */
export async function getDb() {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  await initSchema(dbInstance);
  return dbInstance;
}

/**
 * Creates tables + indexes if they don't exist.
 * Handles simple migrations via user_version pragma.
 */
async function initSchema(db) {
  // Read current schema version
  const versionRow = await db.getFirstAsync('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

  // Always enable foreign keys + WAL for better concurrent reads
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS results (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_id   TEXT    NOT NULL,
        team_id       TEXT    NOT NULL,
        user_id       TEXT,
        team_name     TEXT,
        payload       TEXT    NOT NULL,
        created_at    INTEGER NOT NULL,
        synced        INTEGER NOT NULL DEFAULT 0,
        firestore_id  TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_results_activity  ON results(activity_id);
      CREATE INDEX IF NOT EXISTS idx_results_team      ON results(team_id);
      CREATE INDEX IF NOT EXISTS idx_results_synced    ON results(synced);
      CREATE INDEX IF NOT EXISTS idx_results_created   ON results(created_at DESC);
    `);

    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }

  
}

/**
 * Closes the database. Call this on app teardown if needed.
 * In Expo apps you usually don't need to call this manually.
 */
export async function closeDb() {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}

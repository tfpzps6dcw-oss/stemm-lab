// STEM-112: SQLite database setup — schema, migrations, and connection management for result persistence.

import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'stemm_lab.db';
const SCHEMA_VERSION = 1;
const IS_WEB = Platform.OS === 'web';

let dbInstance = null;

// STEM-112: Singleton DB handle — opens once, reuses on subsequent calls.
export async function getDb() {
  if (IS_WEB) {
    return WEB_STUB;
  }
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  await initSchema(dbInstance);
  return dbInstance;
}

// STEM-112: Create results table + indexes on first open; migrations via user_version pragma.
async function initSchema(db) {
  const versionRow = await db.getFirstAsync('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  if (currentVersion < 1) {
    // STEM-112: Core results table — payload is JSON-stringified activity data.
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

  // Future migrations: if (currentVersion < 2) { ...alter table... }
}

// STEM-112: Closes DB handle — usually not needed in Expo, but useful for testing teardown.
export async function closeDb() {
  if (IS_WEB) return;
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}

// STEM-112: Web stub — returns safe defaults so the app doesn't crash on web preview.
const WEB_STUB = {
  async runAsync() {
    return { lastInsertRowId: Math.floor(Math.random() * 1e9), changes: 0 };
  },
  async getFirstAsync() {
    return null;
  },
  async getAllAsync() {
    return [];
  },
  async execAsync() {
    return undefined;
  },
};

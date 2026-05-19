// src/services/sqliteDb.js

import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'stemm_lab.db';
const SCHEMA_VERSION = 1;
const IS_WEB = Platform.OS === 'web';

let dbInstance = null;

/**
 * Opens (or returns the cached) database handle.
 * On web, returns a stub since expo-sqlite has no functioning web implementation.
 */
export async function getDb() {
  if (IS_WEB) {
    return WEB_STUB;
  }
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  await initSchema(dbInstance);
  return dbInstance;
}

async function initSchema(db) {
  const versionRow = await db.getFirstAsync('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

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

export async function closeDb() {
  if (IS_WEB) return;
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}

// Web stub — returns sensible defaults so the app keeps working without local persistence
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
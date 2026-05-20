// STEM-112: Background sync queue — retries Firestore uploads for results saved locally but not yet synced.

import { getPendingSync, markSynced } from './resultsService';
import { uploadResult } from './firestoreResults';

let intervalId = null;

const SYNC_INTERVAL_MS = 30_000; // STEM-112: Retry every 30 seconds.
const BATCH_SIZE = 10;           // STEM-112: Process up to 10 pending rows per cycle.

// STEM-112: Start the background sync loop. Call once at app startup (e.g. in App.js).
export function startSyncQueue() {
  if (intervalId) return; // Already running.

  // STEM-112: Run immediately on start, then repeat on interval.
  processQueue();
  intervalId = setInterval(processQueue, SYNC_INTERVAL_MS);
}

// STEM-112: Stop the sync loop. Call on app teardown or logout.
export function stopSyncQueue() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

// STEM-112: Process one batch of un-synced results.
async function processQueue() {
  try {
    const pending = await getPendingSync(BATCH_SIZE);
    if (pending.length === 0) return;

    for (const row of pending) {
      try {
        const firestoreId = await uploadResult({
          activityId: row.activityId,
          teamId: row.teamId,
          userId: row.userId,
          teamName: row.teamName,
          payload: row.payload,
          createdAt: row.createdAt,
          localId: row.id,
        });

        await markSynced(row.id, firestoreId);
      } catch (err) {
        // STEM-112: Skip this row and try again next cycle — don't block the batch.
        console.warn(`syncQueue: failed to sync row ${row.id}, will retry`, err?.message ?? err);
      }
    }
  } catch (err) {
    // STEM-112: If getPendingSync itself fails (DB issue), log and wait for next cycle.
    console.warn('syncQueue: batch fetch failed', err?.message ?? err);
  }
}

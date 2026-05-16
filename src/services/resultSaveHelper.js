// STEM-108: Single saveResult() for activity screens — wraps SQLite + Firestore.

import { insertResult, markSynced } from './resultsService';
import { uploadResult } from './firestoreResults';
import { getCurrentUser } from './authService';
import { loadTeam } from './teamStorage';

// STEM-108: Save locally first (offline-safe), then attempt cloud sync.
export async function saveResult({ activityId, payload }) {
  if (!activityId) throw new Error('saveResult: activityId is required');
  if (!payload || typeof payload !== 'object') {
    throw new Error('saveResult: payload must be an object');
  }

  const user = getCurrentUser();
  if (!user) throw new Error('saveResult: no signed-in user');

  const team = await loadTeam();
  if (!team) throw new Error('saveResult: no team set up — onboarding incomplete');

  // STEM-108: SQLite is the source of truth — must succeed before Firestore attempt.
  const localId = await insertResult({
    activityId,
    teamId: team.discriminator,
    userId: user.uid,
    teamName: team.teamName,
    payload,
  });

  // STEM-108: Firestore upload is best-effort — sync queue retries later if offline.
  let firestoreId = null;
  let synced = false;
  try {
    firestoreId = await uploadResult({
      activityId,
      teamId: team.discriminator,
      userId: user.uid,
      teamName: team.teamName,
      payload,
      createdAt: Date.now(),
      localId,
    });
    await markSynced(localId, firestoreId);
    synced = true;
  } catch (err) {
    console.warn(`saveResult: Firestore upload deferred (localId=${localId}):`, err?.message ?? err);
  }

  return { localId, firestoreId, synced };
}

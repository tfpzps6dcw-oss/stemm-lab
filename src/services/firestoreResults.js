// STEM-107: Firestore collections + service for activity results.

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  onSnapshot,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const RESULTS_COLLECTION = 'results';

// STEM-107: Upload a single result and return the new Firestore doc id.
export async function uploadResult({
  activityId,
  teamId,
  userId = null,
  teamName = null,
  payload,
  createdAt,
  localId = null,
}) {
  if (!activityId) throw new Error('uploadResult: activityId is required');
  if (!teamId) throw new Error('uploadResult: teamId is required');
  if (!payload || typeof payload !== 'object') {
    throw new Error('uploadResult: payload must be an object');
  }

  const docRef = await addDoc(collection(db, RESULTS_COLLECTION), {
    activityId,
    teamId,
    userId,
    teamName,
    payload,
    createdAt: createdAt ?? Date.now(),
    serverCreatedAt: serverTimestamp(),
    localId,
  });

  return docRef.id;
}

// STEM-107: Live subscription for leaderboard — fires whenever results change.
export function listenToResultsByActivity(activityId, callback, options = {}) {
  const { limit = 100 } = options;

  const q = query(
    collection(db, RESULTS_COLLECTION),
    where('activityId', '==', activityId),
    orderBy('createdAt', 'desc'),
    fsLimit(limit)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((d) => hydrate(d.id, d.data()));
      callback(rows, null);
    },
    (error) => {
      console.warn('listenToResultsByActivity error:', error);
      callback([], error);
    }
  );
}

// STEM-107: One-off fetch (no live listener) — useful for "my team's history".
export async function fetchResultsByTeam(teamId, options = {}) {
  const { limit = 100 } = options;

  const q = query(
    collection(db, RESULTS_COLLECTION),
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc'),
    fsLimit(limit)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => hydrate(d.id, d.data()));
}

// STEM-107: Live leaderboard across all activities for a single team.
export function listenToTeamResults(teamId, callback, options = {}) {
  const { limit = 100 } = options;

  const q = query(
    collection(db, RESULTS_COLLECTION),
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc'),
    fsLimit(limit)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((d) => hydrate(d.id, d.data()));
      callback(rows, null);
    },
    (error) => {
      console.warn('listenToTeamResults error:', error);
      callback([], error);
    }
  );
}

// STEM-107: Normalize a Firestore doc into the same shape as resultsService output.
function hydrate(firestoreId, data) {
  return {
    firestoreId,
    activityId: data.activityId,
    teamId: data.teamId,
    userId: data.userId ?? null,
    teamName: data.teamName ?? null,
    payload: data.payload ?? {},
    createdAt: data.createdAt,
    serverCreatedAt: data.serverCreatedAt?.toMillis?.() ?? null,
    localId: data.localId ?? null,
  };
}

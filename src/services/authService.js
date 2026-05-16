// STEM-105: Replace mock auth with real Firebase Auth.

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'firebase/auth';
import { auth } from './firebase';

// STEM-105: Map Firebase error codes to friendly messages screens can show as-is.
const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account with that email already exists.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/user-not-found': 'Invalid email or password.',
  'auth/wrong-password': 'Invalid email or password.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/too-many-requests': 'Too many attempts. Try again in a moment.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/operation-not-allowed': 'Email sign-in is not enabled. Contact support.',
};

function friendlyError(err) {
  const msg = ERROR_MESSAGES[err?.code];
  return msg ? new Error(msg) : err;
}

export async function signUp(email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return { uid: cred.user.uid, email: cred.user.email };
  } catch (err) {
    throw friendlyError(err);
  }
}

export async function signIn(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { uid: cred.user.uid, email: cred.user.email };
  } catch (err) {
    throw friendlyError(err);
  }
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export function getCurrentUser() {
  const u = auth.currentUser;
  return u ? { uid: u.uid, email: u.email } : null;
}

// STEM-105: Pass-through to Firebase; returns unsubscribe fn (same contract as before).
export function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(auth, (user) => {
    callback(user ? { uid: user.uid, email: user.email } : null);
  });
}

// STEM-145-fix: Restored Expo-compatible env variables — react-native-config doesn't work with Expo.
//   Uses process.env.EXPO_PUBLIC_* which Expo SDK 54 injects at build time from .env.

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase config — values come from .env file (not committed to git)
// See .env.example for the list of required keys
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialise Firebase app
const app = initializeApp(firebaseConfig);

// Export the services we'll use elsewhere
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
import Config from 'react-native-config';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase config — values come from .env file (not committed to git)
// See .env.example for the list of required keys
const firebaseConfig = {
  apiKey: Config.FIREBASE_API_KEY,
  authDomain: Config.FIREBASE_AUTH_DOMAIN,
  projectId: Config.FIREBASE_PROJECT_ID,
  storageBucket: Config.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Config.FIREBASE_MESSAGING_SENDER_ID,
  appId: Config.FIREBASE_APP_ID,
};

// Initialise Firebase app
const app = initializeApp(firebaseConfig);

// Export the services we'll use elsewhere
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
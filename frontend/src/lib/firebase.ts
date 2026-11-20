import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasConfig = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

/** Null when env vars are absent (e.g. local dev without Firebase creds). */
export const firebaseApp: FirebaseApp | null = hasConfig ? initializeApp(firebaseConfig) : null;
export const firebaseAuth: Auth | null = hasConfig && firebaseApp ? getAuth(firebaseApp) : null;

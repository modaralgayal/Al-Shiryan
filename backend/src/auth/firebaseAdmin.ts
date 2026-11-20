import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

/**
 * Firebase is enabled only when a real service-account JSON is present.
 * Local dev / unit tests can run without credentials; the auth route returns
 * 503 when Firebase is not configured, and tests mock these functions.
 */
export const firebaseEnabled: boolean = (() => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  return !!raw && raw !== '' && raw !== '{}';
})();

let app: App | null = null;

function initApp(): App {
  if (app) return app;
  if (!firebaseEnabled) {
    throw new Error('Firebase is not configured (FIREBASE_SERVICE_ACCOUNT_JSON missing).');
  }
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!) as Record<string, unknown>;
  app =
    getApps().length > 0
      ? getApps()[0]!
      : initializeApp({ credential: cert(sa) });
  return app;
}

function auth(): Auth {
  return getAuth(initApp());
}

export async function verifyIdToken(idToken: string) {
  return auth().verifyIdToken(idToken);
}

export async function verifySessionCookie(cookie: string, checkRevoked = true) {
  return auth().verifySessionCookie(cookie, checkRevoked);
}

export async function createSessionCookie(idToken: string, expiresIn: number) {
  return auth().createSessionCookie(idToken, { expiresIn });
}

export async function setCustomUserClaims(uid: string, claims: Record<string, unknown>) {
  return auth().setCustomUserClaims(uid, claims);
}

export async function revokeRefreshTokens(uid: string) {
  return auth().revokeRefreshTokens(uid);
}

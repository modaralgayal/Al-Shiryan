import type { Response } from 'express';

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? '__aorta_session';

/**
 * Persistent, tamper-resistant session cookie. httpOnly + SameSite=Lax stops
 * client-side tampering and cross-site CSRF (cross-site POSTs never carry it),
 * while still being attached on same-site SPA→API calls (e.g. the Vite dev
 * server on :5173 calling the API on :3000). Secure is forced in production.
 */
export function setSessionCookie(res: Response, token: string): void {
  const maxAge = Number(process.env.SESSION_COOKIE_MAX_AGE_MS ?? 1_209_600_000); // 14 days
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { httpOnly: true, sameSite: 'lax', path: '/' });
}

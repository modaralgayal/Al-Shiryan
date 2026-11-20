import type { Response } from 'express';

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? '__aorta_session';

/**
 * Persistent, tamper-resistant session cookie. httpOnly + SameSite=Strict stops
 * client-side tampering and CSRF; Secure is forced in production.
 */
export function setSessionCookie(res: Response, token: string): void {
  const maxAge = Number(process.env.SESSION_COOKIE_MAX_AGE_MS ?? 1_209_600_000); // 14 days
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { httpOnly: true, path: '/' });
}

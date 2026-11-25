import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { verifySessionCookie } from '../auth/firebaseAdmin';
import { SESSION_COOKIE_NAME } from '../auth/session';
import type { Role } from '@aorta-iq/shared';

// Dev-only local testing without Firebase: trust a trusted header. It is NEVER
// active in production (NODE_ENV === 'production' disables it regardless) and only
// when explicitly opted in via DEV_AUTH_BYPASS=1. This mirrors the test harness.
const DEV_AUTH_BYPASS =
  process.env.DEV_AUTH_BYPASS === '1' && process.env.NODE_ENV !== 'production';

/**
 * Verifies the Firebase session cookie on every request, then re-loads the user
 * (with role) from the DB. Because we never store mutable app state in the
 * cookie, the session cannot become "corrupted" or stale — it is always
 * re-derived server-side. Roles come from the DB (mirrored to Firebase custom
 * claims) so a client cannot escalate by editing local storage.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (DEV_AUTH_BYPASS) {
    const raw = req.headers['x-dev-user'];
    if (typeof raw !== 'string') {
      res.status(401).json({ error: 'dev_auth_requires_x_dev_user' });
      return;
    }
    try {
      const u = JSON.parse(raw) as {
        id?: string;
        role?: string;
        email?: string;
        fullName?: string;
        doctorId?: string;
        pharmacistId?: string;
        createdAt?: string;
      };
      if (!u?.id || !u?.role) {
        res.status(401).json({ error: 'dev_auth_invalid_user' });
        return;
      }
      req.user = {
        id: String(u.id),
        firebaseUid: String(u.id),
        email: u.email ?? '',
        role: u.role as Role,
        fullName: u.fullName ?? '',
        status: 'active',
        invitedBy: null,
        doctorId: u.doctorId ?? null,
        pharmacistId: u.pharmacistId ?? null,
        createdAt: u.createdAt ?? new Date().toISOString(),
      };
      next();
      return;
    } catch {
      res.status(401).json({ error: 'dev_auth_invalid_json' });
      return;
    }
  }

  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }
  try {
    const decoded = await verifySessionCookie(token, true);
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, decoded.uid))
      .limit(1);
    const u = rows[0];
    if (!u || u.status === 'disabled' || u.deletedAt) {
      res.status(403).json({ error: 'no_access' });
      return;
    }
    req.user = {
      id: u.id,
      firebaseUid: u.firebaseUid,
      email: u.email,
      role: u.role,
      fullName: u.fullName,
      status: u.status as 'invited' | 'active' | 'disabled',
      invitedBy: u.invitedBy,
      doctorId: u.doctorId ?? null,
      pharmacistId: u.pharmacistId ?? null,
      createdAt: u.createdAt.toISOString(),
    };
    next();
  } catch {
    res.status(401).json({ error: 'invalid_session' });
  }
}

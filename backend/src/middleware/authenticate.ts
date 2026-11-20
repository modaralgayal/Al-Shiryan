import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { verifySessionCookie } from '../auth/firebaseAdmin';
import { SESSION_COOKIE_NAME } from '../auth/session';

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
    if (!u || u.status === 'disabled') {
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
      createdAt: u.createdAt.toISOString(),
    };
    next();
  } catch {
    res.status(401).json({ error: 'invalid_session' });
  }
}

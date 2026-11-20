import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import {
  verifyIdToken,
  createSessionCookie,
  setCustomUserClaims,
  revokeRefreshTokens,
  firebaseEnabled,
} from '../auth/firebaseAdmin';
import { setSessionCookie, clearSessionCookie } from '../auth/session';
import { authenticate } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import { loginSchema } from '@aorta-iq/shared';
import { redeemInvite } from '../services/inviteLinks';
import { audit } from '../services/auditLog';
import type { User } from '@aorta-iq/shared';

const registerSchema = z.object({
  idToken: z.string().min(1),
  inviteToken: z.string().min(1),
});

const SESSION_TTL_MS = Number(process.env.SESSION_COOKIE_MAX_AGE_MS ?? 1_209_600_000);

function toUser(u: typeof users.$inferSelect): User {
  return {
    id: u.id,
    firebaseUid: u.firebaseUid,
    email: u.email,
    role: u.role,
    fullName: u.fullName,
    status: u.status as User['status'],
    invitedBy: u.invitedBy,
    createdAt: u.createdAt.toISOString(),
  };
}

export const authRouter = Router();

// First sign-in via an invite link: redeem invite -> create user -> set role claim -> session.
authRouter.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    if (!firebaseEnabled) return res.status(503).json({ error: 'auth_unavailable' });
    const { idToken, inviteToken } = req.body as z.infer<typeof registerSchema>;
    const decoded = await verifyIdToken(idToken);
    const invite = await redeemInvite(inviteToken);

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, decoded.uid))
      .limit(1);
    let user = existing[0];
    if (!user) {
      const [created] = await db
        .insert(users)
        .values({
          firebaseUid: decoded.uid,
          email: (decoded.email ?? '').toLowerCase(),
          role: invite.role,
          fullName: decoded.name ?? '',
          status: 'active',
        })
        .returning();
      user = created!;
      await setCustomUserClaims(decoded.uid, { role: invite.role });
      await audit(user.id, 'user_registered', 'users', user.id, { role: invite.role });
    }
    const cookie = await createSessionCookie(idToken, SESSION_TTL_MS);
    setSessionCookie(res, cookie);
    res.json({ user: toUser(user) });
  } catch (e) {
    next(e);
  }
});

// Subsequent sign-ins.
authRouter.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    if (!firebaseEnabled) return res.status(503).json({ error: 'auth_unavailable' });
    const { idToken } = req.body as z.infer<typeof loginSchema>;
    const decoded = await verifyIdToken(idToken);
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, decoded.uid))
      .limit(1);
    const user = rows[0];
    if (!user) {
      return res
        .status(403)
        .json({ error: 'not_registered', hint: 'register via an invite link' });
    }
    const cookie = await createSessionCookie(idToken, SESSION_TTL_MS);
    setSessionCookie(res, cookie);
    res.json({ user: toUser(user) });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/logout', authenticate, async (req, res, next) => {
  try {
    if (firebaseEnabled) await revokeRefreshTokens(req.user!.firebaseUid);
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

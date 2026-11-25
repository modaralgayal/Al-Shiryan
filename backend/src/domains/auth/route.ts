import { Router } from 'express';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../db/client';
import { users } from '../../db/schema';
import {
  verifyIdToken,
  createSessionCookie,
  setCustomUserClaims,
  revokeRefreshTokens,
  firebaseEnabled,
} from '../../auth/firebaseAdmin';
import { setSessionCookie, clearSessionCookie } from '../../auth/session';
import { authenticate } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validate';
import { loginSchema } from '@aorta-iq/shared';
import { redeemInvite, peekInvite } from '../../services/inviteLinks';
import { audit } from '../../services/auditLog';
import type { User } from '@aorta-iq/shared';

const registerSchema = z.object({
  idToken: z.string().min(1),
  inviteToken: z.string().min(1),
  // Name + professional ID self-assigned at registration; role-dependent IDs are
  // required server-side (see the /register handler).
  fullName: z.string().min(1),
  doctorId: z.string().min(1).optional(),
  pharmacistId: z.string().min(1).optional(),
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
    doctorId: u.doctorId ?? null,
    pharmacistId: u.pharmacistId ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

export const authRouter = Router();

// Read-only: tell the register page which role this invite grants (so it can show
// the right professional-ID field). Does not redeem the invite.
authRouter.get('/invite/:token', async (req, res, next) => {
  try {
    const invite = await peekInvite(req.params.token!);
    if (!invite) return res.status(404).json({ error: 'invalid_invite' });
    res.json(invite);
  } catch (e) {
    next(e);
  }
});

// First sign-in via an invite link: redeem invite -> create user -> set role claim -> session.
authRouter.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    if (!firebaseEnabled) return res.status(503).json({ error: 'auth_unavailable' });
    const { idToken, inviteToken, fullName, doctorId, pharmacistId } =
      req.body as z.infer<typeof registerSchema>;
    const decoded = await verifyIdToken(idToken);
    const invite = await redeemInvite(inviteToken);

    // Professional ID is mandatory for the corresponding clinical role.
    if (invite.role === 'doctor' && !doctorId) {
      return res.status(400).json({ error: 'doctor_id_required' });
    }
    if (invite.role === 'pharmacist' && !pharmacistId) {
      return res.status(400).json({ error: 'pharmacist_id_required' });
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, decoded.uid))
      .limit(1);
    let user = existing[0];
    if (!user) {
      // A soft-deleted account leaves its row in place. Refuse to create a new
      // account with an email that is still taken by an active user, so two live
      // accounts can never share an email (the DB unique index is the hard guarantee).
      const emailLower = (decoded.email ?? '').toLowerCase();
      const [clash] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, emailLower), isNull(users.deletedAt)))
        .limit(1);
      if (clash) {
        return res.status(409).json({ error: 'email_already_registered' });
      }
      const [created] = await db
        .insert(users)
        .values({
          firebaseUid: decoded.uid,
          email: (decoded.email ?? '').toLowerCase(),
          role: invite.role,
          fullName: fullName?.trim() || decoded.name || '',
          doctorId: invite.role === 'doctor' ? doctorId! : null,
          pharmacistId: invite.role === 'pharmacist' ? pharmacistId! : null,
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

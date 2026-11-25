import { Router } from 'express';
import { desc, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/client';
import { users, prescriptions, patients } from '../../db/schema';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../auth/rbac';
import { validateBody } from '../../middleware/validate';
import { inviteCreateSchema } from '@aorta-iq/shared';
import { createInvite } from '../../services/inviteLinks';
import { audit } from '../../services/auditLog';
import { isAdminInviteAllowed } from '../../lib/access';
import { deleteUser, firebaseEnabled } from '../../auth/firebaseAdmin';

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole('admin'));

// Admin sends single-use, expiring invite links to register Doctors / Pharmacists.
adminRouter.post('/invites', validateBody(inviteCreateSchema), async (req, res, next) => {
  try {
    // Admin role is gated by the email allowlist (contract: email allowlist for Admin).
    if (req.body.role === 'admin' && !isAdminInviteAllowed(req.body.email, process.env.ADMIN_EMAIL_ALLOWLIST)) {
      return res.status(403).json({ error: 'admin_invite_not_allowed' });
    }
    const token = await createInvite({
      role: req.body.role,
      email: req.body.email,
      createdBy: req.user!.id,
    });
    const link = `${process.env.CLIENT_ORIGIN ?? ''}/register?token=${token}`;
    await audit(req.user!.id, 'invite_created', 'invite_links', undefined, {
      role: req.body.role,
    });
    res.json({ token, inviteLink: link });
  } catch (e) {
    next(e);
  }
});

// Admin views all registered accounts (never the soft-deleted ones).
adminRouter.get('/accounts', async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(desc(users.createdAt));
    res.json({ accounts: rows });
  } catch (e) {
    next(e);
  }
});

// Admin deletes an account. Soft-delete (sets deletedAt) to respect the schema's
// RESTRICT foreign keys + BEFORE DELETE guard triggers. Self-deletion is refused.
adminRouter.delete('/accounts/:id', async (req, res, next) => {
  try {
    const targetId = req.params.id!;
    if (targetId === req.user!.id) {
      return res.status(403).json({ error: 'cannot_delete_self' });
    }
    const [existing] = await db
      .select({ id: users.id, deletedAt: users.deletedAt, firebaseUid: users.firebaseUid })
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1);
    if (!existing || existing.deletedAt) {
      return res.status(404).json({ error: 'not_found' });
    }
    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, targetId));
    await audit(req.user!.id, 'account_deleted', 'users', targetId, {});
    // Also delete the Firebase Auth user so the email is freed for re-registration.
    // Best-effort: a Firebase failure must not roll back the DB soft-delete.
    if (firebaseEnabled) {
      try {
        await deleteUser(existing.firebaseUid);
      } catch (e) {
        console.error(`[admin] failed to delete Firebase user ${existing.firebaseUid}:`, e);
      }
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Admin views patients in a LIMITED manner (contract): identity + visit summary
// only — never contact details or the full sections JSONB.
adminRouter.get('/patients', async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: patients.id,
        patientId: patients.patientId,
        name: patients.name,
        age: patients.age,
        gender: patients.gender,
        dateOfBirth: patients.dateOfBirth,
        weightKg: patients.weightKg,
      })
      .from(patients)
      .orderBy(desc(patients.createdAt));
    res.json({ patients: rows });
  } catch (e) {
    next(e);
  }
});

// Admin views ALL prescriptions, but with intentionally minimal detail: only the
// code, the (anonymous) patient id, the prescriber, status and date. No drugs, no
// signature, no contact / allergy / instruction PHI (contract: admin = oversight,
// not clinical detail).
adminRouter.get('/prescriptions', async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: prescriptions.id,
        prescriptionCode: prescriptions.prescriptionCode,
        patientId: prescriptions.patientId,
        doctorFullName: prescriptions.doctorFullName,
        status: prescriptions.status,
        issuedAt: prescriptions.issuedAt,
      })
      .from(prescriptions)
      .where(isNull(prescriptions.deletedAt))
      .orderBy(desc(prescriptions.issuedAt));
    res.json({ prescriptions: rows });
  } catch (e) {
    next(e);
  }
});

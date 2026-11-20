import { Router } from 'express';
import { desc } from 'drizzle-orm';
import { db } from '../db/client';
import { users, prescriptions } from '../db/schema';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../auth/rbac';
import { validateBody } from '../middleware/validate';
import { inviteCreateSchema } from '@aorta-iq/shared';
import { createInvite } from '../services/inviteLinks';
import { audit } from '../services/auditLog';

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole('admin'));

// Admin sends single-use, expiring invite links to register Doctors / Pharmacists.
adminRouter.post('/invites', validateBody(inviteCreateSchema), async (req, res, next) => {
  try {
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

// Admin views all registered accounts.
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
      .orderBy(desc(users.createdAt));
    res.json({ accounts: rows });
  } catch (e) {
    next(e);
  }
});

// Admin views prescriptions + related data. Patient PII is intentionally NOT
// returned here (contract: admin sees limited data, no details).
adminRouter.get('/prescriptions', async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(prescriptions)
      .orderBy(desc(prescriptions.issuedAt));
    res.json({ prescriptions: rows });
  } catch (e) {
    next(e);
  }
});

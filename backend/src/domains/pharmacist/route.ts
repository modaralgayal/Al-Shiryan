import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../auth/rbac';
import { validateBody } from '../../middleware/validate';
import { audit } from '../../services/auditLog';
import { dispenseInputSchema } from '@aorta-iq/shared';
import { dispense } from './service';
import { listFulfillablePrescriptions } from '../prescriptions/service';

export const pharmacistRouter = Router();
pharmacistRouter.use(authenticate, requireRole('pharmacist'));

// List prescriptions awaiting / partially through fulfillment. No patient PHI:
// only the patient's name (for counter identification) plus the drug lines needed
// to dispense. `?q=` filters by patient name (case-insensitive).
pharmacistRouter.get('/prescriptions', async (req, res, next) => {
  try {
    const q =
      typeof req.query.q === 'string' && req.query.q.trim().length > 0
        ? req.query.q.trim()
        : undefined;
    const rxs = await listFulfillablePrescriptions(q);
    await audit(req.user!.id, 'prescription_viewed', 'prescriptions', undefined, {
      fulfillable: true,
      q: q ?? null,
    });
    res.json({ prescriptions: rxs });
  } catch (e) {
    next(e);
  }
});

// Partial dispense. Pharmacist identity is the authenticated user, not the body.
pharmacistRouter.post(
  '/prescriptions/:id/dispense',
  validateBody(dispenseInputSchema),
  async (req, res, next) => {
    try {
      const { itemIds } = req.body as { itemIds: string[] };
      const result = await dispense(req.user!.id, req.params.id!, itemIds);
      res.json({ status: result.status });
    } catch (e) {
      next(e);
    }
  },
);

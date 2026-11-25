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

// List prescriptions awaiting / partially through fulfillment. No patient PII.
pharmacistRouter.get('/prescriptions', async (req, res, next) => {
  try {
    const rxs = await listFulfillablePrescriptions();
    await audit(req.user!.id, 'prescription_viewed', 'prescriptions', undefined, { fulfillable: true });
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

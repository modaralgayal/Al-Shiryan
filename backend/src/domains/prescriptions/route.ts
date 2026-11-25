import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../auth/rbac';
import { validateBody } from '../../middleware/validate';
import { audit } from '../../services/auditLog';
import { prescriptionCreateSchema, prescriptionReviseSchema } from '@aorta-iq/shared';
import {
  createPrescription,
  listPrescriptions,
  getPrescription,
  cancelPrescription,
  revisePrescription,
} from './service';

export const prescriptionsRouter = Router();
prescriptionsRouter.use(authenticate);

// Only doctors write prescriptions.
prescriptionsRouter.post(
  '/',
  requireRole('doctor'),
  validateBody(prescriptionCreateSchema),
  async (req, res, next) => {
    try {
      const rx = await createPrescription(req.body, req.user!.id);
      res.status(201).json({ prescription: rx });
    } catch (e) {
      next(e);
    }
  },
);

// doctor -> own; admin -> all (limited patient data); pharmacist -> all (no PHI).
// Optional ?patientId= narrows to one patient (doctor's workspace).
prescriptionsRouter.get('/', async (req, res, next) => {
  try {
    const patientId =
      typeof req.query.patientId === 'string' && req.query.patientId.length > 0
        ? req.query.patientId
        : undefined;
    const rxs = await listPrescriptions(req.user!.role, req.user!.id, patientId);
    // Every PHI read is audited (S2 exit criteria).
    await audit(req.user!.id, 'prescription_viewed', 'prescriptions', undefined, { list: true });
    res.json({ prescriptions: rxs });
  } catch (e) {
    next(e);
  }
});

prescriptionsRouter.get('/:id', async (req, res, next) => {
  try {
    const rx = await getPrescription(req.params.id!, req.user!.role);
    if (!rx) return res.status(404).json({ error: 'not_found' });
    await audit(req.user!.id, 'prescription_viewed', 'prescriptions', req.params.id!, {});
    res.json({ prescription: rx });
  } catch (e) {
    next(e);
  }
});

prescriptionsRouter.patch('/:id/cancel', requireRole('doctor', 'admin'), async (req, res, next) => {
  try {
    const rx = await cancelPrescription(req.params.id!, req.user!.id);
    if (!rx) return res.status(404).json({ error: 'not_found' });
    res.json({ prescription: rx });
  } catch (e) {
    next(e);
  }
});

// Correction: new version; original is cancelled + audited.
prescriptionsRouter.post(
  '/:id/revise',
  requireRole('doctor'),
  validateBody(prescriptionReviseSchema),
  async (req, res, next) => {
    try {
      const rx = await revisePrescription(req.params.id!, req.body, req.user!.id);
      if (!rx) return res.status(404).json({ error: 'not_found' });
      res.status(201).json({ prescription: rx });
    } catch (e) {
      next(e);
    }
  },
);

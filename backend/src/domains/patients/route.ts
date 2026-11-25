import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../auth/rbac';
import { validateBody, validateQuery } from '../../middleware/validate';
import { patientCreateSchema, patientUpdateSchema, patientListQuerySchema } from '@aorta-iq/shared';
import { createPatient, listPatients, getPatientRow, updatePatient } from './service';
import { audit } from '../../services/auditLog';

export const patientsRouter = Router();

// PHI: doctor + admin only. A pharmacist hitting any patient endpoint gets 403
// at the resolver — not merely hidden in the UI.
patientsRouter.use(authenticate, requireRole('doctor', 'admin'));

patientsRouter.post('/', validateBody(patientCreateSchema), async (req, res, next) => {
  try {
    const row = await createPatient(req.body, req.user!.id);
    res.status(201).json({ patient: row });
  } catch (e) {
    next(e);
  }
});

patientsRouter.get('/', validateQuery(patientListQuerySchema), async (req, res, next) => {
  try {
    const { q } = req.query as { q?: string };
    const rows = await listPatients({ q });
    await audit(req.user!.id, 'patient_view', 'patients', undefined, { list: true });
    res.json({ patients: rows });
  } catch (e) {
    next(e);
  }
});

patientsRouter.get('/:id', async (req, res, next) => {
  try {
    const row = await getPatientRow(req.params.id!);
    if (!row) return res.status(404).json({ error: 'not_found' });
    await audit(req.user!.id, 'patient_view', 'patients', row.id, { patientId: row.patientId });
    res.json({ patient: row });
  } catch (e) {
    next(e);
  }
});

patientsRouter.patch('/:id', validateBody(patientUpdateSchema), async (req, res, next) => {
  try {
    const row = await updatePatient(req.params.id!, req.body, req.user!.id);
    if (!row) return res.status(404).json({ error: 'not_found' });
    res.json({ patient: row });
  } catch (e) {
    next(e);
  }
});

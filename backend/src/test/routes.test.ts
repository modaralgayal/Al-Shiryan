import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Inject a fake user via header so we can exercise RBAC without Firebase.
vi.mock('../middleware/authenticate', () => ({
  authenticate: (req: any, res: any, next: any) => {
    const raw = req.headers['x-user'];
    if (!raw) return res.status(401).json({ error: 'unauthenticated' });
    req.user = JSON.parse(raw);
    next();
  },
}));
vi.mock('../domains/patients/service', () => ({
  createPatient: vi.fn(),
  listPatients: vi.fn(async () => [
    {
      id: 'p1',
      name: 'Jane',
      patientId: 'MRN1',
      age: 30,
      gender: 'female',
      phone: '1',
      emergencyContact: '2',
      dateOfBirth: null,
      idNumber: null,
      weightKg: null,
      sections: {},
      createdAt: new Date().toISOString(),
      createdBy: 'd1',
    },
  ]),
  getPatientRow: vi.fn(),
  updatePatient: vi.fn(),
}));
vi.mock('../domains/prescriptions/service', () => ({
  createPrescription: vi.fn(),
  listPrescriptions: vi.fn(async () => []),
  getPrescription: vi.fn(),
  cancelPrescription: vi.fn(),
  revisePrescription: vi.fn(),
  listFulfillablePrescriptions: vi.fn(async () => []),
  makePrescriptionCode: vi.fn(() => 'RX-2026-000001'),
}));
vi.mock('../domains/pharmacist/service', () => ({
  dispense: vi.fn(async () => ({ status: 'partial' })),
}));
vi.mock('../services/inviteLinks', () => ({
  createInvite: vi.fn(async () => 'tok'),
}));
vi.mock('../services/auditLog', () => ({ audit: vi.fn(async () => {}) }));

import { createApp } from '../core/bootstrap';
import { audit } from '../services/auditLog';

const app = createApp();
const UID = '3f1c2b3a-1a2b-4c3d-8e5f-1234567890ab';
const user = (role: string, id = 'u1') =>
  JSON.stringify({ id, role, email: 'e@x.com', fullName: '', status: 'active', invitedBy: null, createdAt: new Date().toISOString() });

describe('S2 route guards & flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pharmacist is blocked from PHI at the resolver (403)', async () => {
    const res = await request(app).get('/api/patients').set('x-user', user('pharmacist'));
    expect(res.status).toBe(403);
  });

  it('doctor may list patients (200)', async () => {
    const res = await request(app).get('/api/patients').set('x-user', user('doctor'));
    expect(res.status).toBe(200);
    expect(res.body.patients).toHaveLength(1);
  });

  it('admin invite allowed when no allowlist is set (200)', async () => {
    delete process.env.ADMIN_EMAIL_ALLOWLIST;
    const res = await request(app)
      .post('/api/admin/invites')
      .set('x-user', user('admin'))
      .send({ role: 'admin', email: 'a@b.com' });
    expect(res.status).toBe(200);
  });

  it('admin invite blocked when email not on allowlist (403)', async () => {
    process.env.ADMIN_EMAIL_ALLOWLIST = 'boss@x.com';
    const res = await request(app)
      .post('/api/admin/invites')
      .set('x-user', user('admin'))
      .send({ role: 'admin', email: 'stranger@x.com' });
    expect(res.status).toBe(403);
    process.env.ADMIN_EMAIL_ALLOWLIST = '';
  });

  it('pharmacist dispense returns recomputed status (200)', async () => {
    const res = await request(app)
      .post(`/api/pharmacist/prescriptions/rx1/dispense`)
      .set('x-user', user('pharmacist'))
      .send({ pharmacistId: UID, itemIds: [UID] });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('partial');
  });

  it('file presign rejects a disallowed content type (400)', async () => {
    const res = await request(app)
      .post('/api/files/presign-upload')
      .set('x-user', user('doctor'))
      .send({ fileName: 'x.exe', contentType: 'application/octet-stream', size: 10 });
    expect(res.status).toBe(400);
  });

  it('audits a prescription read as PHI access (prescription_viewed)', async () => {
    const res = await request(app).get('/api/prescriptions').set('x-user', user('doctor'));
    expect(res.status).toBe(200);
    expect(audit).toHaveBeenCalledWith(
      expect.any(String),
      'prescription_viewed',
      'prescriptions',
      undefined,
      expect.anything(),
    );
  });
});

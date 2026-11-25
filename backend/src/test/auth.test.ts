import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../auth/firebaseAdmin', () => ({
  firebaseEnabled: true,
  verifyIdToken: vi.fn(async () => ({ uid: 'u1', email: 'd@x.com' })),
  createSessionCookie: vi.fn(async () => 'cookie'),
  setCustomUserClaims: vi.fn(async () => {}),
  revokeRefreshTokens: vi.fn(async () => {}),
  deleteUser: vi.fn(async () => {}),
}));
vi.mock('../services/inviteLinks', () => ({
  redeemInvite: vi.fn(async () => ({ role: 'doctor', email: null })),
  peekInvite: vi.fn(async () => ({ role: 'doctor', email: 'a@b.com' })),
}));
vi.mock('../services/auditLog', () => ({ audit: vi.fn(async () => {}) }));

const { db, makeChain } = vi.hoisted(() => {
  const chainRows = (rows: any[]) => {
    const p: any = Promise.resolve(rows);
    p.limit = () => Promise.resolve(rows);
    p.orderBy = () => Promise.resolve(rows);
    return p;
  };
  const makeChain = (rows: any[]) => ({
    from: () => ({ where: () => chainRows(rows), orderBy: () => chainRows(rows) }),
  });
  const db: any = {
    select: vi.fn(() => makeChain([])),
    update: vi.fn(() => ({ set: () => ({ where: () => Promise.resolve([{}]) }) })),
    insert: vi.fn(() => ({ values: () => ({ returning: () => Promise.resolve([{}]) }) })),
  };
  return { db, makeChain };
});
vi.mock('../db/client', () => ({ db, pool: { end: () => {} } }));

import { createApp } from '../core/bootstrap';
import { redeemInvite, peekInvite } from '../services/inviteLinks';

const app = createApp();

describe('registration identity lock', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires a doctor ID for doctor registration (400 doctor_id_required)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ idToken: 'tok', inviteToken: 'it', fullName: 'Dr' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('doctor_id_required');
  });

  it('requires a pharmacist ID for pharmacist registration (400 pharmacist_id_required)', async () => {
    (redeemInvite as any).mockImplementationOnce(async () => ({ role: 'pharmacist', email: null }));
    const res = await request(app)
      .post('/api/auth/register')
      .send({ idToken: 'tok', inviteToken: 'it', fullName: 'Ph' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('pharmacist_id_required');
  });

  it('reads the invite role from the token (not the body)', async () => {
    (peekInvite as any).mockImplementationOnce(async () => ({ role: 'pharmacist', email: 'p@x.com' }));
    const res = await request(app).get('/api/auth/invite/abc');
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('pharmacist');
    expect(res.body.email).toBe('p@x.com');
  });

  it('rejects registration when the email is taken by an active user (409)', async () => {
    db.select
      .mockImplementationOnce(() => makeChain([])) // no existing firebaseUid match
      .mockImplementationOnce(() => makeChain([{ id: 'other' }])); // email clash
    const res = await request(app)
      .post('/api/auth/register')
      .send({ idToken: 'tok', inviteToken: 'it', fullName: 'Dr', doctorId: 'DOC-1' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('email_already_registered');
  });
});

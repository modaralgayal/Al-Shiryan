import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Inject a fake admin user via header (mirrors S2 route-guard tests).
vi.mock('../middleware/authenticate', () => ({
  authenticate: (req: any, res: any, next: any) => {
    const raw = req.headers['x-user'];
    if (!raw) return res.status(401).json({ error: 'unauthenticated' });
    req.user = JSON.parse(raw);
    next();
  },
}));
vi.mock('../services/auditLog', () => ({ audit: vi.fn(async () => {}) }));
vi.mock('../services/inviteLinks', () => ({ createInvite: vi.fn(async () => 'tok') }));
vi.mock('../auth/firebaseAdmin', () => ({
  firebaseEnabled: true,
  deleteUser: vi.fn(async () => {}),
}));

// Chainable drizzle-style stub: `.where()`/`.orderBy()` are awaitable and also
// expose `.limit()`/`.orderBy()`. Built via hoisted so the vi.mock factory can
// reference the same instance the tests manipulate.
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
import { deleteUser } from '../auth/firebaseAdmin';
import { audit } from '../services/auditLog';

const app = createApp();
const user = (role: string, id = 'u1') =>
  JSON.stringify({
    id,
    role,
    email: 'e@x.com',
    fullName: '',
    status: 'active',
    invitedBy: null,
    createdAt: new Date().toISOString(),
  });

describe('admin accounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses to delete itself (403 cannot_delete_self)', async () => {
    const res = await request(app)
      .delete('/api/admin/accounts/u1')
      .set('x-user', user('admin', 'u1'));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('cannot_delete_self');
    expect(deleteUser).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it('soft-deletes another account and deletes its Firebase user (200)', async () => {
    db.select.mockImplementationOnce(() => makeChain([{ id: 'u2', deletedAt: null, firebaseUid: 'fb-u2' }]));
    const res = await request(app)
      .delete('/api/admin/accounts/u2')
      .set('x-user', user('admin', 'u1'));
    expect(res.status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith('fb-u2');
    expect(audit).toHaveBeenCalledWith('u1', 'account_deleted', 'users', 'u2', {});
  });

  it('returns 404 for a missing or already-deleted account', async () => {
    db.select.mockImplementationOnce(() => makeChain([]));
    const res = await request(app)
      .delete('/api/admin/accounts/nope')
      .set('x-user', user('admin', 'u1'));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });
});

describe('admin prescription oversight view', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns only limited columns — no items/notes/PHI', async () => {
    db.select.mockImplementationOnce(() =>
      makeChain([
        {
          id: 'rx1',
          prescriptionCode: 'RX-2026-1',
          patientId: 'p1',
          doctorFullName: 'Dr X',
          status: 'active',
          issuedAt: new Date(),
        },
      ]),
    );
    const res = await request(app).get('/api/admin/prescriptions').set('x-user', user('admin'));
    expect(res.status).toBe(200);
    const rx = res.body.prescriptions[0];
    expect(rx.doctorFullName).toBe('Dr X');
    expect(rx).not.toHaveProperty('items');
    expect(rx).not.toHaveProperty('notes');
    expect(rx).not.toHaveProperty('electronicSignature');
    expect(rx).not.toHaveProperty('hospitalName');
  });
});

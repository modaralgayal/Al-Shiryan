import { describe, it, expect, vi, beforeEach } from 'vitest';

// Verify the prescription service re-derives the prescriber's identity from the
// authenticated user (server is the source of truth), so a client cannot spoof
// the doctor's name/license on a prescription.
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
vi.mock('../services/auditLog', () => ({ audit: vi.fn(async () => {}) }));

import { createPrescription } from '../domains/prescriptions/service';

const rxRow = {
  id: 'rx1',
  prescriptionCode: 'RX-2026-1',
  patientId: 'p1',
  doctorId: 'u-doc',
  status: 'active' as const,
  notes: 'n',
  doctorFullName: 'Dr X',
  doctorLicenseId: 'DOC-9',
  hospitalName: 'H',
  doctorContactNumber: '123',
  drugAllergies: 'none',
  medicationInstructions: 'm',
  electronicSignature: 'SIG',
  issuedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('createPrescription — server-side identity lock', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carries the doctor license id resolved from the users table, not the body', async () => {
    db.select
      .mockImplementationOnce(() => makeChain([{ id: 'drug1' }])) // drug validation
      .mockImplementationOnce(() => makeChain([{ fullName: 'Dr X', doctorId: 'DOC-9' }])) // users re-derivation
      .mockImplementationOnce(() => makeChain([rxRow])) // getPrescription: prescription row
      .mockImplementationOnce(() => makeChain([])); // getPrescription: items

    const rx = await createPrescription(
      {
        patientId: 'p1',
        items: [{ drugId: 'drug1', dose: '1', amount: 1 }],
        doctorFullName: 'ATTEMPTED SPOOF',
        doctorLicenseId: 'ATTEMPTED-SPOOF',
        notes: 'n',
        hospitalName: 'H',
        doctorContactNumber: '123',
        drugAllergies: 'none',
        medicationInstructions: 'm',
        electronicSignature: 'SIG',
      } as any,
      'u-doc',
    );

    expect(rx.doctorFullName).toBe('Dr X'); // from DB, not the spoofed body
    expect(rx.doctorLicenseId).toBe('DOC-9'); // from DB, not the spoofed body
  });
});

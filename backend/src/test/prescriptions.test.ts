import { describe, it, expect } from 'vitest';
import { makePrescriptionCode, drugsAccountedFor, serialize } from '../domains/prescriptions/service';

describe('makePrescriptionCode', () => {
  it('has the RX-<year>-<6 digits> shape', () => {
    expect(makePrescriptionCode()).toMatch(/^RX-\d{4}-\d{6}$/);
  });
  it('produces varied codes', () => {
    const set = new Set(Array.from({ length: 25 }, () => makePrescriptionCode()));
    expect(set.size).toBeGreaterThan(1);
  });
});

describe('drugsAccountedFor (server-side drug re-validation)', () => {
  it('true when every requested drug exists', () => {
    expect(drugsAccountedFor([{ id: 'a' }, { id: 'b' }], ['a', 'b'])).toBe(true);
  });
  it('false when one is missing', () => {
    expect(drugsAccountedFor([{ id: 'a' }], ['a', 'b'])).toBe(false);
  });
  it('false on duplicates / fewer unique found', () => {
    expect(drugsAccountedFor([{ id: 'a' }, { id: 'a' }], ['a', 'b'])).toBe(false);
  });
});

describe('serialize — role-aware PHI stripping', () => {
  const rx = {
    id: 'r1',
    prescriptionCode: 'RX-2026-1',
    patientId: 'p1',
    doctorId: 'd1',
    status: 'active' as const,
    notes: 'secret notes',
    doctorFullName: 'Dr X',
    doctorLicenseId: 'DOC-1',
    hospitalName: 'H',
    doctorContactNumber: '123',
    drugAllergies: 'none',
    medicationInstructions: 'take',
    electronicSignature: 'SIG',
    issuedAt: new Date('2026-01-01T00:00:00Z'),
  };
  const items = [
    { id: 'i1', drugId: 'drug1', dose: '1', amount: 1, status: 'pending', givenBy: null, givenAt: null },
  ];

  it('admin sees an oversight-only view: no items, notes, signature, or contact PHI', () => {
    const out = serialize(rx as any, items as any, 'admin');
    expect(out.items).toEqual([]);
    expect(out.notes).toBeNull();
    expect(out.electronicSignature).toBeNull();
    expect(out.hospitalName).toBeNull();
    expect(out.doctorContactNumber).toBeNull();
    expect(out.drugAllergies).toBeNull();
    expect(out.medicationInstructions).toBeNull();
    // Prescriber identity is retained (it is not patient PHI).
    expect(out.doctorFullName).toBe('Dr X');
    expect(out.doctorLicenseId).toBe('DOC-1');
  });

  it('doctor sees the full clinical record including signature and line-items', () => {
    const out = serialize(rx as any, items as any, 'doctor');
    expect(out.items).toHaveLength(1);
    expect(out.notes).toBe('secret notes');
    expect(out.electronicSignature).toBe('SIG');
  });

  it('pharmacist sees line-items but never the doctor-only signature', () => {
    const out = serialize(rx as any, items as any, 'pharmacist');
    expect(out.items).toHaveLength(1);
    expect(out.electronicSignature).toBeNull();
    expect(out.doctorFullName).toBe('Dr X');
  });

  it('includes patientName and item drugName for the pharmacist fulfillable view', () => {
    const out = serialize(
      { ...rx, patientId: 'p1' } as any,
      [{ ...items[0], drugName: 'Paracetamol' } as any],
      'pharmacist',
      'Jane Doe',
    );
    expect(out.patientName).toBe('Jane Doe');
    expect(out.items[0]?.drugName).toBe('Paracetamol');
  });
});


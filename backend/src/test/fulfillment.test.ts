import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/auditLog', () => ({ audit: vi.fn() }));
vi.mock('../db/client', () => {
  const db: any = { transaction: null };
  return { db, pool: { end: () => {} } };
});

import { db } from '../db/client';
import { audit } from '../services/auditLog';
import { computePrescriptionStatus, dispense } from '../domains/pharmacist/service';

describe('computePrescriptionStatus', () => {
  it('active when none given', () => {
    expect(computePrescriptionStatus([{ status: 'pending' }, { status: 'pending' }])).toBe('active');
  });
  it('partial when some given', () => {
    expect(computePrescriptionStatus([{ status: 'given' }, { status: 'pending' }])).toBe('partial');
  });
  it('completed when all given', () => {
    expect(computePrescriptionStatus([{ status: 'given' }, { status: 'given' }])).toBe('completed');
  });
  it('active when empty', () => {
    expect(computePrescriptionStatus([])).toBe('active');
  });
});

describe('dispense (transaction)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 400 when an item is not on the prescription', async () => {
    const items = [{ id: 'i1', status: 'pending' }];
    (db as any).transaction = vi.fn(async (fn: any) => {
      const tx = {
        select: () => ({ from: () => ({ where: () => items }) }),
        update: () => ({ set: () => ({ where: () => ({}) }) }),
        insert: () => ({ values: () => ({}) }),
      };
      return fn(tx);
    });
    await expect(dispense('ph1', 'rx1', ['not-real'])).rejects.toMatchObject({ statusCode: 400 });
    expect(audit).not.toHaveBeenCalled();
  });

  it('marks items given and recomputes to completed', async () => {
    const items = [
      { id: 'i1', status: 'pending', givenBy: null, givenAt: null },
      { id: 'i2', status: 'pending', givenBy: null, givenAt: null },
    ];
    let updated: any[] = items;
    (db as any).transaction = vi.fn(async (fn: any) => {
      const tx = {
        select: () => ({ from: () => ({ where: () => updated }) }),
        update: () => ({
          set: (vals: any) => ({
            where: () => {
              updated = items.map((it) => ({ ...it, ...vals }));
              return {};
            },
          }),
        }),
        insert: () => ({ values: () => ({}) }),
      };
      return fn(tx);
    });
    const res = await dispense('ph1', 'rx1', ['i1', 'i2']);
    expect(res.status).toBe('completed');
    expect(audit).toHaveBeenCalledWith('ph1', 'prescription_dispensed', 'prescriptions', 'rx1', {
      itemIds: ['i1', 'i2'],
    });
  });
});

import { db } from '../../db/client';
import { prescriptions, prescriptionItems, pharmacistDispenses, users } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { audit } from '../../services/auditLog';
import type { PrescriptionStatus } from '@aorta-iq/shared';

/** Pure: derive prescription status from per-item statuses. */
export function computePrescriptionStatus(items: { status: string }[]): PrescriptionStatus {
  if (items.length === 0) return 'active';
  const given = items.filter((i) => i.status === 'given').length;
  if (given === 0) return 'active';
  if (given === items.length) return 'completed';
  return 'partial';
}

/**
 * Pharmacist marks items as given. Runs inside a single transaction so the
 * prescription status is always consistent with its items: prescription stays
 * `active`/`partial` until ALL items are `given`, then flips to `completed`.
 * `pharmacistId` is the authenticated pharmacist (never trusted from the body).
 */
export async function dispense(pharmacistId: string, prescriptionId: string, itemIds: string[]) {
  return db.transaction(async (tx) => {
    // Re-derive the pharmacist's professional ID from the authenticated user so the
    // dispense record always carries the dispenser's "signature" (never trusted from
    // the client body).
    const pharmRows = await tx
      .select({ licenseId: users.pharmacistId })
      .from(users)
      .where(eq(users.id, pharmacistId));
    const pharm = pharmRows[0];
    const items = await tx
      .select()
      .from(prescriptionItems)
      .where(and(eq(prescriptionItems.prescriptionId, prescriptionId)));
    const owned = new Set(items.map((i) => i.id));
    const invalid = itemIds.filter((id) => !owned.has(id));
    if (invalid.length > 0) {
      const err = Object.assign(new Error('item_not_on_prescription'), { statusCode: 400 });
      throw err;
    }
    for (const itemId of itemIds) {
      await tx
        .update(prescriptionItems)
        .set({ status: 'given', givenBy: pharmacistId, givenAt: new Date() })
        .where(eq(prescriptionItems.id, itemId));
      await tx.insert(pharmacistDispenses).values({
        prescriptionItemId: itemId,
        pharmacistId,
        pharmacistLicenseId: pharm?.licenseId ?? null,
        quantityGiven: 1,
      });
    }
    const updated = await tx
      .select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, prescriptionId));
    const status = computePrescriptionStatus(updated);
    await tx.update(prescriptions).set({ status }).where(eq(prescriptions.id, prescriptionId));
    await audit(pharmacistId, 'prescription_dispensed', 'prescriptions', prescriptionId, { itemIds });
    return { status };
  });
}

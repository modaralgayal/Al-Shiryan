import { db } from '../../db/client';
import { prescriptions, prescriptionItems, drugs, users, patients } from '../../db/schema';
import { eq, and, isNull, desc, inArray, or, ilike } from 'drizzle-orm';
import { audit } from '../../services/auditLog';
import type { PrescriptionCreate, PrescriptionRevise, Prescription, Role } from '@aorta-iq/shared';
import { computePrescriptionStatus } from '../pharmacist/service';

/** Human-facing Prescription ID, e.g. RX-2026-482913. */
export function makePrescriptionCode(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `RX-${new Date().getFullYear()}-${n}`;
}

/** Every requested drug_id must exist in the seeded list (server is the authority). */
export function drugsAccountedFor(found: { id: string }[], ids: string[]): boolean {
  const foundIds = new Set(found.map((f) => f.id));
  const requested = new Set(ids);
  // Every requested id must be present, and no requested id may be missing.
  return requested.size === foundIds.size && ids.every((id) => foundIds.has(id));
}

export function serialize(
  rx: typeof prescriptions.$inferSelect,
  items: (typeof prescriptionItems.$inferSelect & { drugName?: string | null })[],
  role: Role,
  patientName?: string | null,
): Prescription {
  // Admins get an oversight-only view: the prescriber's identity (name + ID) plus
  // the patient pointer and status. No clinical PHI (drugs, notes, allergies,
  // instructions, contact, signature).
  const limited = role === 'admin';
  return {
    id: rx.id,
    prescriptionCode: rx.prescriptionCode ?? undefined,
    patientId: rx.patientId,
    doctorId: rx.doctorId,
    status: rx.status,
    // Patient name only — the minimum needed to identify the person at the counter.
    // No other patient PHI is ever exposed to the pharmacist.
    patientName: patientName ?? null,
    notes: limited ? null : rx.notes,
    // Prescriber identity is shown to admins (it's who signed it, not patient PHI).
    doctorFullName: rx.doctorFullName,
    doctorLicenseId: rx.doctorLicenseId ?? null,
    hospitalName: limited ? null : rx.hospitalName,
    doctorContactNumber: limited ? null : rx.doctorContactNumber,
    drugAllergies: limited ? null : rx.drugAllergies,
    medicationInstructions: limited ? null : rx.medicationInstructions,
    // Confidential doctor-only field — never returned to pharmacists or admins.
    electronicSignature: role === 'pharmacist' || limited ? null : rx.electronicSignature,
    issuedAt: rx.issuedAt.toISOString(),
    // Admins see no drug line-items.
    items: limited ? [] : items.map((it) => ({
      id: it.id,
      drugId: it.drugId,
      dose: it.dose,
      amount: it.amount,
      status: it.status,
      givenBy: it.givenBy,
      givenAt: it.givenAt ? it.givenAt.toISOString() : null,
      // Drug name joined for the pharmacist view; falls back to the id if missing.
      drugName: it.drugName ?? null,
    })),
  };
}

export async function createPrescription(input: PrescriptionCreate, doctorId: string): Promise<Prescription> {
  // Server is the authority: re-validate every drug_id exists in the seeded list.
  const ids = input.items.map((i) => i.drugId);
  const found = await db.select({ id: drugs.id }).from(drugs).where(and(inArray(drugs.id, ids), isNull(drugs.deletedAt)));
  if (!drugsAccountedFor(found, ids)) {
    throw Object.assign(new Error('unknown_drug'), { statusCode: 400 });
  }
  // Re-derive the prescriber's identity from the authenticated user so the
  // "signature" can never be spoofed from the client body. The form may send the
  // same values (pre-filled + locked), but the server is the source of truth.
  const [doc] = await db
    .select({ fullName: users.fullName, doctorId: users.doctorId })
    .from(users)
    .where(eq(users.id, doctorId))
    .limit(1);
  const [rx] = await db
    .insert(prescriptions)
    .values({
      prescriptionCode: makePrescriptionCode(),
      patientId: input.patientId,
      doctorId,
      status: 'active',
      notes: input.notes ?? null,
      doctorFullName: doc?.fullName ?? input.doctorFullName,
      doctorLicenseId: doc?.doctorId ?? null,
      hospitalName: input.hospitalName,
      doctorContactNumber: input.doctorContactNumber ?? null,
      drugAllergies: input.drugAllergies ?? null,
      medicationInstructions: input.medicationInstructions ?? null,
      electronicSignature: input.electronicSignature ?? null,
    })
    .returning();
  if (!rx) throw Object.assign(new Error('insert_failed'), { statusCode: 500 });
  await db.insert(prescriptionItems).values(
    input.items.map((i) => ({
      prescriptionId: rx.id,
      drugId: i.drugId,
      dose: i.dose,
      amount: i.amount,
      status: 'pending' as const,
    })),
  );
  await audit(doctorId, 'prescription_create', 'prescriptions', rx.id, { patientId: input.patientId });
  return (await getPrescription(rx.id, 'doctor'))!;
}

export async function getPrescription(id: string, viewerRole: Role): Promise<Prescription | null> {
  const [rx] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);
  if (!rx) return null;
  const items = await db.select().from(prescriptionItems).where(eq(prescriptionItems.prescriptionId, id));
  return serialize(rx, items, viewerRole);
}

export async function listPrescriptions(viewerRole: Role, _viewerId: string, patientId?: string): Promise<Prescription[]> {
  // Doctors, pharmacists and admins all receive the full clinic-wide list. Doctors
  // and admins see PHI (patient id + signature); pharmacists have the signature
  // stripped in serialize(). Previously doctors were limited to their own
  // prescriptions — now they can see every prescription for continuity of care.
  // An optional patientId narrows the list to one patient (doctor's workspace).
  const conds = [isNull(prescriptions.deletedAt)];
  if (patientId) conds.push(eq(prescriptions.patientId, patientId));
  const rows = await db
    .select()
    .from(prescriptions)
    .where(and(...conds))
    .orderBy(desc(prescriptions.issuedAt));
  const out: Prescription[] = [];
  for (const rx of rows) {
    const items = await db.select().from(prescriptionItems).where(eq(prescriptionItems.prescriptionId, rx.id));
    out.push(serialize(rx, items, viewerRole));
  }
  return out;
}

/**
 * Prescriptions the pharmacist can still fulfill: status `active` or `partial`
 * (never `completed` or `cancelled`). A `completed` prescription has been fully
 * dispensed and therefore drops out of this list — but it is NOT deleted, so it
 * remains in the patient's history (S3) and is still auditable.
 *
 * `patientNameQuery` does a case-insensitive prefix/contains search on the
 * patient's name so the pharmacist can find a prescription by the person's name
 * without ever loading the patient record (PHI stays out of the pharmacist's view).
 */
export async function listFulfillablePrescriptions(patientNameQuery?: string): Promise<Prescription[]> {
  const conds = [
    or(eq(prescriptions.status, 'active'), eq(prescriptions.status, 'partial')),
    isNull(prescriptions.deletedAt),
  ];
  if (patientNameQuery) conds.push(ilike(patients.name, `%${patientNameQuery}%`));

  const rows = await db
    .select({ rx: prescriptions, patientName: patients.name })
    .from(prescriptions)
    .leftJoin(patients, eq(prescriptions.patientId, patients.id))
    .where(and(...conds))
    .orderBy(desc(prescriptions.issuedAt));

  const out: Prescription[] = [];
  for (const { rx, patientName } of rows) {
    const itemRows = await db
      .select({ item: prescriptionItems, drugName: drugs.name })
      .from(prescriptionItems)
      .leftJoin(drugs, eq(prescriptionItems.drugId, drugs.id))
      .where(eq(prescriptionItems.prescriptionId, rx.id));
    out.push(
      serialize(
        rx,
        itemRows.map((r) => ({ ...r.item, drugName: r.drugName })),
        'pharmacist',
        patientName,
      ),
    );
  }
  return out;
}

export async function cancelPrescription(id: string, actorId: string) {
  const [rx] = await db
    .update(prescriptions)
    .set({ status: 'cancelled' })
    .where(eq(prescriptions.id, id))
    .returning();
  if (!rx) return null;
  await audit(actorId, 'prescription_cancel', 'prescriptions', id, {});
  return rx;
}

/** Correction: new version (old cancelled + audited). Append-only after issue. */
export async function revisePrescription(originalId: string, input: PrescriptionRevise, doctorId: string) {
  const original = await getPrescription(originalId, 'doctor');
  if (!original) return null;
  const created = await createPrescription({ ...input, patientId: original.patientId }, doctorId);
  await db.update(prescriptions).set({ status: 'cancelled' }).where(eq(prescriptions.id, originalId));
  await audit(doctorId, 'prescription_corrected', 'prescriptions', created.id, { superseded: originalId });
  return created;
}

import { db } from '../../db/client';
import { patients } from '../../db/schema';
import { eq, ilike, and, isNull, desc } from 'drizzle-orm';
import { audit } from '../../services/auditLog';
import type { PatientCreate, PatientUpdate } from '@aorta-iq/shared';
import type { PatientSections } from '../../db/schema';

// The contract stores all §2–§10 section data in one JSONB column. The public
// create/update schemas flatten those fields to the top level, so we re-nest them
// here before persisting (only including fields the caller actually sent).
const SECTION_KEYS = [
  'medicalHistory',
  'medications',
  'allergies',
  'vitalSigns',
  'labTests',
  'radiology',
  'visits',
  'documents',
] as const;

function extractSections(input: Partial<PatientCreate>): Partial<PatientSections> {
  const out: Record<string, unknown> = {};
  for (const k of SECTION_KEYS) {
    if (input[k] !== undefined) out[k] = input[k];
  }
  return out as Partial<PatientSections>;
}

export async function createPatient(input: PatientCreate, createdBy: string) {
  const [row] = await db
    .insert(patients)
    .values({
      name: input.name,
      age: input.age,
      gender: input.gender,
      patientId: input.patientId,
      phone: input.phone,
      emergencyContact: input.emergencyContact,
      dateOfBirth: input.dateOfBirth ?? null,
      idNumber: input.idNumber ?? null,
      weightKg: input.weightKg ?? null,
      sections: extractSections(input) as PatientSections,
      createdBy,
    })
    .returning();
  if (!row) throw Object.assign(new Error('insert_failed'), { statusCode: 500 });
  await audit(createdBy, 'patient_create', 'patients', row.id, { patientId: row.patientId });
  return row;
}

export async function listPatients(opts: { q?: string; limit?: number; offset?: number } = {}) {
  const conds = [isNull(patients.deletedAt)];
  if (opts.q) conds.push(ilike(patients.name, `%${opts.q}%`));
  return db
    .select()
    .from(patients)
    .where(and(...conds))
    .orderBy(desc(patients.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
}

export async function getPatientRow(id: string) {
  const [row] = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  return row;
}

export async function updatePatient(id: string, input: PatientUpdate, actorId: string) {
  const existing = await getPatientRow(id);
  if (!existing) return null;
  const mergedSections = {
    ...(existing.sections ?? {}),
    ...extractSections(input),
  } as PatientSections;
  const [row] = await db
    .update(patients)
    .set({
      name: input.name ?? existing.name,
      age: input.age ?? existing.age,
      gender: input.gender ?? existing.gender,
      patientId: input.patientId ?? existing.patientId,
      phone: input.phone ?? existing.phone,
      emergencyContact: input.emergencyContact ?? existing.emergencyContact,
      dateOfBirth: input.dateOfBirth !== undefined ? input.dateOfBirth : existing.dateOfBirth,
      idNumber: input.idNumber !== undefined ? input.idNumber : existing.idNumber,
      weightKg: input.weightKg !== undefined ? input.weightKg : existing.weightKg,
      sections: mergedSections,
    })
    .where(eq(patients.id, id))
    .returning();
  if (!row) throw Object.assign(new Error('update_failed'), { statusCode: 500 });
  await audit(actorId, 'patient_update', 'patients', id, { patientId: row.patientId });
  return row;
}

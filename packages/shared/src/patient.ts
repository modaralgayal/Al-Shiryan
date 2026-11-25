import { z } from 'zod';
import { genderSchema } from './enums';

export const patientBaseSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().nonnegative().max(150),
  gender: genderSchema,
  patientId: z.string().min(1), // medical record number
  phone: z.string().min(1),
  emergencyContact: z.string().min(1),
  // Real e-prescription form fields (identity section).
  dateOfBirth: z.string().optional(), // ISO date; may be unknown
  idNumber: z.string().optional(), // national ID / equivalent
  weightKg: z.number().positive().max(500).optional(),
});

// Section 4 — Allergies
export const allergySchema = z.object({
  substance: z.string().min(1),
  type: z.enum(['drug', 'food', 'other']),
  severity: z.enum(['mild', 'moderate', 'severe']),
  reaction: z.string().optional(),
});

// Section 3 — Medications
export const medicationSchema = z.object({
  name: z.string().min(1),
  dose: z.string().min(1),
  frequency: z.string().min(1),
  history: z.string().optional(),
});

// Section 2 — Medical History
export const medicalHistorySchema = z.object({
  previousDiseases: z.string().optional(),
  chronicConditions: z.string().optional(),
  surgeries: z.string().optional(),
  familyHistory: z.string().optional(),
});

// Section 5 — Laboratory Tests
export const labTestSchema = z.object({
  testName: z.string().min(1),
  result: z.string().optional(),
  value: z.number().optional(),
  unit: z.string().optional(),
  reportedAt: z.string().min(1),
  pdfR2Key: z.string().optional(), // PDF stored in Cloudflare R2
});

// Section 6 — Radiology
export const radiologySchema = z.object({
  modality: z.enum(['xray', 'ct', 'mri', 'ultrasound', 'other']),
  bodyPart: z.string().optional(),
  report: z.string().optional(),
  imageR2Key: z.string().optional(),
  reportedAt: z.string().min(1),
});

// Section 9 — Vital Signs
export const vitalSignSchema = z.object({
  recordedAt: z.string().min(1),
  bloodPressure: z.string().optional(),
  pulse: z.number().optional(),
  temperature: z.number().optional(),
  weightKg: z.number().optional(),
  heightCm: z.number().optional(),
  oxygenSaturation: z.number().optional(),
});

// Section 8 — Doctor Visits
export const visitSchema = z.object({
  visitDate: z.string().min(1),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  clinicalNotes: z.string().optional(),
  treatmentPlan: z.string().optional(),
});

// Section 10 — Medical Documents
export const documentSchema = z.object({
  title: z.string().min(1),
  r2Key: z.string().min(1),
  kind: z.string().optional(),
});

/** Doctor-created patient record (contract §sections 1–10). */
export const patientCreateSchema = patientBaseSchema.extend({
  medicalHistory: medicalHistorySchema.optional(),
  medications: z.array(medicationSchema).default([]),
  allergies: z.array(allergySchema).default([]),
  vitalSigns: z.array(vitalSignSchema).default([]),
  labTests: z.array(labTestSchema).default([]),
  radiology: z.array(radiologySchema).default([]),
  visits: z.array(visitSchema).default([]),
  documents: z.array(documentSchema).default([]),
});
export type PatientCreate = z.infer<typeof patientCreateSchema>;

export const patientSchema = patientCreateSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
  createdBy: z.string().uuid(),
});
export type Patient = z.infer<typeof patientSchema>;

/** PATCH body — every field optional. */
export const patientUpdateSchema = patientCreateSchema.partial();
export type PatientUpdate = z.infer<typeof patientUpdateSchema>;

/** List query — optional free-text search + page. */
export const patientListQuerySchema = z.object({
  q: z.string().min(1).optional(),
  page: z.coerce.number().int().nonnegative().default(1),
});
export type PatientListQuery = z.infer<typeof patientListQuerySchema>;

import { z } from 'zod';
import { prescriptionStatusSchema, prescriptionItemStatusSchema } from './enums';

/** One line of a prescription: a single drug + dose + amount (e.g. number of pills). */
export const prescriptionItemInputSchema = z.object({
  drugId: z.string().uuid(),
  dose: z.string().min(1),
  amount: z.number().positive(),
});

export const prescriptionCreateSchema = z.object({
  patientId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
  items: z.array(prescriptionItemInputSchema).min(1),
  // Real e-prescription form fields.
  doctorFullName: z.string().min(1),
  hospitalName: z.string().min(1),
  doctorContactNumber: z.string().optional(),
  drugAllergies: z.string().max(2000).optional(),
  medicationInstructions: z.string().max(2000).optional(),
  // Confidential — doctor-only (never returned to pharmacists / limited admin views).
  electronicSignature: z.string().optional(),
  // Professional doctor ID. The backend overrides both this and doctorFullName from
  // the authenticated user, so the prescriber's identity is always forced. Optional
  // here only because the client sends it pre-filled + locked; it is not trusted.
  doctorLicenseId: z.string().optional(),
});
export type PrescriptionCreate = z.infer<typeof prescriptionCreateSchema>;

export const prescriptionItemSchema = prescriptionItemInputSchema.extend({
  id: z.string().uuid(),
  status: prescriptionItemStatusSchema,
  givenBy: z.string().uuid().nullable(),
  givenAt: z.string().nullable(),
});
export type PrescriptionItem = z.infer<typeof prescriptionItemSchema>;

export const prescriptionSchema = z.object({
  id: z.string().uuid(),
  prescriptionCode: z.string().optional(), // human-facing Prescription ID
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  status: prescriptionStatusSchema,
  notes: z.string().nullable(),
  doctorFullName: z.string().nullable(),
  hospitalName: z.string().nullable(),
  doctorContactNumber: z.string().nullable(),
  drugAllergies: z.string().nullable(),
  medicationInstructions: z.string().nullable(),
  electronicSignature: z.string().nullable(), // confidential, doctor-only
  doctorLicenseId: z.string().nullable().optional(),
  issuedAt: z.string(),
  items: z.array(prescriptionItemSchema),
});
export type Prescription = z.infer<typeof prescriptionSchema>;

/** Pharmacist marks items as given; prescription stays active until ALL items are given. */
export const dispenseInputSchema = z.object({
  pharmacistId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1),
});
export type DispenseInput = z.infer<typeof dispenseInputSchema>;

/** Correcting a prescription creates a new version (old one is cancelled + audited). */
export const prescriptionReviseSchema = prescriptionCreateSchema.omit({ patientId: true });
export type PrescriptionRevise = z.infer<typeof prescriptionReviseSchema>;

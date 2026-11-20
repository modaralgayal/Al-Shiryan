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
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  status: prescriptionStatusSchema,
  notes: z.string().nullable(),
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

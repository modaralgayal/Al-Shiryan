import { z } from 'zod';

/** User roles from the contract (Doctor, Pharmacist, Admin). */
export const roleSchema = z.enum(['doctor', 'pharmacist', 'admin']);
export type Role = z.infer<typeof roleSchema>;

export const genderSchema = z.enum(['male', 'female', 'other', 'unknown']);
export type Gender = z.infer<typeof genderSchema>;

/** Prescription lifecycle. `partial` while some items are still pending. */
export const prescriptionStatusSchema = z.enum(['active', 'partial', 'completed', 'cancelled']);
export type PrescriptionStatus = z.infer<typeof prescriptionStatusSchema>;

export const prescriptionItemStatusSchema = z.enum(['pending', 'given']);
export type PrescriptionItemStatus = z.infer<typeof prescriptionItemStatusSchema>;

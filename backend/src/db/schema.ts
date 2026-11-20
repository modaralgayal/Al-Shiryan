import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { patientCreateSchema } from '@aorta-iq/shared';

export const roleEnum = pgEnum('role', ['doctor', 'pharmacist', 'admin']);
export const prescriptionStatusEnum = pgEnum('prescription_status', [
  'active',
  'partial',
  'completed',
  'cancelled',
]);
export const prescriptionItemStatusEnum = pgEnum('prescription_item_status', [
  'pending',
  'given',
]);

// Contract §sections 2–10, stored as a single validated JSONB column.
export const patientSectionsSchema = patientCreateSchema.omit({
  name: true,
  age: true,
  gender: true,
  patientId: true,
  phone: true,
  emergencyContact: true,
});
export type PatientSections = z.infer<typeof patientSectionsSchema>;

const lifecycle = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseUid: text('firebase_uid').notNull().unique(),
  email: text('email').notNull(),
  role: roleEnum('role').notNull(),
  fullName: text('full_name').notNull().default(''),
  status: text('status').notNull().default('invited'),
  invitedBy: uuid('invited_by'),
  ...lifecycle,
});

export const inviteLinks = pgTable('invite_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenHash: text('token_hash').notNull().unique(),
  role: roleEnum('role').notNull(),
  email: text('email'),
  createdBy: uuid('created_by').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  ...lifecycle,
});

export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: text('patient_id').notNull().unique(), // MRN
  name: text('name').notNull(),
  age: integer('age').notNull(),
  gender: text('gender').notNull(),
  phone: text('phone').notNull(),
  emergencyContact: text('emergency_contact').notNull(),
  sections: jsonb('sections').$type<PatientSections>(),
  createdBy: uuid('created_by').notNull(),
  ...lifecycle,
});

export const drugs = pgTable('drugs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  form: text('form').notNull(),
  strength: text('strength').notNull(),
  ...lifecycle,
});

export const prescriptions = pgTable('prescriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'restrict' }),
  doctorId: uuid('doctor_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  status: prescriptionStatusEnum('status').notNull().default('active'),
  notes: text('notes'),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  ...lifecycle,
});

export const prescriptionItems = pgTable('prescription_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  prescriptionId: uuid('prescription_id')
    .notNull()
    .references(() => prescriptions.id, { onDelete: 'restrict' }),
  drugId: uuid('drug_id')
    .notNull()
    .references(() => drugs.id, { onDelete: 'restrict' }),
  dose: text('dose').notNull(),
  amount: integer('amount').notNull(),
  status: prescriptionItemStatusEnum('status').notNull().default('pending'),
  givenBy: uuid('given_by'),
  givenAt: timestamp('given_at', { withTimezone: true }),
  ...lifecycle,
});

export const pharmacistDispenses = pgTable('pharmacist_dispenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  prescriptionItemId: uuid('prescription_item_id')
    .notNull()
    .references(() => prescriptionItems.id, { onDelete: 'restrict' }),
  pharmacistId: uuid('pharmacist_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  quantityGiven: integer('quantity_given').notNull(),
  ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
  ...lifecycle,
});

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id'),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  meta: jsonb('meta'),
  ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
});

export const drugInteractions = pgTable('drug_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  drugA: uuid('drug_a')
    .notNull()
    .references(() => drugs.id, { onDelete: 'restrict' }),
  drugB: uuid('drug_b')
    .notNull()
    .references(() => drugs.id, { onDelete: 'restrict' }),
  severity: text('severity').notNull(),
  description: text('description'),
  ...lifecycle,
});

export const drugAllergyRules = pgTable('drug_allergy_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  drugId: uuid('drug_id')
    .notNull()
    .references(() => drugs.id, { onDelete: 'restrict' }),
  allergen: text('allergen').notNull(),
  severity: text('severity').notNull(),
  ...lifecycle,
});

export const pregnancyRisk = pgTable('pregnancy_risk', {
  id: uuid('id').primaryKey().defaultRandom(),
  drugId: uuid('drug_id')
    .notNull()
    .references(() => drugs.id, { onDelete: 'restrict' }),
  category: text('category').notNull(),
  note: text('note'),
  ...lifecycle,
});

export const renalDosing = pgTable('renal_dosing', {
  id: uuid('id').primaryKey().defaultRandom(),
  drugId: uuid('drug_id')
    .notNull()
    .references(() => drugs.id, { onDelete: 'restrict' }),
  guidance: text('guidance').notNull(),
  ...lifecycle,
});

export const clinicalGuidelines = pgTable('clinical_guidelines', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  ...lifecycle,
});

-- ============================================================================
-- S2 additive fields (0001_clinical_fields)
-- ADD COLUMN only — no DROP / DELETE / TRUNCATE / RENAME — passes the migrator
-- guard. Safe to re-run thanks to IF NOT EXISTS.
-- ============================================================================

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS date_of_birth text,
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS weight_kg numeric;

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS prescription_code text,
  ADD COLUMN IF NOT EXISTS doctor_full_name text,
  ADD COLUMN IF NOT EXISTS hospital_name text,
  ADD COLUMN IF NOT EXISTS doctor_contact_number text,
  ADD COLUMN IF NOT EXISTS drug_allergies text,
  ADD COLUMN IF NOT EXISTS medication_instructions text,
  ADD COLUMN IF NOT EXISTS electronic_signature text;

-- ============================================================================
-- S2 identity lock (0002_identity_lock)
-- ADD COLUMN only — passes the migrator guard (no DROP / DELETE / TRUNCATE /
-- RENAME). Safe to re-run thanks to IF NOT EXISTS.
-- Doctors/pharmacists self-assign a professional ID at registration; it is
-- captured on every prescription / dispense so the prescriber's "signature" is
-- immutable and never trusted from the client.
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS doctor_id text,
  ADD COLUMN IF NOT EXISTS pharmacist_id text;

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS doctor_license_id text;

ALTER TABLE pharmacist_dispenses
  ADD COLUMN IF NOT EXISTS pharmacist_license_id text;

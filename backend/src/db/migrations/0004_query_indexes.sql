-- ============================================================================
-- S2 scalability (0004_query_indexes)
-- ADDITIVE only — passes the migrator guard. Postgres does NOT auto-index
-- foreign keys, so the hot query paths below (patient + prescription lookups,
-- admin oversight lists, audit reporting) need explicit indexes to stay fast as
-- the tables grow. All indexes are CREATE INDEX IF NOT EXISTS and most are
-- partial (WHERE deleted_at IS NULL) so soft-deleted rows stay out of the index.
-- ============================================================================

-- Prescription lookups by patient / prescriber, and the admin oversight list
-- (filtered + ordered by issued_at).
CREATE INDEX IF NOT EXISTS ix_prescriptions_patient_id
  ON prescriptions (patient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_prescriptions_doctor_id
  ON prescriptions (doctor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_prescriptions_doctor_license_id
  ON prescriptions (doctor_license_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_prescriptions_status
  ON prescriptions (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_prescriptions_issued_at
  ON prescriptions (issued_at DESC) WHERE deleted_at IS NULL;

-- Patient search is case-insensitive (ilike lower(name)) in the service, and
-- patient_id is already UNIQUE from the schema, so we only add the name index.
CREATE INDEX IF NOT EXISTS ix_patients_name ON patients (lower(name));

-- Account listing / role-scoped queries in the admin surface.
CREATE INDEX IF NOT EXISTS ix_users_role ON users (role) WHERE deleted_at IS NULL;

-- Audit reporting: by actor and chronologically.
CREATE INDEX IF NOT EXISTS ix_audit_log_actor_id ON audit_log (actor_id);
CREATE INDEX IF NOT EXISTS ix_audit_log_ts ON audit_log (ts DESC);

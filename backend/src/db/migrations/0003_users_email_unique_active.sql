-- ============================================================================
-- S2 account integrity (0003_users_email_unique_active)
-- ADDITIVE only — passes the migrator guard. Creates a PARTIAL unique index so
-- two ACTIVE user accounts can never share an email. Soft-deleted rows (deleted_at
-- set) are excluded from the index, so a deleted account's email may be reused
-- without colliding. Safe to re-run via IF NOT EXISTS.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_active
  ON users (email)
  WHERE deleted_at IS NULL;

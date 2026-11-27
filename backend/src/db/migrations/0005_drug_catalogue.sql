-- ============================================================================
-- S2 drug catalogue (0005_drug_catalogue)
-- ADDITIVE only — passes the migrator guard. Adds the client's market-list
-- fields (full pack text + active molecule) and lets `strength` be empty for
-- packs that don't state one (e.g. "TAB 100'S"). The old placeholder drugs are
-- soft-deleted by `db:seed` (row DELETE is blocked by the guardrail trigger).
-- ============================================================================
ALTER TABLE drugs ADD COLUMN IF NOT EXISTS pack text;
ALTER TABLE drugs ADD COLUMN IF NOT EXISTS molecule text;
ALTER TABLE drugs ALTER COLUMN strength SET DEFAULT '';

CREATE INDEX IF NOT EXISTS ix_drugs_name ON drugs (lower(name)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_drugs_molecule ON drugs (lower(molecule)) WHERE deleted_at IS NULL;

-- ============================================================================
-- AORTAIQ initial schema (0000_init)
-- NOTE: this migration is ADDITIVE-ONLY by design. The migrator guard blocks
-- any DROP / DELETE FROM / TRUNCATE / RENAME / ALTER..DROP. New columns and
-- tables go in later numbered migrations. Row deletion is prevented at the DB
-- level by the block_row_delete() trigger attached below.
-- ============================================================================

CREATE TYPE role AS ENUM ('doctor', 'pharmacist', 'admin');
CREATE TYPE prescription_status AS ENUM ('active', 'partial', 'completed', 'cancelled');
CREATE TYPE prescription_item_status AS ENUM ('pending', 'given');

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid  text NOT NULL UNIQUE,
  email         text NOT NULL,
  role          role NOT NULL,
  full_name     text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'invited',
  invited_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE TABLE invite_links (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash   text NOT NULL UNIQUE,
  role         role NOT NULL,
  email        text,
  created_by   uuid NOT NULL,
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

CREATE TABLE patients (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        text NOT NULL UNIQUE,           -- MRN
  name              text NOT NULL,
  age               integer NOT NULL,
  gender            text NOT NULL,
  phone             text NOT NULL,
  emergency_contact text NOT NULL,
  sections          jsonb,                          -- contract §sections 2-10 (validated by Zod)
  created_by        uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE TABLE drugs (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text NOT NULL,
  form      text NOT NULL,
  strength  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE prescriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id  uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status     prescription_status NOT NULL DEFAULT 'active',
  notes      text,
  issued_at  timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE prescription_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE RESTRICT,
  drug_id         uuid NOT NULL REFERENCES drugs(id) ON DELETE RESTRICT,
  dose            text NOT NULL,
  amount          integer NOT NULL,
  status          prescription_item_status NOT NULL DEFAULT 'pending',
  given_by        uuid,
  given_at        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE TABLE pharmacist_dispenses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_item_id uuid NOT NULL REFERENCES prescription_items(id) ON DELETE RESTRICT,
  pharmacist_id       uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  quantity_given      integer NOT NULL,
  ts                  timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE TABLE audit_log (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id  uuid,
  action    text NOT NULL,
  entity    text NOT NULL,
  entity_id text,
  meta      jsonb,
  ts        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE drug_interactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_a      uuid NOT NULL REFERENCES drugs(id) ON DELETE RESTRICT,
  drug_b      uuid NOT NULL REFERENCES drugs(id) ON DELETE RESTRICT,
  severity    text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE TABLE drug_allergy_rules (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_id   uuid NOT NULL REFERENCES drugs(id) ON DELETE RESTRICT,
  allergen  text NOT NULL,
  severity  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE pregnancy_risk (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_id   uuid NOT NULL REFERENCES drugs(id) ON DELETE RESTRICT,
  category  text NOT NULL,
  note      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE renal_dosing (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_id   uuid NOT NULL REFERENCES drugs(id) ON DELETE RESTRICT,
  guidance  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE clinical_guidelines (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title     text NOT NULL,
  body      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================================
-- Guardrail: a BEFORE DELETE trigger on every core table. Even a role that
-- holds DELETE cannot remove rows without first disabling the trigger (a
-- privileged, logged action). Combined with the runtime DB role lacking
-- DELETE/DROP and the migrator guard, accidental deletion is impossible.
-- ============================================================================
CREATE OR REPLACE FUNCTION block_row_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'row delete blocked by guardrail on %', TG_TABLE_NAME;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','invite_links','patients','drugs','prescriptions',
    'prescription_items','pharmacist_dispenses','audit_log',
    'drug_interactions','drug_allergy_rules','pregnancy_risk',
    'renal_dosing','clinical_guidelines'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_block_delete ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_block_delete BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION block_row_delete()',
      t
    );
  END LOOP;
END $$;

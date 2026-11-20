# AORTAIQ — Feature Plan by Session (S1–S4)

Status legend: ✅ Done · 🟡 In progress · ⬜ Planned

> Source of truth: `implementation_plan` (contract) + approved `plans/pasted-content-id-e73f-zippy-seal.md`.
> Locked decisions: **all Section-3 smart features ship in the 1-month launch** · **doctors/admins create patient records (no patient login)** · **one Render account + Render managed Postgres + default `*.onrender.com` domain at launch**.

---

## Cross-cutting foundations (established in S1, used by all sessions)

| Concern | Approach | Status |
|---|---|---|
| Monorepo | pnpm workspaces: `packages/shared`, `backend`, `frontend` | ✅ |
| Validation | Zod schemas in `packages/shared`, reused client + server | ✅ |
| DB guardrails | runtime role lacks `DELETE`/`DROP`; `BEFORE DELETE` triggers; additive-only migrations; gated `db:danger` | ✅ verified |
| Sessions | Firebase session cookies (`httpOnly`, `SameSite=Strict`), server-verified, roles as custom claims | ✅ |
| i18n / RTL | English + Arabic, `dir` flips on language switch | ✅ |
| CI | `.github/workflows/ci.yml` gates on `pnpm typecheck` → `pnpm test` | ✅ |
| Accounts | Render + Firebase + Cloudflare R2 — client setup + linking in `README.md` | ✅ documented |

---

## Session 1 — Foundation, auth, DB guardrails ✅ (verified)

**Goal:** repo scaffolds, both apps boot, a user can log in, sessions persist, RBAC works, migrations apply safely, and data cannot be deleted by accident.

### Features delivered
- ✅ **Monorepo + tooling** — pnpm workspaces, root scripts, `.gitignore`, `.nvmrc`, `docker-compose.yml` (Postgres 16), `.env.example`, `README.md`, CI workflow.
- ✅ **Shared Zod schemas** (`packages/shared`) — `enums` (role/gender/prescription status), `auth`, `drug`, `patient` (10-section record), `prescription`, `invite`.
- ✅ **Backend core** — Express + TS, Drizzle + Postgres client, `/health`, security middleware (Helmet + CORS locked to `CLIENT_ORIGIN` + rate limit), `validateBody`/`validateQuery` (Zod).
- ✅ **Database schema + guardrails** — 14 tables (`users`, `invite_links`, `patients`, `drugs`, `prescriptions`, `prescription_items`, `pharmacist_dispenses`, `audit_log`, `drug_interactions`, `drug_allergy_rules`, `pregnancy_risk`, `renal_dosing`, `clinical_guidelines`). Soft-delete `deleted_at` on every table; `ON DELETE RESTRICT` FKs; `BEFORE DELETE` triggers on all core tables.
- ✅ **Migration system** — `db:migrate` (additive-only; blocks `DROP TABLE/COLUMN`, `DELETE FROM`, `TRUNCATE`, `RENAME`, `ALTER…DROP`), `db:danger` (requires `ALLOW_DESTRUCTIVE_MIGRATIONS=1` + confirmation phrase + prod token), `db:seed` (drugs).
- ✅ **Auth + RBAC** — Firebase Admin init, session-cookie set/clear, `authenticate` middleware (verifies cookie, re-loads user+role per request), `requireRole(...)`, `isAuthorized` (pure, unit-tested).
- ✅ **API routes (S1 slice)** — `POST /api/auth/register|login|logout`, `GET /api/auth/me`; `GET /api/drugs?q=` (autocomplete); `POST /api/admin/invites`, `GET /api/admin/accounts`, `GET /api/admin/prescriptions`.
- ✅ **Frontend core** — Vite + React + TS + Tailwind + Router + TanStack Query + React Hook Form + Zod + Firebase JS SDK; `AuthProvider` (re-establishes session cookie on every refresh); `RequireRole` guard; `Layout` + `LanguageToggle`; `Login`, `Register` (invite redemption), `Home`, 5 portal pages (`/portals /journals /medical-library /authorities /events`); print CSS.
- ✅ **Services** — `auditLog` (append-only trail), `inviteLinks` (single-use, expiring, SHA-256 hashed token).
- ✅ **Tests + typecheck** — backend unit tests (RBAC, invite tokens), frontend component test (i18n/RTL); `pnpm typecheck` clean across all packages.

### Key files
`backend/src/db/{schema,migrator-guard,migrate,seed,client}.ts`, `backend/src/db/migrations/0000_init.sql`, `backend/src/auth/*`, `backend/src/middleware/*`, `backend/src/routes/{auth,drugs,admin}.ts`, `backend/src/services/*`, `frontend/src/lib/*`, `frontend/src/{App,main}.tsx`, `frontend/src/pages/*`, `packages/shared/src/*`.

### Verification evidence (2026-11-20)
`pnpm install` ✓ · `pnpm typecheck` ✓ · `pnpm test` ✓ (7) · backend `/health` ✓ · `db:migrate` applied 14 tables ✓ · `db:seed` 5 drugs ✓ · `db:migrate` **blocked** a `DROP TABLE` migration ✓ · `db:danger` **refused** without env gates ✓ · actual `DELETE` **stopped** by trigger (`row delete blocked by guardrail on drugs`) ✓.

### Exit criteria
✅ Both apps boot · ✅ login works · ✅ session survives refresh · ✅ `requireRole` blocks wrong roles · ✅ migrations apply safely.

---

## Session 2 — Core clinical loop + public portal ⬜ (planned)

**Goal:** the day-to-day clinical workflow works end-to-end with role enforcement and audit logging. **Most features land here.**

### Features
- ⬜ **Patient records (doctor-created)** — CRUD for the 10-section record (§sections 1–10): identity, medical history, medications, allergies, lab tests, radiology, vital signs, visits, documents. Stored as validated JSONB `sections`. **PHI is doctor/admin-only** — pharmacists get `403` at the resolver, not just hidden in the UI.
- ⬜ **Drug autocomplete UI** — typeahead bound to `GET /api/drugs?q=`; doctor can **only** pick from the seeded list; server re-validates `drug_id` on write (no free text).
- ⬜ **Prescriptions** — doctor writes per-item (drug + dose + amount); status lifecycle `active → partial → completed → cancelled`; **print-friendly layout** via `print.css`; append-only after issue (corrections create a new version + audit entry).
- ⬜ **Pharmacist fulfillment** — list of prescriptions; partial dispense entering **Pharmacist ID** + which items were given; prescription stays `active`/`partial` until **all** items `given` (recomputed in a transaction); **cannot view PHI**.
- ⬜ **Admin** — single-use, expiring, signed **invite links** for doctors/pharmacists; view all registered accounts; view prescriptions + related data with **patient details hidden/limited** (per contract); promote via email allowlist + Firebase custom claims.
- ⬜ **Public portal content** — 5 navigable routes + Home (links, press releases, general articles, medical-advice videos, "LEARN MORE ABOUT HOW AORTAIQ IS MAKING A DIFFERENCE" + "RESEARCH"); medical-journal-inspired layout; placeholders for client-provided content/logos.
- ⬜ **Cloudflare R2 wiring** — presigned PUT/GET for lab PDFs, radiology images, medical documents; MIME + size validation; secret never reaches the browser.

### Endpoints to add
`patients` (CRUD, PHI-gated), `prescriptions` (create/read/print), `prescriptions/:id/items/dispense` (pharmacist), `files` (presigned URLs), `admin/invites` (extend), `admin/prescriptions` (extend with limited patient view).

### New files (expected)
`backend/src/routes/{patients,prescriptions,pharmacist,files}.ts`, `backend/src/services/{prescriptions,fulfillment,files}.ts`, `frontend/src/pages/{PatientRecords,PrescriptionWriter,PharmacistFulfillment,AdminPanel}.tsx`, `frontend/src/components/DrugAutocomplete.tsx`, R2 client `backend/src/lib/r2.ts`.

### Exit criteria
⬜ Full loop works: doctor creates patient → writes prescription → pharmacist partially dispenses (stays active) → admin invites + views. ⬜ Pharmacist cannot reach PHI (verified via test). ⬜ Every dispense/invite/PHI access is in `audit_log`.

---

## Session 3 — Smart features (all in launch) ⬜ (planned)

Per your decision, all of Section 3 ships in the launch.

### Features
- ⬜ **Drug Safety Alerts** — on prescription write, check drug–drug interactions, drug–allergy, pregnancy risk, renal dosing against seeded reference tables (`drug_interactions`, `drug_allergy_rules`, `pregnancy_risk`, `renal_dosing`); surface warnings to the doctor.
- ⬜ **Patient Timeline** — chronological view of visits + prescriptions + lab results + imaging.
- ⬜ **Laboratory Trends** — charts over time for HbA1c, creatinine, hemoglobin (and extensible).
- ⬜ **Clinical Guidelines** — view/access module (`clinical_guidelines` table; content provided later).
- ⬜ **Patient QR Code** — authorized secure retrieve of a patient record (scoped by role/permission).
- ⬜ **i18n/RTL + print polish** across all new screens.

### New files (expected)
`backend/src/routes/smart/{safety,timeline,trends,guidelines,qr}.ts`, `backend/src/services/drugSafety.ts`, `frontend/src/pages/smart/*`, chart components (e.g. a lightweight SVG/Recharts addition).

### Exit criteria
⬜ Safety alerts fire on conflicting prescriptions · ⬜ timeline/trends/guidelines/QR render and respect RBAC · ⬜ Arabic layout verified on each.

---

## Session 4 — Testing pipeline, hardening, deploy ⬜ (planned)

### Features
- ⬜ **Expanded test suites** — backend integration tests against an ephemeral Postgres (auth/session middleware, pharmacist 403 on PHI, admin invite flow, fulfillment-transaction correctness, guardrail refusal); frontend component tests (autocomplete only accepts list drugs, role-gated UI hides PHI, Zod validation messages).
- ⬜ **E2E (Playwright)** — happy path: doctor creates patient → writes prescription → pharmacist partially dispenses → admin views.
- ⬜ **CI hardening** — typecheck + tests on every PR; Render deploys only on a green build.
- ⬜ **Security pass** — Helmet/HSTS, CORS locked, rate limit, secrets via Render env (no committed `.env`), audit logging, PHI minimization, CSRF on mutating routes.
- ⬜ **Deploy to Render** — Web Service (backend) + Static Site (frontend) + managed Postgres + R2 env vars.
- ⬜ **Post-deploy verification** — sessions persist across reload and deploy; pharmacist still blocked from PHI; destructive migrate refused on prod.
- ⬜ **Guardrail proof** — run the §6 verification (delete attempts blocked at app + DB trigger + `db:danger` prod refusal).
- ⬜ **Handoff** — accounts/linking doc, admin runbook, backup/restore runbook (Render PITR).

### Exit criteria
⬜ `pnpm test` green in CI · ⬜ E2E passes on preview · ⬜ deployed app meets all S1–S3 acceptance · ⬜ guardrail + session guarantees re-verified on production.

---

## Account hand-off checklist (client)
- [ ] **Render** account + Web Service + Static Site + PostgreSQL → connection string.
- [ ] **Firebase** project, Email/Password enabled, Web App config + service-account JSON.
- [ ] **Cloudflare R2** bucket + API token + account ID + endpoint.
- [ ] (Later) domain registrar access for custom domain.
- [ ] Client content: drug list, prescription schema (Ream), Medical Library PDFs, portal-section materials, logo/images.

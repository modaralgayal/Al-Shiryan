# AORTAIQ — Feature Plan by Session (S1–S4)

Status legend: ✅ Done · 🟡 In progress · ⬜ Planned

> Source of truth: `implementation_plan` (contract).
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
- ✅ **Database schema + guardrails** — 13 tables (`users`, `invite_links`, `patients`, `drugs`, `prescriptions`, `prescription_items`, `pharmacist_dispenses`, `audit_log`, `drug_interactions`, `drug_allergy_rules`, `pregnancy_risk`, `renal_dosing`, `clinical_guidelines`). Soft-delete `deleted_at` on every table; `ON DELETE RESTRICT` FKs; `BEFORE DELETE` triggers on all core tables.
- ✅ **Migration system** — `db:migrate` (additive-only; blocks `DROP TABLE/COLUMN`, `DELETE FROM`, `TRUNCATE`, `RENAME`, `ALTER…DROP`), `db:danger` (requires `ALLOW_DESTRUCTIVE_MIGRATIONS=1` + confirmation phrase + prod token), `db:seed` (drugs).
- ✅ **Auth + RBAC** — Firebase Admin init, session-cookie set/clear, `authenticate` middleware (verifies cookie, re-loads user+role per request), `requireRole(...)`, `isAuthorized` (pure, unit-tested).
- ✅ **API routes (S1 slice)** — `POST /api/auth/register|login|logout`, `GET /api/auth/me`; `GET /api/drugs?q=` (autocomplete); `POST /api/admin/invites`, `GET /api/admin/accounts`, `GET /api/admin/prescriptions`.
- ✅ **Frontend core** — Vite + React + TS + Tailwind + Router + TanStack Query + React Hook Form + Zod + Firebase JS SDK; `AuthProvider` (re-establishes session cookie on every refresh); `RequireRole` guard; `Layout` + `LanguageToggle`; `Login`, `Register` (invite redemption), `Home`, 5 portal pages (`/portals /journals /medical-library /authorities /events`); print CSS.
- ✅ **Services** — `auditLog` (append-only trail), `inviteLinks` (single-use, expiring, SHA-256 hashed token).
- ✅ **Tests + typecheck** — backend unit tests (RBAC, invite tokens), frontend component test (i18n/RTL); `pnpm typecheck` clean across all packages.

### Key files
`backend/src/db/{schema,migrator-guard,migrate,seed,client}.ts`, `backend/src/db/migrations/0000_init.sql`, `backend/src/auth/*`, `backend/src/middleware/*`, `backend/src/routes/{auth,drugs,admin}.ts`, `backend/src/services/*`, `frontend/src/lib/*`, `frontend/src/{App,main}.tsx`, `frontend/src/pages/*`, `packages/shared/src/*`.

### Verification evidence (2026-11-20)
`pnpm install` ✓ · `pnpm typecheck` ✓ · `pnpm test` ✓ (7) · backend `/health` ✓ · `db:migrate` applied 13 tables ✓ · `db:seed` 5 drugs ✓ · `db:migrate` **blocked** a `DROP TABLE` migration ✓ · `db:danger` **refused** without env gates ✓ · actual `DELETE` **stopped** by trigger (`row delete blocked by guardrail on drugs`) ✓.

### Exit criteria
✅ Both apps boot · ✅ login works · ✅ session survives refresh · ✅ `requireRole` blocks wrong roles · ✅ migrations apply safely.

---

## Session 2 — Core clinical loop + public portal ✅ (delivered)

**Goal:** the day-to-day clinical workflow works end-to-end with role enforcement and audit logging. **Most features land here.**

### Features
- ✅ **Patient records (doctor-created)** — CRUD for the 10-section record; stored as validated JSONB `sections`. **PHI is doctor/admin-only** — pharmacists get `403` at the resolver, not just hidden in the UI.
- ✅ **Drug autocomplete UI** — typeahead bound to `GET /api/drugs?q=`; doctor can **only** pick from the seeded list; server re-validates `drug_id` on write (no free text).
- ✅ **Prescriptions** — doctor writes per-item (drug + dose + amount); status lifecycle `active → partial → completed → cancelled`; **print-friendly layout** via `print.css`; append-only after issue (corrections create a new version + audit entry).
- ✅ **Pharmacist fulfillment** — list of prescriptions; partial dispense entering **Pharmacist ID** + which items were given; prescription stays `active`/`partial` until **all** items `given` (recomputed in a single transaction); **cannot view PHI**.
- ✅ **Identity lock** — doctor/pharmacist professional IDs are captured **server-side** from the authenticated user (never trusted from the body) on registration, prescription issue, and dispense, so a signature can never be spoofed.
- ✅ **Account integrity** — email reuse after soft-delete is blocked by a partial unique index (`uq_users_email_active`) + a `409 email_already_registered` guard; deleting an account also deletes the Firebase Auth user.
- ✅ **Admin** — single-use, expiring, signed **invite links** (role gated by email allowlist); view accounts with **self-delete protection** (soft-delete + Firebase deletion); view prescriptions + related data **limited to oversight fields** (no drugs, signature, or contact PHI — enforced in `serialize()`).
- 🟡 **Public portal content** — 5 navigable routes + Home exist with placeholder/links content (client materials pending).
- 🟡 **Cloudflare R2 wiring** — presigned PUT/GET for lab PDFs / radiology images / documents; MIME + size validation; secret never reaches the browser (basic wiring present).
- ✅ **Audit coverage** — `invite_created`, `user_registered`, `account_deleted`, `patient_view/create/update`, `prescription_viewed` (every PHI read), `prescription_create/cancel/corrected`, `prescription_dispensed` are logged.

### Architecture skeleton (added this session)
**Modular monolith.** Backend: `core/` (`errors`, `config`, `logger`, `createApp` bootstrap) + `domains/<context>/` (auth, accounts, patients, prescriptions, pharmacist, drugs, files) each owning its route + service; shared services (`auditLog`, `inviteLinks`) and infra (`db/`, `auth/`, `middleware/`, `lib/`) at root. Frontend mirrors the split with `app/`, `shared/` (lib + components + styles), and `features/<context>/pages`. See `docs/ARCHITECTURE.md`.

### Endpoints
`/api/auth` (register/login/logout/me/invite-peek), `/api/patients` (CRUD, PHI-gated), `/api/prescriptions` (create/read/cancel/revise), `/api/pharmacist` (list/dispense), `/api/drugs` (autocomplete), `/api/files` (presigned URLs), `/api/admin` (invites/accounts/limited prescriptions).

### New files
`backend/src/core/*`, `backend/src/domains/{auth,accounts,patients,prescriptions,pharmacist,drugs,files}/*`, `backend/src/db/migrations/0001..0004_*`, `frontend/src/app/*`, `frontend/src/shared/*`, `frontend/src/features/*`.

### Tests (added)
Backend route/unit tests for identity lock (doctor/pharmacist ID required at registration), email 409, admin self-delete protection + Firebase deletion, and role-aware prescription serialization (admin sees oversight-only fields). All backend tests green (**45**).

### Exit criteria
✅ Full loop works: doctor creates patient → writes prescription → pharmacist partially dispenses (stays active) → admin invites + views (limited). ✅ Pharmacist cannot reach PHI (verified via test). ✅ Every dispense/invite/PHI access is in `audit_log` (including prescription reads).

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

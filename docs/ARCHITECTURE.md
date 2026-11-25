# AORTAIQ — Architecture

A **modular monolith**: one deployable app, organized into bounded contexts
(`domains/`) with a thin `core/` and shared infrastructure. Chosen over a flat
layered design (the original `routes/` + `services/`) and over microservices
(premature — no infra or team topology that needs independent deploys yet). It is
designed so any domain can later be lifted into its own service without rewrites,
because cross-domain calls already go through the typed contract in
`packages/shared`.

## Backend (`backend/src`)

```
core/                 # cross-cutting, framework-agnostic building blocks
  errors.ts           # AppError + badRequest/conflict/... + central errorHandler
  config.ts           # typed env accessors (no ad-hoc process.env reads)
  logger.ts           # structured console logger (swap for pino/winston later)
  bootstrap.ts        # createApp(): global middleware + mounts domain routers
domains/              # bounded contexts — each owns its HTTP + business logic
  auth/               # register / login / logout / me / invite-peek
  accounts/           # admin: invites, account mgmt, limited patient/prescription oversight
  patients/           # patient records CRUD (route + service)
  prescriptions/      # prescription lifecycle (route + service)
  pharmacist/         # dispense fulfillment (route + service)
  drugs/              # drug autocomplete
  files/              # R2 presigned URLs (route + r2 client)
services/             # cross-domain services (auditLog, inviteLinks)
db/                   # schema, client, migrations, migrator-guard, seed
auth/                 # firebaseAdmin, session, rbac (infra)
middleware/           # authenticate, security, validate (infra)
lib/                  # access rules, r2 (shared infra helpers)
```

Each domain folder exports its configured `Router` from `index.ts`:
`createApp()` (`core/bootstrap.ts`) imports the routers and mounts them at
`/api/<context>`. A domain's `route.ts` talks to its own `service.ts`; the
service is the only place that touches the DB and external integrations.

## Frontend (`frontend/src`)

```
app/                  # bootstrap: main.tsx, App.tsx (routes), guards.tsx
shared/
  lib/                # api client, i18n, useAuth, queryClient, rbac, firebase
  components/         # Layout + shared UI (autocompletes, PasswordInput, PrescriptionPrint…)
  styles/             # index.css, print.css
features/             # co-located pages per bounded context
  auth/ patients/ prescriptions/ pharmacist/ admin/ portal/
```

`features/<context>/pages` is the front-end mirror of the backend `domains/`.
Shared state (auth, API, i18n) lives in `shared/lib`; reusable UI in
`shared/components`.

## Request lifecycle

```
HTTP ─▶ security middleware (Helmet, CORS, rate-limit)
     ─▶ cookie parser
     ─▶ authenticate (verify Firebase session cookie, re-load user+role from DB every request)
     ─▶ per-route requireRole(...)
     ─▶ domain router ─▶ service (business logic + DB/external calls)
     ─▶ JSON response
     ─▶ errorHandler (AppError → { error: code }; never leaks stacks/PHI)
```

## Error model

`core/errors.ts` defines `AppError(code, statusCode)` plus helpers
(`badRequest`, `conflict`, `forbidden`, …). New code should `throw` an `AppError`
instead of hand-writing `res.status(...).json(...)`. The single `errorHandler`
maps any `AppError` to `{ error: <code> }` and logs the rest, never returning a
stack trace or PHI to the client.

## Data organization

- **Soft delete everywhere** — every table has `deleted_at`; `ON DELETE RESTRICT`
  FKs + `BEFORE DELETE` triggers block accidental loss; migrations are
  additive-only (guarded) unless run via the gated `db:danger`.
- **Account integrity** — `uq_users_email_active` is a partial unique index
  (excludes soft-deleted rows) so a deleted email may be reused but two active
  accounts can never share one.
- **Query scalability** — `0004_query_indexes.sql` adds partial indexes on
  `prescriptions(patient_id, doctor_id, doctor_license_id, status, issued_at)`,
  `patients(lower(name))`, `users(role)`, and `audit_log(actor_id, ts)`. Postgres
  does not auto-index foreign keys, so these are explicit.

## Security invariants (do not regress)

- PHI is **doctor/admin-only**; pharmacists receive `403` at the resolver.
- `electronicSignature` is **doctor-only** — stripped for pharmacists and admins.
- Admins see an **oversight-only** prescription view (`serialize()`): prescriber
  name + license, patient pointer, status, date — no drugs, notes, signature, or
  contact PHI.
- Professional IDs (doctor/pharmacist) are **re-derived server-side** from the
  authenticated user on registration, prescription issue, and dispense; the
  client body is never trusted as the source of truth.
- `.env` and the Firebase service-account JSON are gitignored and never printed.

## How to add a domain

1. `mkdir -p backend/src/domains/<name>` with `route.ts`, `service.ts`,
   `index.ts` (export the configured `Router`).
2. Put business logic in `service.ts`; have `route.ts` only parse/validate
   (Zod via `validateBody`/`validateQuery`) and call the service.
3. Mount the router in `core/bootstrap.ts` at `/api/<name>`.
4. On the frontend, add `frontend/src/features/<name>/pages/<Screen>.tsx` and a
   route in `app/App.tsx`.
5. Add tests under `backend/src/test/` using the existing `vi.mock` +
   `x-user` header-injection pattern (`test/routes.test.ts`).

## Scaling out

Because domains are already isolated behind `core/bootstrap.ts` and communicate
through `packages/shared` schemas, promoting one (e.g. `pharmacist`) to its own
service means: move `domains/pharmacist` into a new package, expose its router
over HTTP/gRPC, and have other domains call it via the client. No shared-DB or
circular-dependency surgery required.

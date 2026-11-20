# AORTAIQ — Medical Portal

A medical portal for doctors, pharmacists, and admins, plus a public-facing
journal-style site. Built from the client contract (see `implementation_plan`).

- **Frontend:** Vite + React + TypeScript, Tailwind, React Router, TanStack Query, React Hook Form, Zod, Firebase Auth, i18n (English + Arabic / RTL)
- **Backend:** Node + Express + TypeScript, Drizzle ORM, PostgreSQL, Zod, Firebase Admin, Cloudflare R2
- **Hosting:** Render (Web Service + Static Site + managed PostgreSQL)

## Monorepo layout

```
packages/shared   # Zod schemas + inferred types (single source of truth)
backend/          # Express API
frontend/         # React SPA
```

## Local development

```bash
# 1. Install dependencies
#    (pnpm is provided via corepack — already enabled; no global install needed)
pnpm install

# 2. Configure environment
cp .env.example backend/.env     # then fill in secrets (Firebase, R2, DATABASE_URL, ...)
#    frontend reads VITE_* vars from frontend/.env (or your shell)

# 3. Start local PostgreSQL
docker compose up -d postgres

# 4. Create the schema + seed reference data
pnpm --filter @aorta-iq/backend db:migrate
pnpm --filter @aorta-iq/backend db:seed
```

### Type checks
```bash
pnpm typecheck                                   # tsc --noEmit across all packages (CI gate)
pnpm --filter @aorta-iq/backend typecheck
pnpm --filter @aorta-iq/frontend  typecheck
```

### Tests (backend + frontend, run separately)
```bash
pnpm test                                        # backend suite, then frontend suite
pnpm --filter @aorta-iq/backend test
pnpm --filter @aorta-iq/frontend  test
pnpm --filter @aorta-iq/backend test:cov         # with coverage
```

### Run the app
```bash
pnpm dev                                         # backend :3000, frontend :5173 (hot reload)
# or individually:
pnpm --filter @aorta-iq/backend dev              # tsx watch
pnpm --filter @aorta-iq/frontend  dev            # vite dev server
pnpm --filter @aorta-iq/frontend  build          # production build -> frontend/dist
```

## Accounts to set up (client hand-off)

You (the contractor) need the client to create **three** accounts and share the
values below. See **Linking** for where each value goes.

| # | Account | What the client creates | What they give you |
|---|---|---|---|
| 1 | **Render** | One Render account; you then create a Web Service, a Static Site, and a PostgreSQL instance inside it. | The Postgres connection string + the two service URLs. |
| 2 | **Firebase** | A Firebase project; enable **Authentication → Email/Password**; add a **Web App**. | (a) Web config (`apiKey`, `authDomain`, `projectId`, `appId`) → frontend `.env`; (b) a **Service Account JSON** (Project settings → Service accounts → Generate) → backend `FIREBASE_SERVICE_ACCOUNT_JSON`. |
| 3 | **Cloudflare** (R2) | A Cloudflare account + an **R2 bucket**. | `account_id`, an R2 API token (`access_key_id` + `secret_access_key`), bucket name, and the S3 endpoint `https://<account_id>.r2.cloudflarestorage.com`. |

> Domain (`aorta iq`) is deferred — Render's default `*.onrender.com` URL is used at launch.

## Linking the accounts

**Render (the hub)**
1. Connect Render to this GitHub repo.
2. Create **PostgreSQL** → copy its connection string into backend `DATABASE_URL`.
3. Create a **backend Web Service**: root dir `backend`, Build `pnpm install && pnpm --filter @aorta-iq/backend build`, Start `pnpm --filter @aorta-iq/backend start`. Set env: `DATABASE_URL`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `R2_*`, `SESSION_COOKIE_SECRET`, `ADMIN_EMAIL_ALLOWLIST`, `CLIENT_ORIGIN`, `NODE_ENV=production`.
4. Create a **frontend Static Site**: root dir `frontend`, Build `pnpm install && pnpm --filter @aorta-iq/frontend build`, Publish `frontend/dist`. Set env: `VITE_API_BASE_URL` (backend URL), `VITE_FIREBASE_*`.
5. Custom domain later: Render → Custom Domain → client adds the CNAME.

**Firebase ↔ app:** frontend uses `VITE_FIREBASE_*` via the JS SDK; backend parses `FIREBASE_SERVICE_ACCOUNT_JSON` and initializes the Admin SDK. Admin email allowlist: on invite acceptance, the backend only grants the `admin` custom claim if the email is in `ADMIN_EMAIL_ALLOWLIST`.

**R2 ↔ backend:** an AWS S3 client (SDK v3) pointed at the R2 endpoint with the client's credentials; presigned URLs are generated server-side. The R2 secret never reaches the browser.

**Frontend ↔ backend:** `VITE_API_BASE_URL` + CORS locked to the frontend origin.

## Scripts

```bash
pnpm dev            # run both apps
pnpm typecheck      # tsc --noEmit across all packages (CI gate)
pnpm test           # backend + frontend suites
pnpm --filter @aorta-iq/backend db:migrate   # apply migrations (additive-only)
pnpm --filter @aorta-iq/backend db:danger    # gated destructive migrations
pnpm --filter @aorta-iq/backend db:seed      # seed drugs
```

## Database guardrails (no accidental deletion)

- The runtime DB role has **no `DELETE`/`DROP`** privilege.
- Every core table has a `BEFORE DELETE` trigger that raises an exception.
- Migrations are **additive-only** unless run via `db:danger`, which requires
  `ALLOW_DESTRUCTIVE_MIGRATIONS=1`, a typed confirmation phrase, and (in
  production) a matching `PROD_DESTRUCTIVE_TOKEN`. There is no `-force` shortcut.
- Render Postgres automatic backups + PITR are the final safety net.

## Sessions

Firebase session cookies (`httpOnly`, `SameSite=Strict`), verified on every
request, with roles as tamper-proof custom claims → persistent and uncorrupted
across reloads and deployments.

## Roadmap (3–4 sessions)

- **S1** Foundation: monorepo, auth, DB schema + guardrails, i18n/RTL, tooling.
- **S2** Core loop: patient records, prescriptions, pharmacist fulfillment, admin invites, public portal.
- **S3** Smart features: drug-safety alerts, patient timeline, lab trends, guidelines, QR.
- **S4** Testing pipeline, hardening, Render deploy, guardrail verification.

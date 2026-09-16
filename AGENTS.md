# chor-app-server — agent instructions

## What this repo is
NestJS backend/API for **Chor-App**, a choir repertoire/rehearsal tracker.
Serves the frontend in the sibling `chor-app-client` repo.

## Sibling repos (not a monorepo — kept separate on purpose)
- `../chor-app-docs` — **specs and planning live here.** Before
  implementing any feature, read the relevant spec/proposal there:
  `openspec/specs/`, or an in-flight change under
  `openspec/changes/<change-id>/` (`proposal.md`, `design.md`, `tasks.md`).
  Full domain/product context: `../chor-app-docs/openspec/config.yaml`.
  Draft domain entities: `../chor-app-docs/domain-model.md`.
  Cross-cutting tech decisions (ADRs): `../chor-app-docs/decisions/`.
  This repo has no OpenSpec install of its own; once
  `../chor-app-docs` is registered as OpenSpec store `chor-app`
  (see its AGENTS.md), you can also run
  `openspec show <name> --store chor-app` from here.
- `../chor-app-client` — the frontend that consumes this API.

## Stack & architecture
Decided (see `../chor-app-docs/decisions/0002-server-stack.md` and
`../chor-app-docs/decisions/0003-multi-tenancy-identity.md` for full
rationale — read them before adding a module, touching Prisma, or wiring
email/Swagger/auth):

- **NestJS + TypeScript**, **Prisma + PostgreSQL** for persistence.
- **DDD, one module per bounded context**, model isolated from the DB.
  Inside each bounded-context module:
  - `domain/` — plain TS entities, value objects, domain services,
    repository **interfaces**. No NestJS decorators, no Prisma imports,
    no framework dependency at all.
  - `application/` — use cases orchestrating `domain/` via repository
    ports. Depends on `domain/` only.
  - `infrastructure/` — Prisma-based repository **implementations** of the
    domain's ports, plus Prisma↔domain mappers. Depends on `domain/` and
    Prisma.
  - `interface/` — NestJS controllers + Swagger-decorated DTOs. Depends on
    `application/`. Never imports Prisma; domain entities never get
    Nest/Swagger decorators.
  - Dependency direction: domain → nothing; application → domain;
    infrastructure → domain (+ Prisma); interface → application. Nothing
    leaks into `domain/`.
  - One shared `prisma/schema.prisma` at repo root across all bounded
    contexts; each context's `infrastructure/` only touches its own
    models in it.
- **Multi-tenancy:** `Community` is the tenant root (ADR 0003) — every
  aggregate in every other bounded context carries a `communityId`. A
  `User` can belong to **multiple** Communities via a `CommunityMembership`
  join (per-membership role) — auth/session must carry an "active
  Community" context on every request, there's no single implicit one.
  Registration creates a Community + Administrator User in one step; the
  Administrator invites further Users by email. `Person`
  (pianist/conductor) is a separate entity from `User`, only optionally
  linked, so guest pianists/conductors without logins stay supported, and
  is not shared across Communities. No `MusicalGroup`/ensemble layer
  inside a Community — deliberately deferred (see ADR 0003).
- **Email:** SMTP via `nodemailer`, behind a domain-level port
  (`EmailSender`-style interface), SMTP implementation in
  `infrastructure/`, credentials from env/config. This only fixes the
  transport — *when* to send an email and its content belongs in the
  capability spec that needs it (user invites are a likely candidate).
- **API docs:** `@nestjs/swagger`, decorating only `interface/`-layer DTOs
  (never domain entities). Exact docs route/auth: TBD at scaffolding.

Package manager, lint/test setup, exact bounded-context boundaries: still
**not decided** as of 2026-09-15 — check `package.json`, `prisma/`, and
this file again once that's done, and update this section.

## Language: German UI, English code
**The target UI/UX is German** (the audience). **The domain model and all
code are English** — entity/DTO/field names, endpoints, error messages
returned as codes (not raw German text). Never put German identifiers in
domain/DTOs/entities. Full German<->English mapping:
`../chor-app-docs/glossary.md` (e.g. Vortrag -> Performance, Chorprobe ->
Rehearsal, Dirigent -> Conductor, Klavierspieler -> Pianist, Mappe ->
Folder, Gemeinschaft -> Community). This supersedes an earlier "keep
German in code" instruction from initial setup.

## Documentation language
**Documentation language in this repo: Russian** (decided 2026-09-16).
Everything under `docs/` (feature research, design, plans, e.g.
`docs/feature/<feature>/`) is written in Russian. Code, identifiers,
code comments, API, commit messages stay English; domain terms inside
Russian text use the English names from the glossary (e.g. `Person`,
`Rehearsal`). Specs/ADRs in `../chor-app-docs` stay English.

## Implemented so far
- **Identity & Community** (`src/identity/`, `src/shared/prisma/`):
  registration (creates Community + Administrator User + Membership),
  email+password login, `GET /auth/me`. Auth mechanism is decided — see
  `../chor-app-docs/decisions/0004-auth-mechanism.md` (email+password, JWT
  in `Authorization: Bearer <token>`, not a cookie). Spec:
  `../chor-app-docs/openspec/specs/identity/registration-and-login/spec.md`
  (once archived; until then see
  `../chor-app-docs/openspec/changes/add-identity-community-auth/`).
- Prisma + PostgreSQL connected (`prisma/schema.prisma`,
  `prisma.config.ts` — Prisma 7 reads the connection string from
  `prisma.config.ts`/`@prisma/adapter-pg`, not from `schema.prisma`'s
  `datasource` block).

## Deployment & CI/CD
**Working and deployed.** Full description + known issues:
`../chor-app-docs/decisions/0006-deployment-as-implemented.md` (ADR 0005
is superseded — don't follow it). Summary:
- `.github/workflows/docker-image.yml`, job **`checks`** (every push and
  PR): `npm ci`, `prisma generate`, `npm run lint:check` (eslint incl.
  prettier, no `--fix` — `npm run lint` fixes in place), `npm test` (unit
  tests only; e2e needs a DB), `npm run build`. Runs on Node 20 — keep it
  in sync with the Dockerfile's base image.
- Jobs **`build` → `deploy-to-server`** run only on a **push to `main`**
  after `checks` passed — a PR never deploys. They build the image on the
  runner, copy it + `docker-compose.yml` over SSH to `/opt/chor_app_serv/`
  and run a `set -e` remote script: `docker load` →
  `docker compose run --rm -T server npx prisma migrate deploy` →
  `docker compose down` → `up -d` → fail the job (with logs) unless the
  container is still running without restarts 15 s later.
  `https://chorappserver.wald.pro`, host port `5050` behind the host's TLS
  reverse proxy. Secrets: `SSH_PRIVATE_KEY`, `SERVER_USER`, `SERVER_IP`.
- `Dockerfile`: `node:20-slim`, `npm install` → `prisma generate` →
  `npm run build`, runs `node dist/main`. Keeps devDependencies — the
  deploy's migration step needs the `prisma` CLI from them.
- **Migrations are applied on every deploy, while the old container is
  still serving.** Keep migrations backward-compatible with the previous
  release (add columns/tables first, drop them in a later release). If
  `migrate deploy` fails, the job goes red and production stays on the old
  version.
- **Runtime config** comes from `/opt/chor_app_serv/.env` on the host
  (`env_file` in `docker-compose.yml`), maintained by hand, never in git or
  CI. A new env key must be added there *and* to `.env.example`. Postgres
  runs as a separate container on the host, reached via
  `host.docker.internal:5432`.
- **CORS** (`src/main.ts`): `https://chorapp.wald.pro` + any
  `http://localhost:*`. A new client domain must be added here **and** to
  `chor-app-client`'s `src/utils/apiConfig.ts`.
- Don't re-add `incremental: true` to `tsconfig.json` — together with
  `deleteOutDir` it makes `nest build` emit nothing (missing
  `dist/main.js`).

## Open questions (don't assume — check specs/ADRs or ask)
Invite email mechanics (token/expiry/resend — the channel itself is
decided: email), role granularity beyond Administrator/member,
SMTP server details (self-hosted vs. relay), an "active Community" guard
for Community-scoped requests (nothing is Community-scoped yet besides
Identity itself), and exact bounded-context boundaries beyond Identity &
Community. See `../chor-app-docs/openspec/config.yaml`,
`../chor-app-docs/decisions/0002-server-stack.md`,
`../chor-app-docs/decisions/0003-multi-tenancy-identity.md`, and
`../chor-app-docs/decisions/0004-auth-mechanism.md`.

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

## Open questions (don't assume — check specs/ADRs or ask)
Concrete auth mechanism, invite email mechanics (token/expiry/resend —
the channel itself is decided: email), role granularity beyond
Administrator/member, hosting, SMTP server details (self-hosted vs.
relay), and exact bounded-context boundaries. See
`../chor-app-docs/openspec/config.yaml`,
`../chor-app-docs/decisions/0002-server-stack.md`, and
`../chor-app-docs/decisions/0003-multi-tenancy-identity.md`.

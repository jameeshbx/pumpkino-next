# Pumpkino

A B2B travel platform connecting **travel agencies** with **DMCs** (destination management companies): a lead-pipeline CRM for agencies, a quote-request inbox for DMCs, a curated DMC marketplace, subscription billing, and a platform-ops admin console.

Built from the prototype in `prototype/pumpkino` (the PRD in `prototype/pumpkino/Pumpkino_PRD.md` is the business source of truth).

## Tech stack

- **Frontend** — Next.js 15 (App Router), TypeScript (strict), Tailwind CSS 4, shadcn-style UI on Radix primitives, React Hook Form + Zod, TanStack Query, Lucide icons
- **Backend** — Next.js Server Actions & Route Handlers, Prisma ORM, PostgreSQL 17, Auth.js v5 (NextAuth) Credentials + JWT sessions, bcrypt
- **Dev environment** — Docker Compose (PostgreSQL + one-shot migrate/seed service)

## Quick start

Prerequisites: Docker, Node.js ≥ 20.

```bash
cp .env.example .env      # defaults work for local development
docker compose up -d      # starts PostgreSQL, applies migrations, seeds data
npm install
npm run dev               # http://localhost:3000
```

`docker compose up -d` starts the database **and** runs a one-shot `migrate` container that waits for the DB health check, applies `prisma migrate deploy`, and runs the seed. The database is immediately usable.

### Seeded accounts

All demo users share the password `Pumpkino!Demo2026` (platform ops password comes from `SEED_ADMIN_PASSWORD`, default `ChangeMe!Ops2026`).

| Login | Surface | Role |
| --- | --- | --- |
| `ops@pumpkino.test` | `/admin` | Platform Ops Admin |
| `agentadmin@pumpkino.test` | `/dashboard` | Agency Owner (paid Growth plan) |
| `arjun@pumpkino.test` | `/dashboard` | Agency Manager |
| `meera@pumpkino.test` | `/dashboard` | Team Lead |
| `kiran@pumpkino.test` | `/dashboard` | Executive (reports to Team Lead) |
| `anand@pumpkino.test` | `/dashboard` | Destination Head |
| `accounts@pumpkino.test` | `/dashboard` | Accounts (no lead access) |
| `rahul@pumpkino.test` | `/dashboard` | Trial agency owner |
| `dmcadmin@pumpkino.test` | `/dmc` | DMC Owner (verified, listed) |
| `omar@pumpkino.test` | `/dmc` | DMC Owner (verification pending) |

### Useful scripts

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # prisma generate + next build
npm run db:migrate  # create a new migration after schema changes
npm run db:seed     # re-run the seed (idempotent upserts)
npm run db:reset    # drop, re-migrate, re-seed
```

## Architecture

Clean Architecture with a feature-based presentation layer:

```
src/
  domain/           # Pure business rules — no framework, no I/O
    billing/        #   plan definitions, gateway routing, tax defaults
    pipeline/       #   lead/request lifecycle rules, refund gates
    rbac/           #   role model, lead-visibility scopes, role-creation matrix
    errors.ts       #   domain error types
  application/      # Use cases — orchestrate domain + infrastructure
    auth/           #   session context, signup, password reset/change
    leads/          #   lead lifecycle + role-scoped visibility
    quotes/         #   DMC quote-request lifecycle (PMK-Q / PMK-B IDs)
    users/          #   team management with cascade rules
    listings/       #   DMC self-service listing & packages
    billing/        #   subscribe/cancel with mock gateways
    marketplace/    #   paid-gating rules
  infrastructure/   # I/O adapters
    db/             #   Prisma client singleton
    auth/           #   NextAuth config, bcrypt, single-use tokens
    security/       #   DB-backed rate limiter
    audit/          #   audit log writer
    payments/       #   payment gateway port + mock adapter
    email/          #   mailer port + console adapter
    sequences/      #   atomic PMK-Q/PMK-B/PMK-INV counters
  features/         # Feature modules: schemas + server actions + components
    authentication/ leads/ team/ quotes/ packages/ marketplace/
    billing/ settings/ verification/ admin/
  app/              # Next.js App Router (presentation only)
    (marketing)/    #   public pages, pricing, legal
    (auth)/         #   login/signup/reset flows
    (agency)/       #   /dashboard — agency CRM surface
    (dmc)/          #   /dmc — DMC portal surface
    (admin)/        #   /admin — platform ops console
    marketplace/    #   DMC discovery (gated)
  shared/           # UI kit, layout shells, utilities, validation
```

Rules of the layering: UI components contain no business logic; `domain/` imports nothing from other layers; `application/` talks to Prisma through use cases that server actions call after auth + Zod validation.

## Authentication & authorization

- **Auth.js v5 Credentials provider**, JWT session strategy, bcrypt (12 rounds), HTTP-only `SameSite=Lax` cookies (`Secure` in production), 24 h session expiry with rolling refresh.
- **Account lockout**: 5 failed attempts → 15-minute lock (per user, persisted).
- **Flows**: signup (agency or DMC), email verification, forgot/reset password (hashed single-use tokens, 1 h TTL), change password, logout.
- **RBAC** is database-driven and configurable: `Role` ⇄ `Permission` join tables; permissions are re-read from the DB on every request (not baked into the JWT), so role changes take effect immediately. Navigation, pages, server actions, and route handlers all check the same permission keys.
- Role-specific business rules (who can create which roles, lead-visibility scoping: all / team / destinations / assigned / none) live in `src/domain/rbac/roles.ts`.

## Security controls (OWASP-aligned)

| Area | Implementation |
| --- | --- |
| Injection | Prisma parameterised queries only; no raw SQL; CSV export cells are quote-escaped and formula-prefixed (`'`) against CSV injection |
| XSS | React output encoding; no `dangerouslySetInnerHTML`; strict CSP with per-request nonce (middleware) |
| CSRF | Auth.js built-in CSRF for auth routes; server actions use Next.js origin checks; `SameSite=Lax` cookies |
| Headers | CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS (production) |
| Rate limiting | DB-backed fixed window on login, signup, password reset, public API (swap for Redis behind the same interface for multi-region) |
| Secrets | Zod-validated environment (`src/shared/lib/env.ts`); no hardcoded secrets; `AUTH_SECRET` rotation invalidates old JWTs |
| Errors | Domain errors surface safe messages; unexpected errors log server-side (structured JSON) and the client sees a generic message — never a stack trace |
| Audit log | Login/logout/lockout, signup, password changes, role changes, user suspension/removal, verification reviews, account suspension, subscription changes, quote/booking events, lead lifecycle events, listing/dispute updates — with actor, IP, and user agent |
| Passwords | bcrypt, 10+ char policy with upper/lower/digit, timing-safe verification (dummy hash comparison for unknown users) |

## Business rules worth knowing (from the PRD)

- **Stage vs outcome are separate.** `stage` is pure funnel position; `lifecycleStatus` (`ACTIVE`/`LOST`/`CANCELLED`) carries the outcome, with `exitedAtStage`, reason codes, `initiatedBy`, payment state, and refund status.
- **Mark lost** is only possible pre-payment; once money is involved it's a **cancellation**, which starts refund tracking automatically (advance vs full payment).
- **Reopening** a cancelled record whose refund is already `PROCESSED` requires an explicit confirmation — refunds are never auto-reversed.
- **Quote IDs (`PMK-Q-…`) are created only when a DMC actually sends a quote; booking IDs (`PMK-B-…`) only when fully paid.** Both come from an atomic per-year sequence table.
- **Team model uses explicit references**: an Executive's `teamLeadId` points at a user. Changing a Team Lead's role or removing them explicitly clears their reports (with a warning naming them); suspension does *not* clear links (it's reversible).
- **Verification is decoupled from access** — unverified accounts can use the product; verification gates the marketplace *listing* badge, not login.
- **Marketplace gating**: free/trial agencies see masked DMC names and can't contact; paid plans unlock discovery.

## Assumptions (not inferable from the prototype)

1. **Payments are mocked.** The PRD defers real Razorpay/PayPal integration; a gateway port with a mock adapter is wired so checkout/cancel flows work end-to-end. Payment state on cancellation is inferred from stage (`PAYMENT` ⇒ advance paid, `DONE` ⇒ fully paid) because granular payment records are out of scope for this phase.
2. **Email is console-only.** Verification/reset emails are logged via a mailer port (`src/infrastructure/email/mailer.ts`); swap in a real provider without touching use cases.
3. **New team members get a one-time temporary password** shown to the admin at creation (no email provider), and should change it after first login.
4. **DMC marketplace listings** start as `DRAFT` and are published by platform ops (the prototype showed admin curation but not the DMC-side publishing trigger).
5. **File upload for verification** is represented by a `fileAttached` flag; binary storage/virus-scanning hooks are stubbed at the storage abstraction, not implemented.
6. **Quote requests are asynchronous** (inbox model), matching the prototype's stage-based flow; there is no real-time chat.

## Environment constraint & verification

The authoring environment's shell was unavailable (host-level failure), so `npm install` / `next build` / `eslint` could not be executed here. The initial migration (`prisma/migrations/20260724000000_init/`) was hand-written to match `schema.prisma` exactly. To verify locally:

```bash
npm install
npm run typecheck && npm run lint && npm run build
```

If Prisma ever reports schema drift against the hand-written migration, regenerate it with:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

and compare against `prisma/migrations/20260724000000_init/migration.sql`.

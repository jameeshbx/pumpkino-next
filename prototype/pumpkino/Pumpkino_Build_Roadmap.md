# Pumpkino — Build Roadmap: Prototype to Production SaaS
*Master execution plan tying together Pumpkino_PRD.md, Pumpkino_AI_Assistant_Plan.md, and Pumpkino_WhiteLabel_and_Omnichannel_Plan.md into one ordered build sequence. This is the document to hand a developer (or Claude Code) as "start here" — it says what to build, in what order, on what stack, and why that order.*

## 1. Tech stack — concrete recommendation, not a menu

Picking one option per layer and moving on beats an open-ended stack debate. This is sized for a small team (1-4 engineers) getting to a real product fast, not for a company that already has infrastructure conventions.

| Layer | Recommendation | Why |
|---|---|---|
| Frontend + backend | Next.js (React) | One framework for both marketing site and app, server-rendering for the public marketing/marketplace pages (matters for SEO on "DMC in Kerala" type searches), API routes for backend logic without standing up a separate service on day one. |
| Database | PostgreSQL | Matches the relational schema already sketched in the PRD (accounts, users, subscriptions, listings, quote requests) — clean foreign keys, no reason to reach for NoSQL here. |
| ORM | Prisma | Type-safe, fast to iterate on schema changes, pairs well with Next.js + Postgres. |
| Auth | A managed provider (Clerk or Supabase Auth) over building it yourself | Multi-tenant, role-based auth (Agency/DMC/Admin, plus sub-user roles per account) is easy to get subtly wrong. Buying this early is a good trade of money for time and security. |
| File storage | Cloudflare R2 or AWS S3 | Logos, verification documents, invoice/itinerary PDFs. |
| Payments | Razorpay SDK (India) + PayPal SDK (international) | Already decided in the PRD's payment strategy — country-based routing, manual override at checkout. |
| Transactional email | Postmark or Resend | Verification emails, reminders; simpler to start than raw AWS SES, upgrade path to custom sending domains later (see the white-label plan). |
| Background jobs | Start simple: a scheduled cron function (Vercel Cron or a single node-cron process) | The reminder engine (Section 4 of the AI plan) is a set of periodic checks, not a high-throughput queue — don't reach for Redis/BullMQ until you actually have queueing problems. |
| AI | Anthropic Claude API (tool-use for structured itinerary output) | Assumed throughout the AI Assistant Plan. |
| Hosting | Vercel (app) + a managed Postgres (Railway, Render, or Supabase) | Minimal ops overhead for a small team; revisit only once traffic or cost patterns demand it. |

**How the existing prototype fits in:** it is not code to be "productionized" — it's the UI/UX and behavior spec. Every screen, gating rule, and copy line in the ~18 HTML files should be the reference a developer builds against in the real stack above. The PRD's file-to-feature map tells you which HTML file covers which feature.

## 2. Phase 0 — Foundation (before any feature work)

- Repo, CI/CD (lint + typecheck + build on every PR at minimum), staging + production environments.
- Port the design system: the prototype's CSS custom properties (`--primary`, `--secondary`, `--r-btn`, etc.) map directly onto a Tailwind theme config or CSS variables in the real app — this is largely copy-paste, not redesign.
- Postgres schema from the PRD's Section 8 (and the additions in the white-label/omnichannel doc) migrated via Prisma.
- Auth wired up with three role types (Agency, DMC, Ops Admin) and the sub-user role matrix already defined in the Agency dashboard prototype (Travel Agent Admin, Manager, Team Lead, Destination Head, Destination Manager, Executive, Accounts).

## 3. Phase order and why

Each phase only depends on what's already listed above it — build in this order rather than in parallel across phases, since later phases (marketplace, AI, WhatsApp) all assume the account/subscription/role model underneath them already works.

**Phase 1 — Signup, login, trial, non-blocking verification.**
Account creation for both roles, instant trial activation (no gate), the Profile page's optional GSTIN/business-doc submission, email verification. Reference: `pumpkino-signup.html`, `pumpkino-login.html`, `pumpkino-profile.html`, `pumpkino-verify-email.html`, `pumpkino-forgot-password.html`, `pumpkino-onboarding.html`. *Why first:* everything else needs an authenticated account to attach to.

**Phase 2 — Subscription & billing.**
Plan tiers, Razorpay/PayPal checkout, invoice generation, plan-gating middleware (a single "does this account's plan allow X" check, reused everywhere gating is needed later — marketplace identity, dashboard AI caps, DMC search caps, all read from this one place). Reference: `pumpkino-pricing.html`, `pumpkino-subscription.html`. *Why second:* almost every later feature (marketplace gating, AI caps, white-label) checks plan status, so the gating check needs to exist before those features do.

**Phase 3 — Core agency workflow.**
Leads/pipeline, CRM, itinerary editor (manual entry — AI comes in Phase 6), the agency's private DMC address book, payments/invoices, users & roles, settings (including the logo upload that already has a UI slot). Reference: `pumpkino-Agent-dashboard-final-v2.html`. *Why third:* this is the day-to-day product an agency actually lives in; it should work end-to-end manually before AI/automation layers are added on top of it.

**Phase 4 — DMC portal.**
Inventory management, quote responses, users/roles on the DMC side. Reference: `dmc-portal-final-v2.html`. *Why fourth:* the marketplace's quote-request flow (Phase 5) needs somewhere real to land — this is that destination.

**Phase 5 — Marketplace (admin-curated listings first).**
Public DMC directory and detail pages, paid-plan identity gating (masked name/location for trial, full for paid), search, quote requests that land in the DMC portal's inbox from Phase 4. Reference: `pumpkino-marketplace.html`, `pumpkino-dmc-detail.html`. Admin-curated listings (`pumpkino-admin.html` → Marketplace Listings) ship alongside this — DMC self-serve listing management is the deferred two-sided flow, not part of this phase. *Why fifth:* needs both a working DMC portal to receive requests and a working subscription/plan-gate to enforce the identity rule.

**Phase 6 — Admin console.**
Verification queue, accounts management, disputes, revenue reporting, CSV exports. Reference: `pumpkino-admin.html`. *Why sixth:* by this point there's real account/subscription/verification/dispute data worth managing — building the admin console earlier means managing an empty database.

**Phase 7 — AI assistant: itinerary generation + reminders.**
Follow the phased build order already laid out in Pumpkino_AI_Assistant_Plan.md Section 6a (eval set → test harness → wire into the Phase 3 itinerary editor → reminders rule engine → LLM wording layer). *Why seventh:* it plugs directly into the itinerary editor and lead pipeline built in Phase 3 — building it earlier means bolting AI onto UI that doesn't exist yet.

**Phase 8 (held, deferred) — WhatsApp, then Instagram/Messenger.**
Explicitly held out of the initial build per decision — launch does not depend on this. When picked back up: follow Pumpkino_WhiteLabel_and_Omnichannel_Plan.md Section 3 (Meta Business Manager setup, webhook receiver, message classification reusing the Phase 7 model call, auto-lead-creation into the Phase 3 leads table, new Inbox nav item). *Why it would come eighth, whenever it's resumed:* it feeds leads into the exact pipeline built in Phase 3 and classifies them using the AI call built in Phase 7 — both need to already exist. Holding it also removes Meta's WhatsApp Business Account approval process (a real calendar-time dependency outside anyone's control) from the launch critical path entirely — see the updated numbers in `Pumpkino_Cost_Timeline_Estimate.md`.

**Phase 9 — White-label branding + custom sender identity.**
Per-account branding object driving the CSS variables from Phase 0, "Powered by Pumpkino" badge gating by plan, sender-identity display name (custom domain sending deferred further per the white-label doc's recommendation). *Why ninth:* it's a cross-cutting cosmetic/trust layer over a product that should already work end-to-end — polishing an unfinished product's branding is wasted effort.

**Phase 10 — Hardening and launch prep.**
Security review (payments, PII, verification documents are all sensitive data), load testing on the reminder cron and AI call paths, backup/disaster recovery for Postgres, India DPDP Act and general privacy compliance review (the prototype's `pumpkino-privacy.html` already flags this as a consideration), and a real QA pass against every gating rule in the PRD (trial caps, plan gates, verification states) before opening signups publicly. Full launch and scaling checklist — legal entity setup, the RBI payment-aggregator question, real legal review of the ToS/Privacy/Refund drafts, payment operations, marketplace cold-start strategy, and post-launch scaling triggers — is in the companion `Pumpkino_GoLive_and_Scaling_Plan.md`.

**Phase 11 (future, deferred) — In-platform Agency↔DMC fund transfer.** At launch, agencies and DMCs settle trip payments directly with each other — Pumpkino only charges its own subscription fee. There's an explicit intent to later have Pumpkino collect the trip payment and settle the DMC's share itself (faster payouts, one less manual step, a new platform-fee revenue line). Do not build this without re-confirming scope first — it re-opens the RBI Payment Aggregator question flagged in `Pumpkino_GoLive_and_Scaling_Plan.md`, which also notes that Razorpay Route and PayPal's marketplace payout products are built for exactly this pattern and meaningfully lower the compliance lift versus Pumpkino becoming its own licensed PA. The DMC-side bank fields this needs already exist in `dmc-portal-final-v2.html`'s `dmcBusiness` object.

## 4. Team composition to execute this

A realistic minimum team: one full-stack engineer who can own Phases 1-6 end to end, one engineer (can be the same person if timeline allows) who owns Phase 7's AI integration and prompt iteration, and — before Phase 8 specifically — someone who can own the Meta Business Platform relationship (application/review process, compliance with WhatsApp template rules) since that's as much an operational/compliance task as an engineering one. Payments (Phase 2) and the DPDP/privacy review (Phase 10) both benefit from at least a consulting pass by someone with relevant legal/compliance experience — this document is not a substitute for that review.

## 5. How to actually start (this week)

1. Confirm the tech stack in Section 1 (or swap in your team's existing conventions if you already have them).
2. Stand up Phase 0.
3. Hand this document, the PRD, and the two companion plans to whoever is building Phase 1 — they now have the full sequence and don't need to re-derive it from the prototype alone.

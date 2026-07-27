# Pumpkino — 3-Month Agile Launch Plan (Claude Code)
*Companion to Pumpkino_Cost_Timeline_Estimate.md. That document estimated 4.5–6.5 months solo or 3–4.5 months for a two-person team with Claude Code (Phase 8 held). Three months is achievable, but it's the optimistic edge of the two-person estimate, not a comfortable target for two people — this plan gets there with a 3-person team, maximum parallelization, and an explicit, pre-agreed list of what gets cut first if a sprint runs long. That last part matters as much as the schedule itself: an aggressive timeline without a pre-committed cut list usually turns into the security/hardening phase quietly getting rushed instead, which is the one phase that should never be rushed.*

## 1. Team and why three, not two

| Role | Owns |
|---|---|
| Lead (full-stack, owns architecture + coordination) | Foundation, subscription/billing, AI assistant, final hardening |
| Dev A | Agency dashboard, white-label |
| Dev B | DMC portal, marketplace (paired with Dev A), admin console |

Three people × 12 weeks × ~40 hrs/week = 1,440 person-hours of capacity against a Claude Code-assisted scope of roughly 800–1,100 hours (per the estimate doc, Phase 8 excluded). That gap — not a razor-thin margin — is the actual reason three months is achievable: it leaves real room for code review, coordination overhead, and the dependency chain not perfectly parallelizing, rather than assuming everything goes right.

## 1a. What expertise each of the three actually needs

Generic "full-stack developer" isn't specific enough to hire against for this project — the risk phases (payments, auth, AI) need someone who's done that exact kind of work before, not just someone who can build CRUD screens quickly.

**Lead — the one role where experience matters most, since they own every high-risk phase:**
- Payment gateway integration experience specifically — Razorpay and/or PayPal, not just "I've integrated Stripe once." Webhook handling, idempotency, and reconciliation are where inexperience shows up as bugs that cost money, not just time. This is the single most important thing to screen for in this hire.
- Multi-tenant auth and role-based access control (RBAC) — this project has a 7-role permission matrix per account; someone who's only built single-tenant, single-role auth will underestimate this.
- LLM/AI API integration — Claude API or equivalent, specifically tool-use/function-calling for structured output, and enough prompt-engineering experience to run the eval-set iteration loop described in the AI Assistant Plan without floundering.
- PostgreSQL schema design + an ORM (Prisma or equivalent), and enough security fundamentals to meaningfully lead the Sprint 6 review, not just delegate it.
- Technical leadership: this person owns CLAUDE.md, the overall architecture, and coordinating Dev A/Dev B — some prior lead or senior-engineer experience, not just strong IC skills.

**Dev A — Agency dashboard + white-label:**
- Strong React/Next.js frontend experience with complex, stateful UI — the Agency dashboard is effectively a CRM, kanban board, itinerary builder, and invoicing system in one, which is a lot of detailed interactive UI, not simple forms.
- Specifically valuable: experience *porting* an existing design/prototype into a component framework, rather than only building from a spec document — this project hands them an exact HTML/CSS/JS reference to translate, which is a different (and rarer) skill than greenfield UI work.
- CSS architecture / theming systems, for the white-label branding work (CSS variables driving per-tenant theming).
- File upload handling (logo, verification documents) and PDF generation (invoices, itineraries) — both explicitly needed features, not incidental.
- Solid-enough backend skills to write their own API routes for CRM/leads/itinerary data — still full-stack, just frontend-leaning.

**Dev B — DMC portal, marketplace pairing, early hardening:**
- Same React/Next.js strength as Dev A, applied to the DMC portal's inventory/quote-inbox/booking screens.
- Search/filter/sort implementation experience for the marketplace, and comfort with two-sided-marketplace data modeling (listings, packages, paid-gating rules).
- Since this role starts Phase 10 early: some QA/test-automation experience and familiarity with a load-testing tool (k6, Artillery, or similar) — this role is doing real security/testing prep work in Sprint 5, not just more feature-building.

**All three, regardless of role:** comfortable actually working with Claude Code itself — effective prompting, reviewing AI-generated diffs critically rather than rubber-stamping them, and using Plan Mode before big changes. That's a genuinely different skill from traditional hand-coding ability, and it's the one this whole plan depends on to hit the compressed timeline — screen for it in the interview (e.g., ask a candidate to walk through how they'd review a Claude Code-generated pull request) rather than assuming any developer picks it up equally well.

## 2. Sprint structure

Six two-week sprints. Each sprint: Monday sprint planning (map that sprint's roadmap items to a sprint backlog), daily 15-minute standup, Friday-of-week-2 sprint review (demo working software — this project has been built demo-first from day one, keep that habit), then a short retro before planning the next sprint.

**Definition of Done, every sprint, no exceptions:** code reviewed by at least one other team member, `node --check` (or the real stack's equivalent) passes, the feature is verified against its specific gating rule in the PRD (trial vs. paid, role permissions, etc.) — not just "looks right in the browser" — and it's deployed to staging, not just running locally.

### Sprint 1 (Weeks 1–2) — Foundation and three navigable shells
- **Lead:** repo/CI, Postgres schema, auth provider integration, the 7-role permission matrix, CLAUDE.md setup pointing at all six planning documents, design-system port from the prototype's CSS variables.
- **Dev A:** signup/login pages, Agency dashboard shell and nav.
- **Dev B:** DMC portal shell and nav, admin console shell and nav.
- **Sprint goal:** auth works end to end; all three portals exist and are navigable; a user can sign up as either role and land on their (still mostly empty) dashboard.

### Sprint 2 (Weeks 3–4) — Billing, and both dashboards' cores
- **Lead:** Razorpay + PayPal integration, plan-gating middleware, country-based gateway routing.
- **Dev A:** Agency dashboard — leads/pipeline CRM, manual itinerary editor, private DMC address book.
- **Dev B:** DMC portal — quote inbox, packages/destinations, inventory.
- **Sprint goal:** an agency signs up, gets a trial, and has a working CRM; a DMC signs up and sees quote requests; subscription checkout works against sandbox accounts.

### Sprint 3 (Weeks 5–6) — Both dashboards feature-complete
- **Lead:** onboarding checklist, self-serve verification (Profile page), tax settings wired into both dashboards' Settings screens.
- **Dev A:** Agency dashboard — payments/invoices, users/roles, branding/logo settings.
- **Dev B:** DMC portal — bookings, payments/invoices, users/roles, tax settings.
- **Sprint goal:** both dashboards match the PRD in full; every role in the permission matrix is actually enforced, not just documented.

### Sprint 4 (Weeks 7–8) — Marketplace and admin console
- **Lead:** admin console — verification queue, accounts management, disputes, revenue reporting, marketplace-listings CRUD, CSV exports.
- **Dev A + Dev B, paired:** marketplace — public directory, search/filter, DMC detail pages, paid-plan identity gating, quote requests wired to the real DMC portal inbox built in Sprint 2. Pairing here specifically because this feature genuinely needs both sides working together, not because pairing is the default.
- **Sprint goal:** Ops can manage the whole platform; the marketplace is live end to end, correctly gated, and a quote request sent from it lands in a real DMC's inbox.

### Sprint 5 (Weeks 9–10) — AI assistant and white-label
- **Lead:** AI assistant — the eval set and test harness first, then wiring itinerary generation into the existing editor, then the reminders rule engine and LLM wording layer.
- **Dev A:** white-label — branding propagation into the app chrome, "Powered by Pumpkino" badge gating by plan, display-name sender identity for email.
- **Dev B:** starts Phase 10 early — security review prep and load-testing setup on what's already built, rather than waiting for Sprint 6 to begin hardening from zero.
- **Sprint goal:** AI-drafted itineraries appear in the editor and are reviewable before sending; reminders fire correctly; branding actually changes what a customer sees per account.

### Sprint 6 (Weeks 11–12) — Hardening and soft launch
- **All three:** security review, load testing, backup/disaster-recovery drill (actually restore from a backup, don't just take one), DPDP compliance pass, a full QA sweep against every gating rule in the PRD, bug bash.
- **Also this sprint, not after it:** recruit and list a first real batch of DMCs (per the marketplace cold-start guidance in the Go-Live doc) so the soft launch isn't an empty marketplace.
- **Sprint goal:** production-ready. Launch as an invite-only soft launch at the end of week 12 — a small known set of agencies and DMCs — before opening public signup, so real-world bugs surface against a forgiving audience first.

## 3. The pre-agreed cut list — decide this now, not mid-sprint-6

If a sprint runs over, cut in this order. Deciding this now, while there's no schedule pressure, is what keeps a rushed sprint from turning into a rushed security review instead.

1. **Cut first:** reminders (part of Phase 7) — ship itinerary generation without the reminders rule engine; add it as a fast-follow in the first weeks post-launch.
2. **Cut second:** white-label (Phase 9) — launch without per-account branding; agencies use Pumpkino's default branding for the first few weeks, add white-label as a fast-follow.
3. **Never cut:** anything in Sprint 6. Security review, backup/restore testing, and gating-rule QA are the one place where "we'll fix it after launch" is the wrong call — these are exactly the things that are expensive to get wrong after real users and real payments are involved.

## 4. What's already out of scope, so it doesn't quietly creep back in

Phase 8 (WhatsApp/Instagram/Messenger) and Phase 11 (in-platform Agency↔DMC fund transfer) are held per earlier decisions and are not part of this 3-month plan at all — not even a stretch goal. If either comes up mid-build as "since we're already in there, let's just add it," that's scope creep against an already-aggressive schedule; re-run the numbers in `Pumpkino_Cost_Timeline_Estimate.md` before agreeing to it, don't just absorb it into the current sprint.

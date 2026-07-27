# Pumpkino — Product Requirements Summary
*Handoff reference for engineering (Claude Code or a developer). Derived from a clickable HTML/CSS/JS prototype — no real backend exists yet. Every rule and screen below is implemented and demonstrable in the prototype files; treat this as the spec, and the HTML files as the reference UI/UX.*

## 1. What this is, and what it isn't

Pumpkino is a SaaS platform connecting travel agencies with DMCs (Destination Management Companies). The prototype is a set of ~18 standalone HTML files, each with its own in-memory JS seed data — there is no shared database, no real authentication, no real payment processing, and no persistence between page loads. Every "save," "approve," or "pay" action only mutates local JS state for that one file.

Use this document to build the real thing: a proper backend (API + database + auth), real Razorpay/PayPal integration, and one shared data layer that every surface (marketing site, agency dashboard, DMC portal, admin console) reads from.

## 2. User roles

| Role | Description |
|---|---|
| Travel Agency | Signs up, gets an instant 7-day free trial, searches the DMC marketplace, sends quote requests, subscribes to a paid plan. |
| DMC (Destination Management Company) | Signs up for free (no subscription), receives/responds to quote requests, can be listed on the marketplace. |
| Ops Admin (internal) | Pumpkino staff. Reviews verification submissions, manages accounts, resolves disputes, curates marketplace listings, exports reports. |

Both Agency and DMC share the same signup/login pages with a role toggle; Ops Admin has a separate, unauthenticated internal console (`pumpkino-admin.html`).

## 3. Core data model

### Team assignment (Agency dashboard, Users & Roles)
Executives report to exactly one Team Lead via an explicit `teamLeadId` reference — not a shared label. Earlier versions of this prototype matched Team Lead ↔ Executive purely by a shared `teamType` string ("Sales"/"Operations"), which breaks the moment two Team Leads share the same team name (their rosters would silently merge). The real model:
```
user.role: 'Team Lead' -> { teamType }               // cosmetic display label only, e.g. "Sales team"
user.role: 'Executive' -> { teamLeadId: <user.id> | null }  // the actual, real reporting link
```
A Team Lead's visible pipeline = leads assigned to Executives where `teamLeadId === thisTeamLead.id`, plus the Team Lead's own leads. When a Team Lead is removed, or their role changes away from Team Lead, any Executive pointing at them has `teamLeadId` cleared to `null` (shown as "Not assigned to a Team Lead") rather than left silently dangling. Suspending a Team Lead (reversible) does not clear the link, but the UI surfaces how many reports are affected. See Section 4 for the full assignment/modification flow.

### Account (Agency or DMC)
```
id, type: 'agency' | 'dmc'
name, contact, email, city, state, country
plan: 'trial' | 'free' | 'starter' | 'growth' | 'scale'
trialDaysLeft: number | null
verification: 'not_submitted' | 'submitted' | 'approved' | 'rejected'
suspended: boolean
joined: date, mrr: number, gateway: 'razorpay' | 'paypal' | null
docs: { gstin?, iata?, bizReg?, extra? }   // present once verification is submitted
```
Key rule: **account access and verification status are fully decoupled.** Signing up (agency) or completing signup (DMC) grants immediate, full product access — trial or free plan — regardless of verification state. Verification is a separate, optional, non-blocking compliance layer that can be completed any time from the agency/DMC's own Profile page.

### Subscription plan (Agency only; DMC is always free)
| Plan | Price (INR/mo) | Notes |
|---|---|---|
| Trial | ₹0 | 7 days, auto-granted on signup, no card required |
| Starter | ₹1,499 | Solo agents / very small agencies |
| Growth | ₹4,999 | Growing agencies, unlocks marketplace + automation |
| Scale | ₹14,999 | Multi-branch agencies |

Only **paid** plans (Starter/Growth/Scale) — not trial — unlock: DMC real name/exact location on the marketplace, sending quote requests, and the uncapped global DMC directory search inside the agency dashboard. Trial and unsubscribed users can still browse freely, but see masked identity ("✓ Verified DMC — Kerala" instead of the real name) and a capped result count (3 results, rest locked) wherever DMC search appears.

### Tax profile (Agency and DMC, both admin-editable)
```
account.country            // now captured at signup for both roles — used to infer tax defaults
account.taxProfile = { schemeKey, rate, appliesTo }
```
Both the Agency dashboard and DMC portal now ask for country at signup and expose an admin-only "Tax settings" screen (Settings → Tax) that pre-fills a country-appropriate default, always editable, never enforced as the only option. Researched defaults (July 2026, verify before relying on long-term): India — GST 5% (no ITC, presumptive tour-operator rate) or 18% (with ITC), applied to total package price; UAE — VAT 5% under the Tour Operator Margin Scheme (TOMS), applied to margin only (sale price minus DMC/supplier cost), zero-rated on margin for international packages; Thailand — VAT at its reduced 7% rate, applied to total package price; all other countries — a blank custom rate the admin sets themselves. These are starting points, not tax advice — the in-app copy says so explicitly, and a real build should keep that disclaimer alongside a "confirm with your accountant" nudge.

### Payment gateway routing
Billing country decides the default gateway (manual override always available at checkout): India → Razorpay (INR); everywhere else → PayPal (USD). Both are currently mocked — no real API calls, no webhooks.

### DMC Marketplace Listing
```
id, name, city, country, destinations: [], services: []
verified: boolean, bookings: number, responseHrs: number
desc, reviews: [{agency, rating, comment, date}]
packages: [{id, title, dest, duration, price, unit, icon, highlights: []}]
status: 'published' | 'draft'   // admin-curated field, phase-1 only
```
Phase-1 note: DMCs do not yet have a self-serve listing editor. Ops Admin curates listings on their behalf (`pumpkino-admin.html` → Marketplace Listings). This is intentionally deferred — see Section 6.

### Quote and booking identifiers (DMC portal)
A `quoteId` is generated the moment a DMC actually sends a quote (`sendQuote()`), not before — a request sitting at `new`/`review` has no quoteId, since nothing's been quoted yet. A `bookingId` is generated the moment a booking is fully paid (`markAgentFullyPaid()`), and always carries the originating `quoteId` forward, so a booking can be traced back to the exact quote it was made against.
```
request.quoteId    // set at stage='sent',  format PMK-Q-{year}-{5-digit sequence}
request.bookingId  // set at stage='done',  format PMK-B-{year}-{5-digit sequence}
```
Both IDs are also copied onto the payment (`agentPayments`) and invoice records created at booking-confirmation time, so either can be looked up directly without joining back through the request. In the current per-file demo this is a local, in-memory sequence; the real build should generate these from a shared, atomic counter (or a DB sequence/UUID) so two DMCs sending quotes at the same moment can never collide.

### Lost / cancelled outcomes (both dashboards — now implemented in the prototype)
Both `lead.stage` (Agency dashboard, customer-facing funnel) and `request.stage` (DMC portal, DMC-facing funnel) were pure happy-path enums — every value moved forward one step; nothing represented a quote being turned down, a customer or agency going quiet, or a cancellation after money had already changed hands. That gap is now closed on both dashboards: a lead/request can exit the active pipeline as `lost` or `cancelled` at the points described below, with a dedicated "Lost & cancelled" list (searchable, reopenable, refund-trackable) on each side, and the active board/KPI/upcoming-trips views exclude anything no longer `active`. The schema and reason codes below match what's actually wired into `pumpkino-Agent-dashboard-final-v2.html` (`openMarkLost`/`submitMarkLost`/`openCancelBooking`/`confirmCancelBooking`/`openLostCancelled`) and `dmc-portal-final-v2.html` (same function names, `requests` instead of `leads`) — both verified end-to-end via jsdom test suites covering every scenario below.

**Design decision: don't fold this into a bigger `stage` enum.** Keep `stage` as pure funnel position (it already reads cleanly as "how far did this get"). Add a separate `lifecycleStatus` alongside it, since an outcome can occur from several different funnel positions and trying to encode both in one field multiplies the enum combinatorially. Shape, applied to both `lead` (Agency dashboard) and `request` (DMC portal):
```
lifecycleStatus: 'active' | 'lost' | 'cancelled'   // default 'active'
exitedAtStage: <the stage value it was at when it left 'active'>
lostReason / cancelReason: string (reason code, see below)
initiatedBy: 'customer' | 'agency' | 'dmc' | 'ops'
paymentStateAtExit: 'none' | 'advance_paid' | 'fully_paid'   // only meaningful for 'cancelled'
refundStatus: 'not_applicable' | 'pending' | 'processed' | 'denied'   // only meaningful once paymentStateAtExit != 'none'
```

**Agency dashboard — customer-facing `lostReason` codes** (covers the scenarios flagged directly):
- `rejected_quote` — customer explicitly declined after the itinerary was sent (exits from `sent`).
- `no_response_after_revision` — customer asked for changes, a revised itinerary was sent, then they went quiet or declined the revision (exits from `sent`, but only reachable after at least one revise cycle — distinguish from a first-pass rejection since it's a different conversion signal to report on).
- `rejected_after_pricing` — customer confirmed the itinerary itself but backed out once DMC-inclusive final pricing came back (exits from `confirmed`, `dmc`, or `markup`).
- `no_response_expired` — nobody explicitly said no; the quote just went stale after N days with no reply. Distinct from the two above because it's a silent loss, not an active decision — matters for agent performance reporting (a rejected quote isn't the agent's fault the way a never-followed-up quote might be).

`cancelReason` codes once `paymentStateAtExit != 'none'` (i.e. customer paid, then cancelled — exits from `payment` with an advance already logged, or from `done`):
- `cancelled_after_advance`, `cancelled_after_full_payment` — same shape, different point of exit. Both should trigger `refundStatus: 'pending'` immediately and apply the existing `cancellationPolicy` tiers (100% / 50% / 0% by days-before-travel) to determine what's owed back, rather than leaving refund handling implicit.

**DMC portal — DMC-facing `lostReason` codes** (the mirror-image scenarios):
- `agency_declined` — agency explicitly said they're not proceeding after a quote was sent (exits from `sent`).
- `agency_booked_elsewhere` — agency proceeded with a different DMC for the same request. If a lead is quoted to multiple DMCs (a realistic case once the two-sided marketplace exists), the DMC(s) not chosen should resolve to this reason automatically rather than sit stale indefinitely.
- `no_response_expired` — same silent-loss concept as above, from the DMC's side (agency never responded to a sent quote).

`cancelReason` once `paymentStateAtExit != 'none'`: `cancelled_after_advance`, `cancelled_after_full_payment` — an agency cancelling after paying the DMC an advance or in full. This should prompt the DMC to release any blocked inventory (the portal already has `markInventoryReleased()` for hotel/room blocks — a cancellation should surface this as a next action, not leave the DMC to notice on their own).

**Follow-on implications, so this isn't half-wired:**
- Reminders (see `Pumpkino_AI_Assistant_Plan.md` Section 4) must stop firing once `lifecycleStatus !== 'active'` — a "quote pending 24h" nudge on a rejected quote is a bug, not a feature.
- A `cancelReason` with `refundStatus: 'denied'` or any dispute over the refund amount should be able to open a `Dispute` record (Section 3's existing `Dispute` entity) rather than these staying two unconnected concepts.
- Admin reporting (Section 4, "Admin reporting") should get a loss/cancellation breakdown by reason code — win rate and cancellation rate are basic health metrics that don't exist anywhere in the current prototype.
- Both `lost` and `cancelled` are reversible to `active` via a "Reopen" action (`reopenRequest()` in both dashboards) — treat lifecycle status as a status, not a delete, since an agent may click cancel/lost by mistake or the customer/agency may come back after all. The only gate: reopening a `cancelled` record where `refundStatus === 'processed'` (money already sent back) shows a confirmation warning first (`confirmReopen()`) rather than reopening silently, since that refund can't be auto-reversed — the agent has to knowingly re-collect payment. Reopening always clears `lostReason`/`cancelReason`/`exitedAtStage`/`paymentStateAtExit`/`refundStatus` back to their defaults and logs a `_lifecycleLog` entry noting what the refund status was at the time, so the history isn't silently lost.

### Lead import (CSV migration from an existing CRM — implemented)
Every lead used to have exactly one entry point — "+ Add lead," typed in one at a time — which is a real adoption blocker for an agency switching from Zoho CRM, LeadSquared, Kapture, Freshsales, or a plain spreadsheet with hundreds of existing customers on file. `pumpkino-Agent-dashboard-final-v2.html`'s "Leads and pipeline" screen now has an **"⬆️ Import leads from CSV"** button next to "+ Add lead" (`openImportLeads()`), covering the full migration path in one client-side flow: upload a `.csv` file or paste CSV text → auto-guess column-to-field mapping by header name (`Name`/`Mobile`/`Email`/`Destination`/`Pax`/`Travel date`/`Stage`/`Assigned staff`, editable) → if a status/stage column was mapped, map each distinct source value to a Pumpkino stage once (`new`/`sent`/`confirmed`/`dmc`/`markup`/`payment`/`done`), with a keyword-based best guess pre-selected (`guessStageFor()`) → preview screen showing counts (rows found, ready to import, duplicates, skipped for missing a name) plus a sample table → commit (`confirmImportLeads()`), which pushes new `lead` records onto the existing array exactly like manual add does. Duplicate detection matches incoming rows against existing leads by normalized mobile number (last 10 digits, falling back to email if no mobile), and the agent chooses whether to skip duplicates or import them anyway as separate records. A single "Undo this import" action (`undoLastImport()`) removes exactly the leads created by the most recent import, since a wrong column/stage mapping shouldn't require manually deleting rows one by one. Schema addition:
```
lead.importedNotes: string   // free text; populated only by CSV import, never by the app itself
```
Any source column that wasn't mapped to a structured field gets concatenated into `importedNotes` per row (e.g. `"Lead Source: Facebook Ad"`), surfaced directly in `openLeadDetail()`, so nothing from the old CRM is silently dropped even though Pumpkino has no structured field for it yet. Scope note: this is CSV/pasted-text import only — no native OAuth API connector to Zoho or any other CRM is built (that remains a documented, explicitly-deferred Phase 2 in the companion `Pumpkino_CRM_Migration_Plan.md`, gated behind actual demand).

### Verification submission
```
account.verification, account.docs: { gstin, iata, bizReg, extra, fileAttached }
```
Flow: Profile page (self-serve, optional) → status becomes `submitted` → appears in Admin's Verification Queue → Ops approves/rejects/requests more info → status becomes `approved`/`rejected`. Never blocks trial, subscription checkout, or basic marketplace browsing.

### Dispute
```
id, agency, dmc, subject, status: 'open' | 'resolved', raisedBy, date, notes: []
```

## 4. Key flows

**Signup → active account (no verification gate).** `pumpkino-signup.html` (role toggle Agency/DMC, `?role=` deep-linkable) → account created and fully active immediately → `pumpkino-verify-email.html` (email confirmation, cosmetic — doesn't block anything) → `pumpkino-login.html` → `pumpkino-onboarding.html?role=...` (checklist: verify email, check subscription/trial, explore marketplace, complete profile — in that priority order, since converting to paid is the priority action) → "Skip to Dashboard" always available, or auto-offered once the checklist is complete → real Agency/DMC dashboard.

**Subscription checkout.** `pumpkino-pricing.html` or `pumpkino-subscription.html` → pick plan → country-based gateway auto-selected (override available) → mock checkout modal → invoice recorded locally, CSV-exportable.

**Marketplace search (paid-gated).** `pumpkino-home.html` (teaser) or `pumpkino-marketplace.html` (full search/filter/sort) → click a DMC → `pumpkino-dmc-detail.html?id=`. Unsubscribed/trial: masked name, country-only location, packages visible, "Send quote request" replaced with an upgrade CTA. Paid: full identity, working quote request. Gate state is demo-persisted via `localStorage` (`pumpkinoAgencySubscribed`) so it carries across these two pages — a real build should use a session/auth check instead.

**Dashboard DMC search (paid-gated, separate feature from the marketplace).** Inside the legacy Agency dashboard (`pumpkino-Agent-dashboard-final-v2.html`), "DMC network" is a private CRM-style address book of DMCs the agency has manually added, distinct from the public marketplace. Its "Search DMC directory (global)" modal is now plan-gated: paid plans see all results; trial sees the first 3 with the rest blurred behind an upgrade prompt. This uses its own separate seed array (`globalDmcDirectory`) — in the real build, this should be unified with the marketplace's DMC listings table, not a second data source.

**Verification approval.** Agency/DMC Profile page → submit GSTIN/business docs → Admin's Verification Queue (only `submitted` accounts appear; `not_submitted` accounts are shown separately as informational, non-actionable) → Approve / Reject / Request more info.

**Admin reporting.** `pumpkino-admin.html` → Reports section → CSV export for signups, trials, subscriptions, revenue (client-side Blob/anchor download — no real file storage).

**User assignment / modification (Agency dashboard → Users).** Who can do this, and to whom, is entirely driven by the role permission table (`ROLES` in `pumpkino-Agent-dashboard-final-v2.html`):
1. Only a role with a non-empty `canCreateRoles` list can manage users at all (Travel Agent Admin, Manager) — everyone else never sees the Users nav item.
2. Adding a user: name + email + role (limited to whatever the current viewer's `canCreateRoles` allows — a Manager can't create another Manager or Admin). Role selection reveals exactly one extra field: Team Lead → a team name label (cosmetic); Executive → a required "Reports to" picker listing existing, non-suspended Team Leads by name (an Executive can also be left explicitly "Unassigned" rather than blocked, matching how Destination Head/Manager can be created with zero destinations); Destination Head/Manager → comma-separated destinations.
3. Editing a user: same form, pre-filled; changing role re-runs step 2's field logic. If a Team Lead's role is changed away from Team Lead, any Executives reporting to them are automatically set to "Unassigned" rather than left pointing at a role that no longer manages a team.
4. Suspending a user (reversible): blocks switching to them or assigning them new leads, but their history stays visible. If they're a Team Lead with reports, the confirmation names how many/which Executives are affected, since reassignment may be needed while they're out.
5. Removing a user (not reversible): their assigned leads become unassigned; if they're a Team Lead, any Executives reporting to them are set to "Unassigned" at the same time — the confirmation dialog names them before the action is taken, not after.
6. Visibility that follows from all of the above: a Team Lead's own pipeline (leads, CRM, itineraries) is scoped to leads assigned to themself or to an Executive with `teamLeadId` equal to their own `id` — a direct reference, not a shared team-name string, so two Team Leads can safely have the same team name without their rosters merging.

**Requesting a quote from a DMC (async — no instant simulated reply).** Earlier prototype rounds had the "Push to DMC" flow show a fake 2-second "Contacting DMCs" animation and then auto-fill a plausible quote per DMC, which read as if a DMC replies within seconds — misleading, since real DMCs reply by phone/email/WhatsApp on their own schedule, often hours or days later. The flow is now async end to end: **"Request a quote from DMCs"** (`openPushDMC()`) lets the agent pick one or more DMCs and either reach them for real (**Email**/`shareQuoteEmailToDmc()`, **WhatsApp**/`shareQuoteWhatsAppToDmc()`, **Download PDF**/`downloadQuoteRequestPdf()` — a `mailto:`/`wa.me:`/printable cover note with destination, pax, travel date, and tentative price) or just log the request in-app (`runDmcRequest()`). Logging a request does not create a quote — it only adds each picked DMC to `lead._dmcRequests` with `status:'awaiting'`, and the lead sits on the board tagged "Awaiting quotes from N DMCs" until the agent does something about it. Clicking the card again (`openConfirmedStageClick()`) opens the **DMC quotes inbox** (`openDmcQuotesInbox()`), where each DMC shows as "Awaiting response" with a blank amount field — the agent types in the number only once a real quote actually arrives (`logDmcQuote()`), or marks it "No availability" if the DMC declines (`markDmcDeclined()`, with `editDmcQuote()` to correct a logged number). Only once at least one quote is logged can the agent compare and pick a winner (`selectWinningDmc()`, unchanged from before — this is what advances the lead to the `dmc` stage). Nothing on this screen updates on its own; every state change is an explicit thing the agent typed in.

**Lost / cancelled transitions (implemented).** From any active pre-payment stage — `new`/`sent`/`confirmed`/`dmc`/`markup` (Agency dashboard) or `new`/`review`/`sent` (DMC portal) — the agent/DMC can mark the outcome as lost with a reason (see the codes above) instead of only being able to advance it. From `payment` or `done`, a "Cancel booking" action is available that inspects the actual payment record to determine `paymentStateAtExit` (`none`/`advance_paid`/`fully_paid`), immediately sets `refundStatus: 'pending'` whenever money was involved, and surfaces the applicable cancellation-policy tier. Cancelling also auto-releases any DMC-blocked inventory tied to the booking rather than leaving the DMC/agency to notice separately. A lost or cancelled card moves out of the active pipeline, KPI counts, upcoming-trips, and CRM views (so it stops counting toward "awaiting response"/"pending" tallies) but remains visible in a dedicated "Lost & cancelled" list, searchable and filterable, with a full timeline of what happened. This is the same visibility principle already used for suspended users (Section 4: "history stays visible"). **Reopening (both outcomes, with a money-safety gate).** Either outcome can be reopened back to `active` (`reopenRequest()`) — a lost mark or a cancellation might have been clicked by mistake, or the customer/agency may come back after all. Reopening a `cancelled` record where a refund has already been `processed` routes through `confirmReopen()` first, which shows a plain-language warning ("reopening won't undo that refund automatically") with an explicit "Reopen anyway" override, rather than silently pretending the refund never happened.

**Itinerary lock once a booking is fully paid, and a manual-edit option for customer change requests.** Once `lead.stage === 'done'` (customer paid in full), every itinerary entry point (`viewItinerary()`/`showItinerary()`, reached from the board card, the leads table, or "Leads and pipeline" detail view) renders a read-only "🔒 Itinerary and inventory are locked" view instead of the editable pre-send template — no "Edit before sending," no "Edit inclusions...," no "Send to Customer." The only actions available are Download voucher and Cancel booking (the correct way to change plans on a paid, confirmed trip). Separately, when a customer requests changes on a still-`sent` itinerary, the agent previously only had one option — "Send to AI agent to rework" (a simulated re-generation). There's now a second, equally-first-class option: **"Modify myself (agent edit)"** (`reviseItineraryManually()`), which logs the same change-request notification but drops the agent straight into the real itinerary editor (`openEditItinerary()`) instead of only through the AI simulation — useful when the requested change is small and specific enough that the agent would rather just make it themselves. The hotel-details section of that editor (`hotelRowsEditorHtml()`, shared by both the pre-send editor and the post-DMC "update itinerary" screen) is now visually highlighted — an amber "🏨 Confirmed hotels" banner above the row list, and the "Hotel / resort name" field label itself bolded in the same amber — since this is the one field that most directly determines what the customer is actually staying in, and it was easy to skim past among the otherwise-uniform field labels.

**Migrating leads from an existing CRM (CSV import, implemented).** An agency signing up almost always already runs their business somewhere else — see `Pumpkino_CRM_Migration_Plan.md` for the full research on which tools (Zoho CRM, LeadSquared, Kapture, Freshsales, plain spreadsheets). Rather than re-typing every existing customer by hand via "+ Add lead," "Leads and pipeline" now has an "⬆️ Import leads from CSV" button that walks the agent through upload/paste → column mapping (auto-guessed) → stage mapping (since every CRM invents its own status vocabulary) → a preview with duplicate/skip counts → commit with a one-click undo. See Section 3's "Lead import" entry for the full mechanics and schema addition (`lead.importedNotes`). Only CSV/pasted-text import shipped — a native Zoho (or other CRM) API connector remains explicitly out of scope unless demand data says otherwise.

## 5. File → feature map

| File | Feature |
|---|---|
| `pumpkino-home.html` | Marketing homepage, DMC search teaser |
| `pumpkino-login.html` / `pumpkino-signup.html` | Auth (mocked), role toggle |
| `pumpkino-forgot-password.html` / `pumpkino-verify-email.html` | Password reset, email verification |
| `pumpkino-onboarding.html` | First-login checklist + empty states + dashboard hand-off |
| `pumpkino-profile.html` | Self-serve business verification |
| `pumpkino-pricing.html` / `pumpkino-subscription.html` | Plans, checkout, billing history |
| `pumpkino-marketplace.html` / `pumpkino-dmc-detail.html` | Public DMC directory, paid-gated identity |
| `pumpkino-admin.html` | Ops console: verification queue, accounts, disputes, revenue, marketplace listings, reports |
| `pumpkino-Agent-dashboard-final-v2.html` | Full agency CRM: leads, itineraries, private DMC address book, payments, invoices, users/roles |
| `dmc-portal-final-v2.html` | DMC-side operational portal |
| `pumpkino-terms.html` / `-privacy.html` / `-refund-policy.html` / `-support.html` | Legal + support content |

## 6. AI assistant — current state and what a real build needs
*Full architecture, subscription-plan tiering, and brand voice guide: see the companion document `Pumpkino_AI_Assistant_Plan.md`.*

**Current state: marketing copy only, nothing functional.** "AI Itinerary Builder," "AI-drafted itineraries," "AI-sorted queue," and "AI-scored pipeline" appear as claims on `pumpkino-home.html` (hero, value props, how-it-works, FAQ) but there is no model call anywhere in the prototype — no file sends a request to an LLM. The dashboard's itinerary editor is 100% manual entry (agent fills in day-by-day fields themselves). This is a real gap between what the homepage promises and what the product does — flag this to whoever builds v1, since it's currently over-promising.

**What "AI itinerary builder" actually requires to be real:**
- An LLM API call (e.g., Claude API) triggered when a new lead/inquiry is created, taking the raw inquiry text (e.g., "5N Bali trip, 4 people, honeymoon, ₹2L budget" — see the homepage's own demo example) as input.
- Structured output matching the existing itinerary schema already used in `pumpkino-Agent-dashboard-final-v2.html`: `{days: [[dayTitle, dayDescription], ...], hotel: {hotel, cat}, price, overview}`. Use tool-use/function-calling (not free-text parsing) so the model's output slots directly into this schema.
- Grounding context: the model needs access to real DMC packages/inventory for that destination (from the `dmc_listings`/`packages` tables in Section 7) so it drafts against actual bookable options rather than hallucinated hotels and prices. This is a retrieval step before the generation call, not a fine-tuned model.
- A mandatory human-in-the-loop review step — the agent edits/approves the draft before it's shared with the customer (the homepage's own flow diagram already shows this as step 3, "Agent fine-tunes"; keep that as a hard requirement, not optional).

**What "AI-sorted queue" / "AI-scored pipeline" actually requires:**
- A classification/scoring call (much cheaper than itinerary generation) run on each incoming lead or quote request — inputs: budget, destination, pax count, message content; output: a priority score or category used purely to sort the existing leads/quote-request lists. This is a lower-effort, lower-risk first AI feature to actually ship, since it only affects sort order, not customer-facing content.

**Practical considerations for whoever builds this:** pick one LLM provider and API (cost/latency budget per call, since itinerary drafting will run per-lead, potentially high volume); log every AI-drafted itinerary against the human-edited final version (useful both for quality monitoring and for eventually deciding if a fine-tune is worth it); add a visible "AI-drafted" label anywhere a customer might see AI-generated content, for transparency.

## 7. Explicitly deferred (do not build without re-confirming)

- DMC self-serve marketplace listing editor + DMC-side quote-request inbox (two-sided marketplace). Admin-curated listings are the phase-1 stopgap.
- Real payment gateway integration (Razorpay/PayPal APIs, webhooks).
- The AI assistant described in Section 6 — currently marketing copy only.
- Unifying the legacy dashboard's private DMC address book with the marketplace listings table — currently two separate data models.

## 8. Suggested real-world schema (starting point)

`accounts`, `users` (multiple per account, roles per the Agency dashboard's role matrix, `users.team_lead_id` for Executives), `subscriptions`, `invoices`, `verification_submissions`, `dmc_listings`, `packages`, `quote_requests`, `reviews`, `disputes`. Foreign keys: `users.account_id`, `users.team_lead_id → users.id`, `dmc_listings.account_id`, `quote_requests.{agency_account_id, dmc_account_id}`.

`quote_requests` now has a concrete shape to build from — see "Quote and booking identifiers" in Section 3 — `quote_id` (set when sent) and `booking_id` (set when fully paid, references the quote it came from) are demonstrated end-to-end inside the DMC portal's own request lifecycle. What's still deferred is the *two-sided* connection: today the DMC portal's `requests`/quote lifecycle and the Agency dashboard's simulated DMC quotes (`lead._dmcRequests`, `lead.dmcPrice`) are two separate, unconnected demo data models — an agent's dashboard doesn't actually receive what a DMC sends, it re-simulates a plausible quote locally. Unifying them behind one real `quote_requests` table (keyed by `quote_id`) is exactly the DMC self-serve/two-sided marketplace work already listed below as deferred.

White-label branding, custom email sender identity, and WhatsApp/Instagram/Facebook inbox integration (auto-lead-capture) are covered in full in the companion `Pumpkino_WhiteLabel_and_Omnichannel_Plan.md`, including the added `branding`, `sender_identity`, `connected_channels`, and `inbox_messages` entities.

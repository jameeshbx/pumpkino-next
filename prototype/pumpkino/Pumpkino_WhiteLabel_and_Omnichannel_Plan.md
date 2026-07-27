**Status note:** Section 3 (WhatsApp/Instagram/Messenger connected inbox) is held/deferred out of the initial build — launch does not depend on it. Sections 1 and 2 (branding, sender identity) are still in scope. See `Pumpkino_Build_Roadmap.md` Phase 8 and `Pumpkino_Cost_Timeline_Estimate.md` Section 6 for how this is tracked and how to re-estimate when it's picked back up.

# Pumpkino — White-Label, Sender Identity & Omnichannel Inbox Plan
*Companion to Pumpkino_PRD.md and Pumpkino_AI_Assistant_Plan.md. Covers three related asks: (1) agencies/DMCs hide Pumpkino branding behind their own, (2) outbound email looks like it's from them, not Pumpkino, and (3) whether WhatsApp/Instagram/Facebook inboxes can feed leads into Pumpkin. Written as a PM would brief engineering before estimation — includes what's genuinely quick and what's a multi-month platform commitment, honestly labeled.*

## 1. White-label branding

**What already exists, and the gap.** The prototype's Agent dashboard Settings page already has a logo upload field (`agencyProfile.logoUrl`) — but it only affects one small preview thumbnail and an itinerary header. The actual app chrome (sidebar "pumpkino" wordmark, browser tab, PDF exports, any customer-facing shared itinerary page) is hardcoded to Pumpkino's own branding everywhere else. So this isn't a net-new feature so much as finishing a feature that's half-built — worth telling the developer that directly so they don't over-scope it as greenfield work.

**Design gift already in place:** every screen in this prototype uses CSS custom properties (`--primary`, `--secondary`, etc.) consistently instead of hardcoded colors. That means real-build theming is mostly "load a small `branding` object per account at app boot and inject it as a `:root` style override" — not a rewrite of every component's CSS. Flag this to the developer as a reason the theming layer should be fast to build if the CSS-variable discipline carries over from this prototype into the real codebase.

**Data model addition (per account, not per user):**
```
account.branding = {
  logoUrl, primaryColor, accentColor, displayName,
  showPumpkinoBadge: boolean   // "Powered by Pumpkino" footer, see gating below
}
```
Branding lives on the **account**, and every user created under that account (Manager, Team Lead, Destination Head, etc. — the existing role matrix) inherits it automatically. Only the account's Admin role can edit it, matching the existing `isAdmin`-gated logo field.

**Where it needs to actually apply:** sidebar/topbar wordmark and mark, browser tab title, any exported PDF (itinerary, invoice), the customer-facing shared-itinerary link page, and email templates (see Section 2).

**Plan gating — recommended:** let every paid plan upload a logo and primary color, but keep a small "Powered by Pumpkino" badge on customer-facing documents (itinerary PDFs, shared links) for Starter/Growth, and only fully remove it on Scale. This is the same pattern Mailchimp, Typeform, and Calendly use for their free/lower tiers — it turns branding into a natural upgrade driver rather than giving away full white-label at every price point. If agencies push back hard on this in practice, it's an easy dial to loosen later; it's much harder to add a paywall to something that shipped free everywhere.

## 2. Custom sender identity for email

No real email sending exists yet in the prototype (everything's mocked), so this is genuinely new build, and it has a real technical fork the developer needs a decision on before starting, not after:

**Option A — display name only (recommended for v1).** Emails send from something like `Trekking Miles Holidays via Pumpkino <notifications@mail.pumpkino.com>`. Low effort: no domain ownership verification needed, ships fast, still a big trust improvement over a generic Pumpkino address. Downside: "via Pumpkino" is still visible to the customer.

**Option B — full custom sending domain.** Emails send from the agency's own domain (`bookings@trekkingmiles.com`), fully invisible Pumpkino involvement. Requires the agency to verify domain ownership via DNS records (SPF/DKIM/DMARC) through a setup wizard — the same pattern SendGrid, Postmark, and Klaviyo use for "verified sending domains." Real engineering cost: per-tenant domain verification flow, ongoing deliverability monitoring per domain (a botched DNS setup or a spam complaint on one agency's domain can hurt only that domain, but the monitoring tooling itself isn't trivial), and provider selection (Postmark/SendGrid/AWS SES all support this pattern).

**Recommendation:** ship Option A first, offer Option B as a Scale-tier "custom sending domain" feature once there's real demand signal — several successful SaaS products (ConvertKit, Klaviyo) gate exactly this behind their top plan specifically because of the deliverability-support overhead it creates for the platform, not because it's hard to build. Be upfront with the developer that B is an ongoing operational commitment, not a one-time build.

## 3. Omnichannel inbox integration (WhatsApp, Instagram, Facebook)

**Why this matters more than it might first appear:** for the destinations and agency profile this product targets (India-based agencies serving Kerala/Rajasthan/UAE/Thailand-type itineraries), inbound leads overwhelmingly arrive via WhatsApp first, Instagram DM second, Facebook Messenger third — not web contact forms. The homepage's own hero example already assumes this ("Lead received · via WhatsApp"). This is arguably the single highest-leverage integration for this specific market, ahead of the marketplace itself in terms of daily agent time saved — worth prioritizing accordingly rather than treating it as a "nice to have someday."

**Feasibility, honestly, per channel — all three are Meta platforms and share infrastructure:**

| Channel | API | Notes |
|---|---|---|
| WhatsApp | WhatsApp Business Platform (Cloud API) | Official, webhook-based, well documented. Requires a verified WhatsApp Business Account (WABA), set up either through a Business Solution Provider (Twilio, Gupshup, 360dialog, MessageBird) or by Pumpkino becoming a Meta Tech Provider directly over time. **Do not** build against the personal WhatsApp app — there is no public API for it, and automating it risks the agency's number being banned. |
| Instagram | Instagram Messaging API (Meta Graph API) | DMs via webhook once the agency connects an Instagram Business/Creator account through Meta Business Login. |
| Facebook Messenger | Messenger Platform API (Meta Graph API) | Same Meta Business Login flow, same webhook shape. |

Because all three sit on Meta's Graph API and Business Login, building one solid "Meta channel connector" (OAuth + webhook ingestion + message normalization) largely covers all three rather than three separate integrations — this is the single most useful architecture decision to get right early.

**Does this require redesigning the dashboards? No — one additive section, not a redesign.** Concretely, in the current prototype: `pumpkino-Agent-dashboard-final-v2.html` already has a sidebar of `openX()`-style modal sections (Dashboard, Leads and pipeline, CRM, Itineraries, DMC network, etc.) and a `leads` array (`{id, name, dest, pax, stage, mobile, email, startDate, ...}`) driving a kanban board. Adding the inbox means: (a) two new fields on `leads` — `source: 'manual'|'whatsapp'|'instagram'|'messenger'` and `messages: [{from, text, at}]` — and (b) one new sidebar item, `Inbox`, following the exact same modal pattern already used for "DMC network." Its "Create lead" action pushes straight into the existing `leads` array at `stage:'new'`, so it lands on the same kanban board that already exists — there is no second pipeline, no parallel UI to maintain. The DMC portal gets the equivalent addition for incoming quote-request-style messages. This is a genuinely small, low-risk addition precisely because the existing architecture (one array driving one board, sections as modals) was already built to make this easy.

**Architecture:**
1. Agency connects a channel from Settings → "Connected Channels" (OAuth via Meta Business Login).
2. Inbound message arrives via webhook → normalize into one shape regardless of source:
   ```
   InboxMessage = { channel, externalContactId, senderName, text, attachments, receivedAt }
   ```
3. Pumpkin classifies it (same scoring approach as the "AI-sorted queue" in the AI Assistant Plan, Section 4): new lead, reply to an existing thread, or noise.
4. New lead → auto-create a CRM lead record (the dashboard's existing "Leads and pipeline" already has this concept), tagged with its source channel, and fire the same deterministic-trigger reminder pattern already designed ("New WhatsApp lead from +91… — Bali inquiry — respond soon").
5. Agent replies from inside Pumpkino's unified inbox → sent back out over the same channel API, so the whole conversation stays in one place instead of the agent juggling four separate apps.

**What to tell the developer plainly, so this isn't underestimated:** this is a genuine multi-month platform integration, not a quick webhook hookup. Real constraints to plan around: Meta requires going through an approved Business Solution Provider or becoming one (a real review process with turnaround time, not instant self-serve); WhatsApp requires pre-approved message templates for anything sent outside a 24-hour customer-service response window; Instagram and Messenger have their own response-time and platform policies. Budget for this as its own project phase with its own timeline, not a line item inside a general "AI assistant" sprint.

**Recommended phasing:** WhatsApp first — highest lead volume for this market, clearest API, becomes the flagship feature demo. Instagram and Messenger together next, since the Meta connector infrastructure from WhatsApp mostly carries over.

**Plan gating:** channel integrations are where the AI assistant's time-saving value concentrates hardest, so gate to Growth/Scale. Trial/Starter can get a simpler fallback (e.g., forward a lead by email into Pumpkino) rather than full inbox connection.

## 4. Data model additions (extends Section 8 of the PRD)

```
account.branding = { logoUrl, primaryColor, accentColor, displayName, showPumpkinoBadge }
account.sender_identity = { displayName, replyToEmail, sendingMode: 'pumpkino_domain' | 'custom_domain', verifiedDomain? }
connected_channels = { id, account_id, channel: 'whatsapp'|'instagram'|'messenger', externalAccountId, status, connectedAt }
inbox_messages = { id, channel_id, externalContactId, senderName, text, attachments, receivedAt, classifiedAs: 'new_lead'|'reply'|'noise', linkedLeadId? }
```

## 5. Suggested build order (all three asks, combined with the AI assistant plan)

1. Finish branding propagation (Section 1) — small, mostly CSS-variable wiring, high visible payoff.
2. Sender identity Option A (Section 2) — unblocks "doesn't look like Pumpkino" for email quickly.
3. Itinerary generation + reminders (per the AI Assistant Plan) — the core AI value.
4. WhatsApp connector (Section 3) — the biggest single lever for daily agent time saved; budget it as its own phase.
5. Instagram + Messenger (Section 3) — incremental once the WhatsApp connector exists.
6. Custom sending domain, Option B (Section 2) — only once Scale-tier demand signals justify the ongoing deliverability overhead.

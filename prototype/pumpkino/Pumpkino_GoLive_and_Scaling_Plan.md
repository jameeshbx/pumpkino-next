# Pumpkino — Go-Live & Scaling Readiness Plan
*Companion to the other five Pumpkino documents. Those cover what to build; this covers everything else required to legally and operationally launch it and keep it running as it grows. Organized so you can treat it as a checklist — items are grouped by how urgent they are, not alphabetically.*

## 1. Legal & regulatory foundation — do these before public launch, not after

**Business entity.** Register a proper legal entity (Private Limited Company is the standard choice for an India-based SaaS with international customers) before taking a single real payment — everything else in this section assumes that exists.

**Pumpkino's own GST registration.** This is separate from the tax-slab feature built for tenants (that helps agencies/DMCs charge *their customers* correctly). Pumpkino itself, as an India-registered SaaS company charging subscription fees, needs its own GST registration and needs to issue GST-compliant invoices for Starter/Growth/Scale subscriptions. Don't conflate the two — get this confirmed with an accountant specifically for the company, separate from the in-app tenant feature.

**Decision, as of this document: resolved for launch, revisit before the future feature below.** Agency-to-DMC fund transfer for actual trip bookings happens off-platform today — agencies and DMCs settle directly with each other, and Pumpkino only ever charges its own subscription fee. This keeps Pumpkino outside RBI's Payment Aggregator/Payment Gateway licensing scope at launch, since Pumpkino never holds or routes a customer's trip payment.

**Future feature: in-platform Agency↔DMC fund transfer.** There's an explicit intent to introduce this later — Pumpkino collects the trip payment and settles the DMC's share directly, rather than agencies and DMCs coordinating a separate transfer themselves. This is a genuine value-add (one less manual step, faster DMC payouts, a natural new revenue line via a small platform fee on the transfer) but it is exactly the point where the RBI PA/PG question above becomes live again — get it right before building this specific feature, not before launch generally. Two things worth knowing now, so the eventual build isn't scoped from scratch: (1) both Razorpay (Razorpay Route) and PayPal (their Marketplaces/Payouts products) offer split-payment products purpose-built for this two-sided-marketplace pattern — the platform directs a split at the time of payment, and the licensed payment aggregator (Razorpay/PayPal) handles the regulated settlement, which is meaningfully lower-friction than Pumpkino becoming its own licensed PA from scratch. (2) The DMC-side bank details needed for payout already exist in the data model — `dmc-portal-final-v2.html`'s `dmcBusiness` object already captures `accountName/accountNumber/ifsc/upiId` (domestic) and `swift/iban/intlBankName` (international), so this is additive to what's already built, not a new data model. Still get a lawyer to confirm the specific split-payment product's compliance posture before shipping it — "Razorpay handles the license" is a reasonable starting assumption, not a substitute for confirming it.

**Terms of Service, Privacy Policy, Refund Policy.** Drafts already exist in the prototype (`pumpkino-terms.html`, `pumpkino-privacy.html`, `pumpkino-refund-policy.html`), explicitly labeled "template draft — not reviewed by a lawyer." That label needs to come off before real users sign up under them — get an actual legal review, particularly on the marketplace-facilitator disclaimer language and the refund window terms.

**India DPDP Act compliance.** Already flagged in the privacy policy draft. Before launch, confirm: what personal data is collected (GSTIN, business docs, contact info, payment details), how consent is captured at signup, data retention/deletion policy, and whether any data leaves India (relevant if using non-Indian cloud infrastructure or the AI provider's API).

**If serving international users beyond India/GCC/Thailand:** check whether GDPR (EU) or similar regimes apply to any signups from those regions — the country field captured at signup is exactly the input needed to flag this per-account.

## 2. Security hardening before opening signups publicly

- No raw payment card data should ever touch Pumpkino's own servers — Razorpay/PayPal handle that (tokenization), which keeps PCI DSS scope minimal. Confirm the actual integration follows this (it should, using their hosted checkout/SDKs, not a custom card form).
- Encryption in transit (HTTPS everywhere, no exceptions) and at rest for the database, especially given it stores GSTIN, business registration numbers, and bank details.
- Secrets (API keys, database credentials) in a proper secrets manager, never committed to the repo — worth stating explicitly in CLAUDE.md so this doesn't slip during a Claude Code build session.
- A real security review or basic penetration test before public launch — this was already flagged as Phase 10 in the Build Roadmap; don't skip it because the product "feels done."
- Data export and deletion capability for any user who asks (DPDP/GDPR data-subject rights) — build this before you need it under a deadline.

## 3. Infrastructure reliability

- **Database connection pooling.** Serverless functions (Vercel-style deployment) can each open their own Postgres connection and exhaust the database's connection limit under load — use a pooler (e.g., PgBouncer, or your Postgres provider's built-in pooling) from day one, not after the first outage.
- **Automated backups, tested restores.** A backup you've never restored from is a hope, not a backup — actually run a restore drill before launch.
- **Monitoring and error tracking** (e.g., Sentry for errors, an uptime checker for the public marketing/marketplace pages, log aggregation for the backend) — set this up before launch so the first real bug is visible immediately, not reported by a confused user.
- **Cost alerts**, specifically on the AI API and any per-message WhatsApp costs — these scale with usage in a way fixed infrastructure costs don't, and a bug (e.g., an infinite retry loop calling the AI on every page load) can get expensive fast without an alert.

## 4. Payments — operational, not just technical

- Start the Razorpay and PayPal merchant account KYC/business verification process early — this involves real business document review on their end and can take days to weeks, so don't leave it until the week before launch.
- Webhook handling needs to be idempotent (a webhook can arrive more than once for the same event) — a payment-status webhook processed twice should never double-charge or double-count revenue.
- Decide the dunning process for failed subscription renewals (retry schedule, grace period, when an account actually loses paid-plan access) — this doesn't exist anywhere in the prototype or earlier docs and is a real gap to close before relying on subscription revenue.
- A reconciliation habit: periodically confirm what Razorpay/PayPal show as settled against what Pumpkino's own database shows as paid — catch drift early rather than at tax-filing time.

## 5. AI cost and reliability guardrails

- Per-account rate limits on AI calls (the trial cap already designed in the AI Assistant Plan is the right idea — make sure it's enforced server-side, not just in the UI, since a client-side-only cap can be bypassed).
- Graceful fallback when the AI API is slow or down: the itinerary editor should degrade to the existing manual entry form, not show an error and block the agent from working.
- Basic content review on AI-drafted customer-facing text before it's sent — the human-review requirement already designed in the AI plan is the main guardrail here; keep it non-negotiable even under pressure to "just auto-send."

## 6. WhatsApp / Meta compliance

Already covered in depth in `Pumpkino_WhiteLabel_and_Omnichannel_Plan.md` — repeating the headline here because it belongs on a launch checklist: the Meta Business Solution Provider relationship and WhatsApp Business Account approval process has its own timeline outside Pumpkino's control, and message-template pre-approval is required for anything sent outside a 24-hour response window. If WhatsApp is meant to be live at launch, start that approval process well before the target launch date, not alongside other launch prep.

## 7. Customer support, for real

The prototype's support page (`pumpkino-support.html`) is currently an FAQ and a mock contact form. Before launch, this needs an actual monitored channel — even a simple shared inbox or a lightweight tool (Freshdesk, a Slack channel with a shared email forward) is enough to start; it doesn't need to be sophisticated, it needs to be real and staffed. Define a basic response-time expectation for yourself internally, even if it's not advertised as a formal SLA yet.

## 8. Go-to-market: solving the marketplace cold-start problem

A DMC marketplace with no DMCs on it isn't useful to agencies, and agencies won't show up for an empty marketplace. This is the classic two-sided marketplace bootstrapping problem, and the product's own design already has the right answer built in: admin-curated listings (Phase 5 of the Build Roadmap) let Ops manually onboard a first batch of real, good DMCs before waiting for organic self-serve signup. Concretely for launch: manually recruit and list a meaningful first batch of DMCs (aim for real coverage of the destinations already used throughout this prototype — Kerala, Rajasthan, UAE, Thailand — since that's evidently the target market) before opening agency signups widely, so the first agencies who try the marketplace see something real, not an empty page.

Consider a soft/invite-only launch (a limited beta with a known set of agencies and DMCs) before opening public signup — this catches real-world bugs and UX gaps with a forgiving audience before the product is judged at full public scale.

## 9. Team and incident readiness

- Decide who gets paged if the site goes down or payments fail, even if the answer at launch is "one person, all the time" — write it down so it's not improvised during an actual incident.
- Keep the four planning documents and this one updated as real decisions are made — they're only useful as a shared source of truth if they stay current after launch, not just during the build.

## 10. What changes as you scale (post-launch)

- **Database:** add read replicas and revisit indexing once query volume grows past what a single instance comfortably handles — not before, there's no need to over-engineer this at launch.
- **Background jobs:** the simple cron-based reminder engine recommended in the Build Roadmap is fine at launch; once volume grows, move to a proper queue (Redis + BullMQ or similar) so job processing doesn't block or get lost under load.
- **Caching:** add a caching layer (Redis) for marketplace search and frequently-read data once traffic makes it worth the added complexity.
- **Geographic expansion:** the country field and tax-slab system are already built to extend beyond India/UAE/Thailand — expanding to a new market is mostly a data/configuration exercise (new tax defaults, new payment method support) rather than a rebuild, assuming the underlying architecture stays as designed.
- **Feature flagging and staged rollouts:** once the user base is large enough that shipping a bug to 100% of users at once is genuinely risky, introduce feature flags for gradual rollout rather than relying on "it worked in staging."

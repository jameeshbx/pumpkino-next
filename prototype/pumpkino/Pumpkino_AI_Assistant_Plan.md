# Pumpkin — AI Assistant Development Plan
*Companion to Pumpkino_PRD.md. This is the deep-dive on the one feature the PRD only sketched: the AI assistant, named "Pumpkin," available to every user and tiered by subscription plan. Hand this to the developer/AI engineer alongside the main PRD.*

## 1. Product framing

Pumpkin is not a generic chatbot bolted onto the product — it's a named, consistent presence that does two concrete jobs well: **drafts itineraries** and **remembers things so the agent doesn't have to**. Every user (agency and DMC, even on free/trial plans) should meet Pumpkin from day one; what changes by plan is how much and how fast Pumpkin does for them, not whether Pumpkin exists at all. A support experience that's absent on the free tier and suddenly appears on paid feels like a bait-and-switch — the better design is "helpful immediately, more powerful as you pay."

**Why it should win users over, concretely, not just in tone:**
- It should be *proactive*, not just reactive — surfacing a reminder before the agent thinks to ask, not waiting to be summoned.
- It should be *fast and visible* — show the draft happening (matching the "8.42 seconds, lead to shared itinerary" promise already on the homepage), not a silent spinner.
- It should *never send anything to a customer without a human clicking send* — trust is won by being a very good assistant, not by pretending to be autonomous.
- It should sound like one consistent character across every touchpoint — same name, same tone, whether it's drafting a 7-day Bali itinerary or nudging about an overdue invoice.

## 2. Plan-based tiering

Reuse the existing plan names from `pumpkino-subscription.html` (`PLAN_DEFS`) rather than inventing new tiers — Trial, Starter, Growth, Scale for agencies; DMCs stay on their existing free plan.

| Capability | Trial | Starter | Growth | Scale |
|---|---|---|---|---|
| Itinerary drafting | Yes, capped (e.g. 3/day) | Unlimited | Unlimited | Unlimited + multi-variant regenerate |
| Task reminders | Trial/billing reminders only | + booking & payment reminders | + quote follow-up & DMC response-time nudges | + custom reminder rules/thresholds |
| Lead/quote scoring (queue sort) | No | No | Yes | Yes |
| Response speed / model tier | Standard | Standard | Standard | Priority (faster model or higher token budget) |
| Tone/brand customization | No | No | No | Yes (agency can adjust Pumpkin's voice for their brand) |

DMCs get itinerary-adjacent help (drafting a quote response) and reminders (new quote request waiting, agent follow-up overdue) — same shape, same free-always philosophy as the rest of the DMC experience.

Gate on the account's `plan` field already in the data model (Section 3 of the PRD) — no new entity needed for entitlement, just a capability-lookup table like the one above, checked before each Pumpkin action.

## 3. Itinerary generation — architecture

**Trigger:** a new lead/inquiry is created (manually entered, or in a later phase piped in from WhatsApp/email) with freeform text plus whatever structured fields exist (destination, pax, budget, dates).

**Pipeline:**
1. **Parse the inquiry** — extract destination, party size, trip length, budget, and trip type (honeymoon, family, adventure, etc.) from the freeform text. This can be the same LLM call as step 3 (single call with structured + freeform reasoning) rather than a separate step, to keep latency down.
2. **Retrieve grounding data** — query the DMC listings/packages table (Section 7 of the PRD) for that destination so the draft is built from real, bookable packages and prices, not invented ones. This is retrieval, not a fine-tuned model — a simple filtered query against `dmc_listings`/`packages` by destination is enough for v1; no vector search needed unless the catalog grows very large.
3. **Generate the draft** — call the LLM (Claude API recommended given this document's origin, but any tool-use-capable model works) with function-calling/tool-use so the response comes back as structured data, not prose to be parsed. Output shape should match what `pumpkino-Agent-dashboard-final-v2.html` already expects:
   ```
   { days: [[dayTitle, dayDescription], ...], hotel: {hotel, cat}, price, overview }
   ```
   Designing to an existing schema means the frontend itinerary editor needs zero changes to display an AI draft — it's just pre-filled instead of blank.
4. **Human review, always** — the draft lands in the agent's existing itinerary editor, clearly marked "AI-drafted," fully editable, day by day. Nothing reaches the customer until the agent clicks send. This is a hard requirement, not a v2 nice-to-have — it's also legally safer (an agent is accountable for what they send a client).
5. **Log the pair** — store the AI draft and the final edited/sent version together. This is your quality signal: if agents are rewriting 80% of every draft, the prompts or grounding data need work; if they're sending near-verbatim, it's working. Use this to iterate the prompt, not to fine-tune a model in v1 — prompt iteration is faster and cheaper than fine-tuning, and should be exhausted first.

**Trial cap implementation:** count itinerary-draft calls per account per day; once the cap is hit, show an upgrade prompt instead of erroring silently — same UX pattern already used for the marketplace search cap.

## 4. Task reminders — architecture

**Important design decision: keep the trigger logic deterministic, use the LLM only for wording.** Reminders are reliability-critical — an agent needs to trust that "quote pending 24h" always fires at 24h, every time. Don't make the decision to remind probabilistic. Split the system in two:

- **Rule engine (deterministic, no LLM):** a small set of scheduled checks against existing data — trial expiring in ≤2 days, quote request unanswered >24h, payment pending >48h, verification submitted but unreviewed >5 days, DMC hasn't responded to a quote in >responseHrs (their own stated SLA). Each rule fires an event with the relevant IDs and numbers.
- **LLM wording layer (optional, cheap call):** takes the fired event and writes the one or two lines the user actually sees, in Pumpkin's voice — this is where personality lives. If this call fails or is skipped (e.g., on trial), fall back to a plain templated string so the reminder still fires reliably; a mis-worded reminder is fine, a missing reminder is not.

**Delivery:** start with in-app (notification bell / dashboard card), matching what's already built as empty-state cards in `pumpkino-onboarding.html`. Email/WhatsApp delivery is a real phase-2 addition, not v1 — don't scope it in unless asked.

**Plan gating:** which *rules* are active, not whether reminders exist at all — Trial gets the two reminders that matter most to conversion (trial ending, complete your profile), Growth adds the quote/response-time rules, Scale allows the agency to define their own custom rule thresholds.

## 5. The "Pumpkin" character — brand voice guide

Give the developer/designer concrete voice rules, not just "make it friendly":

- **Name:** Pumpkin (not "Pumpkino AI" or "the assistant" in-product copy — first-name, consistently).
- **Tone:** warm, concise, quietly competent — closer to a sharp junior colleague than a customer-service bot. Never gushing, never robotic.
- **Always show its work, briefly:** "Drafted from 3 Kerala packages · 2 pending your review" rather than a bare itinerary with no explanation of where it came from.
- **Never oversell certainty:** "Here's a draft based on what's usually available for Bali in this budget" not "Here's your finalized itinerary."

Sample lines for key moments:
- Drafting: *"Drafting a 5-night Bali plan from Priya's message — ready in a few seconds."*
- Draft ready: *"Here's a first pass — I used two packages from Nusantara DMC. Take a look and tweak anything before it goes out."*
- Reminder: *"Arjun's Kumarakom quote has been sitting for a day — want me to draft a nudge to the DMC?"*
- Trial nudge: *"3 days left on your trial — you've sent 4 quote requests so far. Want to see what Growth unlocks?"*

Keep every line short enough to fit one line of a notification card — this constraint alone keeps the voice disciplined.

## 6a. Build roadmap — concrete phases, in order

**Phase 0 — this week, no code.** Pick the LLM provider/API. Write 3-5 real example lead inquiries with a hand-written "ideal" itinerary JSON output for each, in the exact shape from Section 3. This is the eval set every later phase gets checked against — do this before writing any prompt.

**Phase 1 — standalone test harness.** A small script (not wired into the app yet) that sends each example inquiry to the model with tool-use, gets back structured itinerary JSON, and compares it to the hand-written ideal. Iterate the prompt here — this loop is fast and cheap, and should continue until drafts are close to the ideal set before touching the real app.

**Phase 2 — wire it in.** Replace the dashboard's current static flow (`pumpkino-Agent-dashboard-final-v2.html`'s "click a new lead to try the AI itinerary agent" — today this just opens a manual entry form, no model call happens) with a real backend endpoint the itinerary editor calls. The output pre-fills the same editor fields agents already use, so the frontend needs minimal change — this is the same "already has the schema" advantage noted in Section 3.

**Phase 3 — reminders.** Build the deterministic rule engine first (Section 4) and confirm it fires reliably with plain template text, before adding the LLM wording layer on top. Reliability before personality.

**Phase 4 — WhatsApp.** Set up a Meta Business Manager account, register (or partner with a BSP for) a WhatsApp Business Account, and stand up the webhook receiver. Normalize inbound messages into the `leads[].messages`/`source` fields described in the companion `Pumpkino_WhiteLabel_and_Omnichannel_Plan.md`. Reuse the same model call from Phase 1 for classification (new lead vs. reply vs. noise) before extending it to full itinerary generation.

**Phase 5 — Instagram + Messenger.** Same Meta connector infrastructure from Phase 4, incremental effort.

**Phase 6 — measure and iterate.** Check performance against the success criteria in Section 6b below (draft edit rate, latency, cost per draft). Only consider fine-tuning if prompt iteration plateaus — it usually won't need to.

## 6b. What to hand the developer, as a bundle

1. **Pumpkino_PRD.md** — the data model, roles, and flows this assistant plugs into.
2. **This document** — the AI-specific architecture, tiering, and voice guide.
3. **A handful of real example inputs/outputs** — 3-5 sample lead inquiries with a hand-written "ideal" itinerary output each, in the exact JSON shape from Section 3. These become the few-shot examples and the first evaluation set — without them, the developer is guessing at what "good" looks like.
4. **A sample export of the DMC listings/packages data** (even just the seed arrays already in `pumpkino-marketplace.html`/`pumpkino-dmc-detail.html`) so the retrieval step in Section 3 has something real to query against during development.
5. **Model/API decision:** confirm which LLM provider and API key the developer should build against before they start — this document assumes Claude API but the architecture doesn't depend on it.
6. **Success criteria up front:** agree on 2-3 numbers before build starts — e.g. "% of AI drafts sent with under 20% of lines edited," "reminder delivery latency," "cost per itinerary draft." Without an agreed target, "does the AI feature work" becomes a subjective argument later.

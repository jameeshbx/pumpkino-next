# Pumpkino — Cost & Timeline Estimate
*Companion to Pumpkino_Build_Roadmap.md. Scope: Phases 0–7, 9, and 10. Phase 8 (WhatsApp + Instagram/Messenger connected inbox) is explicitly held/deferred per your decision — it's excluded from all totals below, not just discounted. Phase 11 (in-platform Agency↔DMC fund transfer) remains excluded as before. Section 1–4 assume traditional hand-coding at $12/hour or a more realistic blended market rate; Section 5 assumes Claude Code-assisted development instead.*

**Read this as a planning estimate, not a fixed-price quote.** Every number below is a range, not a guarantee — actual hours depend heavily on the specific developer(s), what goes wrong during the build, and how much scope creeps once real users start asking for things. Treat the totals as a budgeting anchor, not a contract.

## 1. Hours by phase

| Phase | Scope | Hours (low–high) |
|---|---|---|
| 0 — Foundation | Repo/CI, design-system port, Postgres schema, multi-tenant auth with the 7-role permission matrix already defined | 100–160 |
| 1 — Signup, trial, verification, onboarding | Signup/login, non-blocking verification, email/password-reset flows, onboarding checklist | 90–130 |
| 2 — Subscription & billing | Plan tiers, Razorpay + PayPal integration (two full gateways, country routing, webhooks), invoicing, plan-gating middleware | 150–220 |
| 3 — Agency dashboard | The largest single phase: leads/pipeline CRM, itinerary editor, private DMC address book, payments/invoices, users/roles, settings (branding, tax) | 350–450 |
| 4 — DMC portal | Quote inbox, packages/destinations, inventory, bookings, payments/invoices, users/roles, tax settings | 240–320 |
| 5 — Marketplace | Public directory, search/filter, DMC detail pages, paid-plan identity gating, quote requests wired to the DMC portal, admin-curated listings | 130–180 |
| 6 — Admin console | Verification queue, accounts management, disputes, revenue reporting, CSV exports | 110–160 |
| 7 — AI assistant | Itinerary generation (parse → retrieve → generate → human review → logging) and the reminders rule engine + LLM wording layer | 130–180 |
| ~~8 — WhatsApp + Instagram/Messenger~~ | **Held / deferred — not included in any total below.** Resume later per Pumpkino_Build_Roadmap.md. | — |
| 9 — White-label + sender identity | Per-account branding/theming, badge gating, display-name email sending | 60–90 |
| 10 — Hardening & launch prep | Security review coordination, load testing, backup/DR, DPDP compliance pass, full gating-rule QA | 90–140 |
| **Total (Phase 8 excluded)** | | **1,450–2,030 hours** |

Holding Phase 8 also removes Meta's WhatsApp Business Account approval process — a real calendar-time wait outside anyone's control — from the launch critical path entirely. That constraint simply doesn't apply to this version of the estimate.

## 2. Cost at $12/hour

| | Hours | Cost (USD) |
|---|---|---|
| Low estimate | 1,450 | **$17,400** |
| High estimate | 2,030 | **$24,360** |
| Midpoint | ~1,740 | **~$20,880** |
| **Recommended budget (midpoint + 20% contingency)** | ~2,090 | **~$25,050** |

**One honest caveat about the rate itself:** $12/hour is a low/offshore-tier rate. The hour estimates above assume a reasonably competent full-stack developer executing at a normal professional pace — if the actual person or team working at this rate is more junior, the realistic hour count (and therefore cost) trends toward the high end of each range or beyond it.

## 3. Timeline (manual development)

**Solo developer, ~40 hours/week, no AI coding assistance:**
- Low: 1,450 ÷ 40 ≈ 36 weeks (~8.5 months)
- High: 2,030 ÷ 40 ≈ 51 weeks (~11.7 months)
- With contingency: up to ~52 weeks (~12 months)

**Two-developer team, working Phase 3 (Agency dashboard) and Phase 4 (DMC portal) in parallel:**
- Realistic range: roughly 6–8 months.

## 4. Is $12/hour actually a feasible rate for this project?

Short answer: it's on the low end for this scope — the payments, multi-tenant auth, and AI/LLM integration pieces genuinely need a developer who's done this kind of work before, not the cheapest available hourly rate. A rate that's too low usually shows up as more hours and more rework on exactly the phases where mistakes are expensive, not as a lower total cost.

**Market benchmarks, 2026 (general full-stack development, not this project's complexity premium):**

| Region | Typical range | SaaS-specific range |
|---|---|---|
| India / South Asia | $25–$60/hr, more specifically $30–$50/hr by experience level | $25–$45/hr |
| Eastern Europe | $35–$95/hr (senior agency work at the top end) | $40–$65/hr |
| Latin America | — | $45–$70/hr |
| US / Western Europe (onshore) | $80–$180/hr, typically $90–$160/hr | — |

Note these are headline contractor rates — hiring through an agency or an Employer-of-Record setup typically adds 40–80% on top for management overhead, onboarding, and compliance costs.

**Feasible recommendation:** a realistic floor is $25–$35/hr for a competent India-based full-stack developer with prior payment-integration experience, or a blended approach — $15–$20/hr for the lower-complexity phases (0, 1, 5, 6, 9) and $30–$50/hr specifically for Phase 2 (payments) and Phase 7 (AI), where experience actually reduces risk and rework.

**What the same hour range costs at a realistic blended rate** (~$28/hr average):
- Low estimate: 1,450 hrs × $28 ≈ **$40,600**
- High estimate: 2,030 hrs × $28 ≈ **$56,840**
- Midpoint: ~1,740 hrs × $28 ≈ **~$48,720**

## 5. Revised timeline and cost if you build this with Claude Code

Claude Code compresses boilerplate-heavy, pattern-following work most (which is most of this project, since the prototype already defines every screen and gating rule precisely enough to port directly), and compresses least where the bottleneck was never typing speed: payment-gateway edge cases needing real sandbox testing, AI prompt iteration that inherently needs human judgment cycles, and security review rigor.

| Phase | Manual hours | Claude Code-assisted hours | Why this compression factor |
|---|---|---|---|
| 0 — Foundation | 100–160 | 45–70 | Scaffolding/schema/auth wiring — Claude Code's strongest zone |
| 1 — Signup/trial/onboarding | 90–130 | 45–65 | Directly portable from the existing prototype's exact fields and copy |
| 2 — Subscription & billing | 150–220 | 100–145 | Integration code is fast to write; webhook edge cases and sandbox testing still need real time |
| 3 — Agency dashboard | 350–450 | 175–225 | Largest phase, but hugely portable from the existing reference file |
| 4 — DMC portal | 240–320 | 120–160 | Same reasoning as Phase 3 |
| 5 — Marketplace | 130–180 | 65–90 | UI/CRUD, directly portable |
| 6 — Admin console | 110–160 | 55–80 | UI/CRUD, directly portable |
| 7 — AI assistant | 130–180 | 90–125 | Wiring is fast; prompt iteration is inherently human-judgment-paced |
| 9 — White-label | 60–90 | 27–40 | Theming/CRUD, directly portable |
| 10 — Hardening & launch prep | 90–140 | 75–115 | Mostly verification rigor, not code generation — compresses least |
| **Total (Phase 8 excluded)** | **1,450–2,030** | **~797–1,115 hours** | **Roughly 45–55% of the manual estimate** |

**Timeline:**
- **Solo developer + Claude Code, ~40 hrs/week:** 797 ÷ 40 ≈ 20 weeks to 1,115 ÷ 40 ≈ 28 weeks → **roughly 4.5–6.5 months**.
- **Two-person team + Claude Code**, parallelizing Phases 3 and 4: **roughly 3–4.5 months**.

**Cost at the same rates as before, using the Claude Code-assisted hours:**
- At $12/hr: **$9,564–$13,380** (midpoint ~$11,472)
- At the ~$28/hr blended feasible rate: **$22,316–$31,220** (midpoint ~$26,768)

**One honest caveat, since this whole conversation has been a live example of AI-assisted build speed:** everything built in this session so far is a static HTML/CSS/JS prototype — fast to iterate because there's no real database, auth, deployment, or production security surface to get right. The compression factors above are deliberately more conservative for the phases where that stops being true (payments, security hardening) than what "how fast this chat has moved" might otherwise suggest.

## 6. Bringing Phase 8 back later

If/when the WhatsApp/Instagram/Messenger inbox is picked back up, add back roughly 170–240 manual hours (110–155 Claude Code-assisted hours) per the original estimate, plus reintroduce the 4–8 week Meta approval wait into your scheduling — start that application process as early as convenient before the phase actually begins, since it runs on Meta's calendar, not yours.

## 7. What would change this estimate materially

- A genuinely senior developer at $12/hour (uncommon at that rate, but changes the estimate favorably if found) versus a junior one (unfavorably).
- Scope changes discovered mid-build — this estimate reflects what's specified across the other Pumpkino documents; any feature not already described there is not in this number.
- Bringing Phase 8 back into scope (see Section 6).

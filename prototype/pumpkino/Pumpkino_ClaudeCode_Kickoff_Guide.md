# Pumpkino — Getting Started With Claude Code
*Practical, step-by-step instructions for building the real Pumpkino SaaS using Claude Code, starting from the HTML prototype and the four planning documents (Pumpkino_PRD.md, Pumpkino_AI_Assistant_Plan.md, Pumpkino_WhiteLabel_and_Omnichannel_Plan.md, Pumpkino_Build_Roadmap.md).*

## 0. Before you start

- **Account:** Claude Code needs a Pro, Max, Teams, or Enterprise plan (not the free Claude.ai tier). Given the size of this build, budget for at least a Max-tier plan.
- **Install:** `curl -fsSL https://claude.ai/install.sh | bash` (no Node.js needed, auto-updates). A desktop app also exists if you'd rather avoid the terminal entirely — search "Claude Code desktop app" in Anthropic's docs to confirm current availability for your OS.
- **Git:** Claude Code manages your project through git, so you'll need git installed and your project initialized as a repo (`git init`) before you start.
- **One thing to accept up front:** don't hand Claude Code all four planning documents at once and ask it to "build the whole thing." That's the exact failure mode this guide is designed to avoid — go one phase at a time, per the roadmap already written.

## 1. Set up the project folder

Create a new folder for the real product (separate from the prototype's output folder) and organize it like this before you open Claude Code in it:

```
pumpkino-app/
  docs/
    Pumpkino_PRD.md
    Pumpkino_AI_Assistant_Plan.md
    Pumpkino_WhiteLabel_and_Omnichannel_Plan.md
    Pumpkino_Build_Roadmap.md
  prototype/
    (all ~18 HTML files from the original prototype, for UI/UX reference)
```

Copy the four markdown docs and the full prototype folder in as-is — these become Claude Code's reference material, not code it edits.

## 2. Generate CLAUDE.md and point it at your docs

Open a terminal in `pumpkino-app/`, run `git init`, then start Claude Code (`claude`) and run `/init`. This scans the (currently empty) project and generates a `CLAUDE.md` file — Claude Code's persistent project briefing, read automatically at the start of every session.

Then edit `CLAUDE.md` yourself (or ask Claude Code to do it) to add a short "Resources" section like:

```
## Resources
- docs/Pumpkino_PRD.md — data model, roles, and flows
- docs/Pumpkino_AI_Assistant_Plan.md — AI assistant architecture and tiering
- docs/Pumpkino_WhiteLabel_and_Omnichannel_Plan.md — branding, email identity, WhatsApp/Instagram/Messenger
- docs/Pumpkino_Build_Roadmap.md — the phase order to follow; we are currently on Phase [N]
- prototype/ — reference-only HTML/CSS/JS showing every screen and gating rule; port the UI, don't reuse the code as-is

## Stack
Next.js, PostgreSQL, Prisma, [chosen auth provider], Razorpay + PayPal, Claude API, [chosen hosting].
```

This is the single most important step: CLAUDE.md is what Claude Code reads every session, so it's the bridge that keeps it oriented across a multi-week build — update it as real decisions get made (e.g., once you've actually picked an auth provider or hosting platform).

## 3. Work through the roadmap one phase at a time

Pumpkino_Build_Roadmap.md already defines the phase order (Phase 0 foundation → signup/trial → subscription/billing → agency dashboard → DMC portal → marketplace → admin console → AI assistant → WhatsApp/Instagram/Messenger → white-label → hardening). Treat each phase as its own Claude Code session.

**Starting a phase — prompt template:**
> "We're building Pumpkino, a travel SaaS. Read docs/Pumpkino_Build_Roadmap.md and docs/Pumpkino_PRD.md. We're on Phase [N]: [paste the phase's scope from the roadmap]. The previous phases are done and working. Before writing any code, use plan mode to lay out how you'll build this phase, then walk me through the plan before executing."

Toggle **Plan Mode** (Shift+Tab) for that first message in each phase — it makes Claude Code reason through the approach before touching files, which matters most right when a new phase starts and the blast radius of a wrong turn is largest.

**Reference the prototype file directly when relevant** — e.g., for Phase 3 (agency dashboard): "Reference prototype/pumpkino-Agent-dashboard-final-v2.html for the exact UI, fields, and copy — port the design, don't carry over the mocked/manual logic (e.g. the itinerary editor should stay manual in this phase; AI comes in Phase 7)."

## 4. Keep sessions organized as you go

Claude Code only retains full context within one session — across sessions, CLAUDE.md (plus your own notes) is what carries continuity forward. Practical habits:
- Give each phase's session a clear name/label as you go so you can find and resume it later (check `/help` inside Claude Code for the current session-naming/resume commands, since exact command names do change between versions).
- Commit to git at the end of every phase, with a message referencing the phase number — this gives you a real rollback point if a later phase's changes turn out to depend on something from an earlier phase in an unexpected way.
- At the start of each new phase's session, explicitly state which phase number you're on and confirm the previous one is done — don't assume Claude Code remembers a session from a week ago.

## 5. Verify before moving to the next phase

At the end of each phase, ask Claude Code directly: *"Write and run tests for what we just built in this phase, and check it against the relevant gating rules in Pumpkino_PRD.md (e.g. trial vs. paid access, verification never blocking signup)."* Don't start Phase N+1 until Phase N's tests pass — later phases assume earlier ones actually work, exactly as laid out in the roadmap's dependency reasoning.

## 6. Cost awareness

Claude Code usage shares a rolling usage window with Claude.ai and Cowork on subscription plans — a long multi-phase build will use meaningful usage. Budget for at least a Max-tier plan given the scope of this project, and keep an eye on usage as you go rather than being surprised partway through Phase 5.

# Pumpkino — Existing-CRM Data Migration Plan
*Companion to Pumpkino_PRD.md. Answers a concrete onboarding question: an agency signing up already runs their business somewhere — Zoho CRM, LeadSquared, Kapture, Freshsales, or (very commonly for smaller agencies) a plain Excel/Google Sheet or WhatsApp Business chat list. How does their existing customer data actually get into Pumpkino?*

**Status: Phase 1 (CSV/pasted-text self-serve import) is now implemented** in `pumpkino-Agent-dashboard-final-v2.html` — see "Leads and pipeline" → "⬆️ Import leads from CSV," and `Pumpkino_PRD.md` Section 3 ("Lead import") for the schema/mechanics as actually built. Everything below in Section 4 describes that implementation; Section 7's Phase 2 (native CRM API connectors) remains explicitly not built, per the "csv import is enough" scoping decision.

## 1. Original gap this plan addressed (now closed for CSV/spreadsheets)

The prototype had CSV **export** in several places (`exportReportsCSV()` in the admin Reports section, `exportPaymentsCSV()` in Trip Payments) but, until this build, **no import path existed anywhere** — not in onboarding, not in Settings, not in Leads and pipeline. An agency signing up had no way to bring their existing customer list in; every lead had to be typed in one at a time via "+ Add lead." For an agency migrating off another tool, that was the single biggest adoption blocker — nobody re-types 500 customer records by hand, and if Pumpkino can't absorb what they already have, they won't switch. This gap is now closed for CSV/spreadsheet sources (the vast majority of real migrations, per Section 2 below).

## 2. What agencies are actually migrating from

Research into the Indian travel-agency CRM market turned up a fairly short, predictable list of incumbents, which matters because it tells us what export formats to expect:

- **Zoho CRM / Zoho Bigin** — the most common general-purpose CRM among Indian SMBs across every vertical, including travel. Exports to CSV with configurable field selection.
- **LeadSquared** — an Indian SaaS company with a strong foothold specifically in high-lead-volume verticals (travel, education, real estate); starts around ₹1,250/user/month.
- **Kapture CRM** — explicitly positions itself as a travel-industry CRM, so agencies using it likely already have travel-shaped fields (destination, travel dates, pax) rather than generic sales fields.
- **Freshsales (Freshworks)** — general CRM, sizeable install base.
- **Plain spreadsheets (Excel/Google Sheets)** — anecdotally the most common "CRM" for smaller agencies, and the easiest to migrate from since it's already just rows and columns.
- **WhatsApp Business** — not a CRM at all, but functionally where a lot of micro-agencies track leads today (a chat list, no structured export). Out of scope for automated migration; these agencies start clean and benefit most from Pumpkino's own AI-drafted-itinerary flow instead.

The common thread: **every one of these tools can export to CSV or Excel.** That's the lever to pull first — a universal CSV/Excel importer covers effectively 100% of migrating agencies on day one, versus building bespoke API connectors per CRM (high effort, and still wouldn't cover the Excel/Sheets agencies anyway).

## 3. What data actually needs to move

Not everything in a source CRM is worth migrating. Prioritize by what Pumpkino's own schema (Section 3 of the PRD) can actually use:

| Source data | Maps to | Priority |
|---|---|---|
| Customer/lead name, mobile, email | `lead.name`, `lead.mobile`, `lead.email` | Must-have |
| Destination of interest | `lead.dest` | Must-have |
| Party size / traveller count | `lead.pax` | Must-have |
| Travel date (if known) | `lead.startDate` | High value |
| Lead status/stage in the old CRM | `lead.stage` (via manual mapping — see Section 5) | High value |
| Assigned salesperson | `lead.assignedTo` (only if the name matches an existing Pumpkino user) | Medium |
| Past booking history (destination, amount, date) | `lead.pastBookings[]` | Medium — nice for the CRM's "Travel history" view, not required to start selling |
| Free-text notes / call logs | No direct field today — see Section 6 | Low, but shouldn't be silently dropped |
| Custom fields specific to the old CRM | No direct field — see Section 6 | Low |

## 4. The import mechanism — self-serve CSV import (implemented), mirroring the export pattern already in the app

**Built as designed, with one scope trim: CSV/pasted-text only, not `.xlsx`** (confirmed via the "csv import is enough" scoping decision — every CRM in Section 2 exports to CSV, so this covers the same ground without a SheetJS/XLSX dependency). Live in `pumpkino-Agent-dashboard-final-v2.html`, reachable from "Leads and pipeline" → "⬆️ Import leads from CSV" (`openImportLeads()`):

1. **Upload or paste.** Agent uploads a `.csv` file or pastes CSV text directly (`parseImportFile()`/`parseCsv()`) — no reformatting required up front. Pasting is supported alongside file upload since a real agent may just copy rows straight out of Excel/Sheets without saving a file first.
2. **Auto-detect + map columns (`openImportColumnMap()`).** Shows the file's column headers next to a dropdown for each Pumpkino field (`Name`, `Mobile`, `Email`, `Destination`, `Pax`, `Travel date`, `Stage`, `Assigned staff`). Obvious matches by header name similarity auto-map (`IMPORT_ALIASES`) so most agents just confirm rather than map from scratch.
3. **Stage mapping (`openImportStageMap()`).** Only shown if a stage/status column was mapped. Every distinct source value gets its own dropdown to a Pumpkino stage (`new`/`sent`/`confirmed`/`dmc`/`markup`/`payment`/`done`), pre-guessed by keyword (`guessStageFor()` — "paid"/"advance"→`payment`, "confirm"→`confirmed`, "done"/"booked"/"complete"→`done`, etc.), applied once as a lookup table to every row. Anything genuinely ambiguous defaults to `new`.
4. **Preview before committing (`openImportPreview()`).** Shows rows found, ready-to-import count, duplicate count, and missing-name skip count, plus a sample table of what will actually be added. Nothing is written to the live pipeline until the agent explicitly confirms.
5. **Duplicate detection.** Matches incoming rows against existing leads by normalized mobile number first (last 10 digits, most reliable given Indian mobile numbers), falling back to email. The agent picks "skip" or "import anyway as new, separate leads" for the whole batch — never a silent overwrite of an existing record.
6. **Commit + undo (`confirmImportLeads()`/`undoLastImport()`).** New `lead` records land in whatever stage they were mapped to; a single "Undo this import" button removes exactly the leads created by that import, matching the same reversible-by-default philosophy already used for `reopenRequest()`/`confirmReopen()` elsewhere in the app.

No new backend service was needed — this is entirely client-side CSV parsing plus pushes onto the existing in-memory `leads` array, consistent with how the rest of this prototype has no real persistence layer yet.

## 5. Field-mapping example (Zoho CRM → Pumpkino)

Concrete enough to build a default template from, since Zoho is the most likely single source:

| Zoho CRM export column | Pumpkino field |
|---|---|
| `Lead Name` / `Full Name` | `name` |
| `Phone` / `Mobile` | `mobile` |
| `Email` | `email` |
| `Lead Source` | *(dropped, or kept in notes — not modeled today)* |
| `Lead Status` | `stage` (via the manual mapping step in Section 4.3) |
| `Description` / `Notes` | *(see Section 6 — no field yet)* |
| `Owner` | `assignedTo` (only if it matches an existing Pumpkino user's name) |
| *(no direct equivalent)* | `dest`, `pax`, `startDate` — Zoho's generic CRM schema has no travel-specific fields, so these will almost always need to come from a custom field the agency added themselves, or be left blank for the agent to fill in after import |

The last row is the honest caveat: **generic CRMs (Zoho, Freshsales) don't natively store destination/pax/travel-date**, because they're not travel-specific. Kapture CRM (being travel-focused) is more likely to have these as real, mappable columns. Agencies migrating from a generic CRM should expect to fill in trip specifics after import, not get a 100% complete record for free — set that expectation in the import wizard's copy rather than let the agent discover it's missing later.

## 6. What to do with data that doesn't fit the schema (implemented)

Rather than silently discarding anything that isn't `name`/`mobile`/`email`/`dest`/`pax`/`startDate`/`stage`/`assignedTo`, a new field was added to the `lead` model exactly as proposed:

```
lead.importedNotes: string   // free text, populated only by migration; never generated by the app itself
```

Every unmapped column's value gets concatenated into this field per row (e.g. `"Lead Source: Facebook Ad"`), surfaced in `openLeadDetail()` as a labelled "📥 From imported CRM data" banner, so nothing from the old system is silently lost even though Pumpkino has no structured place for it yet.

## 7. Phasing

- **Phase 1 (done): CSV/pasted-text self-serve import**, as described in Section 4. Covers every source CRM in Section 2, plus plain spreadsheets, with one build effort. Shipped scoped to CSV/pasted text only (no `.xlsx` parser) — this was a deliberate scope call, not an oversight, since CSV alone already covers 100% of the CRMs in Section 2.
- **Phase 2 (only if volume justifies it, not yet built): native Zoho CRM API connector.** Zoho is the single most common incumbent, so if enough incoming agencies specifically use it, a direct OAuth-based pull (no manual export/upload step at all) removes friction further. Don't build this speculatively — gate it behind actual demand signal from Phase 1 usage data (e.g., "what CRM did you migrate from?" captured as one field in the import wizard itself — not yet captured; worth adding if Phase 2 becomes real).
- **Not planned:** bespoke connectors for LeadSquared/Kapture/Freshsales individually, or any WhatsApp-chat-log parsing — low enough volume per tool that CSV import already covers them adequately. Also not built: `.xlsx` file parsing specifically (agents with an Excel file can open it and paste, or save-as-CSV, both one extra step rather than a blocker).

## 8. Where this plugs into what already exists

- **Leads and pipeline** (`openLeadsList()` in the Agency dashboard) — **done.** An "⬆️ Import leads from CSV" button sits next to the existing "+ Add lead," since that's where an agent already expects bulk lead management to live.
- **Onboarding checklist** (`pumpkino-onboarding.html`) — **not yet done.** Originally proposed as a fifth checklist step, "Import your existing customers," alongside verify email / check subscription / explore marketplace / complete profile. Not built in this pass since the user's request was scoped to the import mechanism itself; worth a follow-up if onboarding discoverability turns out to matter (the feature is reachable today, just not surfaced during first login).
- **Admin / Reports** — not touched; the import wizard's CSV parsing (`parseCsv()`) is a small hand-rolled parser living alongside the existing `exportReportsCSV()`/`exportPaymentsCSV()` client-side CSV generation, not a shared library.

## 9. Migration checklist (for whoever runs a real customer's import, not just the wizard's own UI copy)

Standard CRM-migration practice, adapted to this context:
1. **One owner.** One person on the agency's side is responsible for the import — not "whoever gets to it."
2. **Export cleanly first.** Ask the agency to dedupe and remove obviously stale/dead leads in their old tool *before* export — migrating garbage in just moves the cleanup problem, it doesn't solve it.
3. **Map once, reuse.** The stage-mapping and column-mapping choices from Section 4 should be saved and reused if the agency does more than one import batch (e.g., historical leads today, then a second batch next week) rather than re-asked every time.
4. **Dry run on a small batch first** for any agency migrating more than ~200 records — import 10-20 rows, have the agent sanity-check them in the real pipeline, then run the rest.
5. **Freeze period.** Don't let the agency add brand-new leads in their old CRM *and* Pumpkino simultaneously during the cutover window — pick a cutover moment and treat the old tool as read-only afterward, to avoid the two falling out of sync.
6. **Monitor for the first week or two.** Watch for duplicate leads slipping through, stage-mapping mistakes (e.g., everything landing in `new` because the mapping step was skipped), or missing travel-date data blocking the "Upcoming trips" view from working as expected.

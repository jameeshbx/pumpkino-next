# AI Itinerary Eval Set (Phase 0)

*Per `prototype/pumpkino/Pumpkino_AI_Assistant_Plan.md` Section 6a, Phase 0: "Write 3-5 real example lead inquiries with a hand-written 'ideal' itinerary JSON output for each... This is the eval set every later phase gets checked against — do this before writing any prompt."*

**Status: written, not yet tested against a real model — that's Phase 1, blocked on an `ANTHROPIC_API_KEY`.**

## How to use this once a key is available

Phase 1 (`AI Assistant Plan` Section 6a): build a standalone script (not wired into the app) that sends each `Raw inquiry` below to Claude with tool-use, targeting the `Itinerary` schema (`prisma/schema.prisma` — `overview`, `hotelName`, `hotelCategory`, `days: [{title, description}]`), and compares the result against the hand-written `Ideal output` here. Iterate the prompt against this set until drafts are close to the ideal — this loop should run entirely outside the app before anything touches `src/application/itineraries/`.

**Grounding data** (Phase 3's retrieval step queries `DmcListing`/`DmcPackage` by destination — these examples are built from what's actually seeded today, `prisma/seed.ts`):

| DMC | Destinations | Package | Duration | Price |
|---|---|---|---|---|
| Kerala Tour Mart DMC | Kerala, Backwaters | Classic Kerala Circuit (Munnar/Thekkady/Alleppey) | 5N/6D | ₹18,500 pp |
| Kerala Tour Mart DMC | Kerala, Backwaters | Backwater Honeymoon (Alleppey/Kumarakom) | 3N/4D | ₹24,000/couple |
| Coastal Karnataka DMC | Karnataka | Gokarna Beach Trail | 3N/4D | ₹12,500 pp |
| Rajasthan Heritage DMC | Rajasthan | Golden Triangle Plus (Jaipur/Agra/Delhi) | 5N/6D | ₹21,000 pp |
| Gulf Experience DMC | UAE | Dubai City Break | 4N/5D | ₹52,000 pp |

---

## Example 1 — Honeymoon, budget-conscious

**Raw inquiry** (as an agent would paste it from WhatsApp):
> "Hi, myself and my wife are planning our honeymoon, thinking Kerala backwaters, maybe 4 nights. Budget around 90k total. End of next month if possible."

**Parsed:**
```json
{ "destination": "Kerala", "pax": "2 (couple)", "nights": 4, "budget": 90000, "tripType": "honeymoon" }
```

**Retrieved:** Kerala Tour Mart DMC's "Backwater Honeymoon" (Alleppey/Kumarakom, 3N/4D, ₹24,000/couple) — closest match; 4th night added at the same houseboat property since the DMC's package is 3N/4D and the ask was 4 nights.

**Ideal output:**
```json
{
  "overview": "A relaxed 4-night Kerala backwaters honeymoon through Alleppey and Kumarakom, anchored by a private houseboat night — comfortably inside budget with a couple of nights to spare.",
  "hotelName": "Kumarakom Lake Resort + private houseboat (1N)",
  "hotelCategory": "4-star",
  "days": [
    { "title": "Day 1 — Arrival & Alleppey", "description": "Arrive Kochi, transfer to Alleppey (~1.5h). Check in, evening at leisure by the backwaters." },
    { "title": "Day 2 — Houseboat cruise", "description": "Board a private houseboat for an overnight backwater cruise — all meals included, sunset viewing from the deck." },
    { "title": "Day 3 — Kumarakom", "description": "Disembark after breakfast, transfer to Kumarakom Lake Resort. Afternoon at the resort's private beach; optional couples' spa (extra)." },
    { "title": "Day 4 — Departure", "description": "Leisure morning, checkout by noon, transfer to Kochi airport for departure." }
  ]
}
```

---

## Example 2 — Family group, adventure-leaning

**Raw inquiry:**
> "Family of 4 (2 adults 2 kids, 8 and 12), want Munnar and Thekkady, wildlife safari for the kids, maybe 5-6 days. Looking at around 1.2L."

**Parsed:**
```json
{ "destination": "Kerala", "pax": "4 (2 adults, 2 children ages 8 & 12)", "nights": 5, "budget": 120000, "tripType": "family" }
```

**Retrieved:** Kerala Tour Mart DMC's "Classic Kerala Circuit" (Munnar/Thekkady/Alleppey, 5N/6D, ₹18,500 pp) — matches destinations and length almost exactly; total for 4 pax ≈ ₹74,000, comfortably inside budget, leaving room to upgrade the safari to a private jeep.

**Ideal output:**
```json
{
  "overview": "5-night Munnar–Thekkady–Alleppey family circuit built around the kids — a private jungle safari in Thekkady is the trip's centerpiece, with an easygoing backwaters day to close.",
  "hotelName": "Fragrant Nature Munnar / Cardamom County Thekkady / Alleppey Backwater Resort",
  "hotelCategory": "4-star",
  "days": [
    { "title": "Day 1 — Arrival, Munnar", "description": "Arrive Kochi, drive to Munnar (~4h) through tea estates. Evening at leisure." },
    { "title": "Day 2 — Munnar sightseeing", "description": "Tea museum, Mattupetty Dam, Echo Point — a light day, good for jet lag with kids." },
    { "title": "Day 3 — Munnar to Thekkady", "description": "Drive to Thekkady (~3h). Evening spice plantation walk." },
    { "title": "Day 4 — Thekkady wildlife safari", "description": "Private jeep safari in Periyar Tiger Reserve (morning slot, best sightings) — the trip's highlight for the kids." },
    { "title": "Day 5 — Thekkady to Alleppey", "description": "Drive to Alleppey (~4h), afternoon houseboat cruise on the backwaters." },
    { "title": "Day 6 — Departure", "description": "Morning at leisure, transfer to Kochi airport." }
  ]
}
```

---

## Example 3 — Solo traveller, culture-focused

**Raw inquiry:**
> "solo trip, want to see rajasthan properly, jaipur udaipur if possible, culture and forts not shopping, 6-7 days, flexible on budget honestly"

**Parsed:**
```json
{ "destination": "Rajasthan", "pax": "1 (solo)", "nights": 6, "budget": null, "tripType": "culture/heritage" }
```

**Retrieved:** Rajasthan Heritage DMC's "Golden Triangle Plus" (Jaipur/Agra/Delhi, 5N/6D, ₹21,000 pp) covers Jaipur but not Udaipur — the draft extends it with an Udaipur add-on since the inquiry explicitly asked for it, flagged clearly as outside the packaged itinerary so the agent knows to confirm pricing with the DMC before sending.

**Ideal output:**
```json
{
  "overview": "6-night solo heritage circuit through Jaipur, Udaipur and Agra, built around forts and palaces rather than shopping, per the ask. Udaipur is added on top of the DMC's standard Golden Triangle package — flag this with the DMC for updated pricing before sending to the customer.",
  "hotelName": "Heritage haveli-style properties (Jaipur, Udaipur), standard business hotel (Agra)",
  "hotelCategory": "4-star heritage",
  "days": [
    { "title": "Day 1 — Arrival, Jaipur", "description": "Arrive Jaipur, check in, evening at Nahargarh Fort for the city view at sunset." },
    { "title": "Day 2 — Jaipur forts", "description": "Amber Fort (morning, before crowds), City Palace, Jantar Mantar in the afternoon." },
    { "title": "Day 3 — Jaipur to Udaipur", "description": "Fly or drive to Udaipur (~6h drive / 1h flight — recommend flight for a solo traveller's comfort). Evening at Lake Pichola." },
    { "title": "Day 4 — Udaipur", "description": "City Palace Udaipur, Jagdish Temple, Saheliyon ki Bari. Evening boat ride on Lake Pichola." },
    { "title": "Day 5 — Udaipur to Agra", "description": "Fly to Delhi, connect to Agra by road (~4h). Evening at leisure." },
    { "title": "Day 6 — Agra, Taj Mahal", "description": "Sunrise visit to the Taj Mahal (best light, fewer crowds), Agra Fort in the afternoon." },
    { "title": "Day 7 — Departure", "description": "Morning at leisure, transfer to Delhi for departure." }
  ]
}
```

---

## Example 4 — Group of friends, beach/nightlife

**Raw inquiry:**
> "6 of us, guys trip, goa, want beach + nightlife nothing too fancy, 3 nights should be enough, keep it cheap"

**Parsed:**
```json
{ "destination": "Goa", "pax": "6 (group of friends)", "nights": 3, "budget": "low", "tripType": "leisure/nightlife" }
```

**Retrieved:** No published package currently exists for Goa Coastal Getaways DMC (listing published, zero packages seeded) — the draft is built from destination knowledge alone and clearly flagged as needing a real DMC quote before any price is shown to the customer, per the PRD's rule that quotes only become real once a DMC actually responds.

**Ideal output:**
```json
{
  "overview": "3-night budget Goa trip for a group of 6, North Goa beach belt for easy nightlife access. No DMC package is on file yet for Goa — this draft is destination-only; send a quote request to Goa Coastal Getaways DMC before pricing this for the customer.",
  "hotelName": "TBD — pending DMC quote",
  "hotelCategory": "3-star, beach-walkable",
  "days": [
    { "title": "Day 1 — Arrival, Baga/Calangute", "description": "Check in, evening at Tito's Lane." },
    { "title": "Day 2 — Beach day + Anjuna", "description": "Daytime at Baga beach, evening at Anjuna's beach shacks/flea market if timed right." },
    { "title": "Day 3 — Departure", "description": "Morning at leisure, checkout, departure." }
  ]
}
```

---

## Example 5 — International, short business-adjacent leisure

**Raw inquiry:**
> "need a quick dubai trip for me and my husband, 4 nights, nothing too touristy just want to relax and maybe one nice dinner"

**Parsed:**
```json
{ "destination": "Dubai, UAE", "pax": "2 (couple)", "nights": 4, "budget": null, "tripType": "relaxation" }
```

**Retrieved:** Gulf Experience DMC's "Dubai City Break" (4N/5D, ₹52,000 pp) — matches length exactly; the draft deliberately trims the usual sightseeing-heavy itinerary to match "nothing too touristy," per the ask.

**Ideal output:**
```json
{
  "overview": "4-night low-key Dubai break for a couple — light on sightseeing per the ask, built around downtime and one standout dinner rather than a packed tour schedule.",
  "hotelName": "Address Downtown or equivalent",
  "hotelCategory": "5-star",
  "days": [
    { "title": "Day 1 — Arrival", "description": "Arrive, check in, evening at leisure by the hotel pool/Burj Khalifa fountain view." },
    { "title": "Day 2 — Relax day", "description": "Free day — spa, pool, or beach club at the hotel. No scheduled activities." },
    { "title": "Day 3 — Signature dinner", "description": "Free day until evening; dinner at a standout restaurant (e.g. At.mosphere, Burj Khalifa) — the trip's one planned event." },
    { "title": "Day 4 — Departure", "description": "Late checkout if available, departure transfer." }
  ]
}
```

---

## What to watch for once Phase 1 testing starts

- **Example 3 and 4 are deliberately the hard cases** — one needs the model to extend beyond a single DMC package (Udaipur add-on) and flag it; the other has zero grounding data at all and needs to say so honestly rather than invent a price. If the model quietly invents pricing in either case, that's the first thing to fix in the prompt — the AI Assistant Plan is explicit that grounding in real, bookable data (not invented) is the whole point of the retrieval step.
- **Log every real draft next to what the agent actually sent** (Section 3, step 5) once this is wired into the app — that comparison, not this static eval set, is what should drive prompt iteration after Phase 1.

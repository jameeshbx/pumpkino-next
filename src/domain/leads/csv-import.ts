import type { LeadStage } from "@prisma/client";

/**
 * CSV/pasted-text lead import (Pumpkino_CRM_Migration_Plan.md Section 4).
 * Pure parsing/guessing logic — no I/O, no Prisma — so it's directly
 * unit-testable. The application layer (import-service.ts) wraps this with
 * the DB-touching dedup/commit/undo steps.
 */

export const IMPORT_TARGET_FIELDS = [
  "name",
  "mobile",
  "email",
  "destination",
  "pax",
  "startDate",
  "stage",
] as const;
export type ImportTargetField = (typeof IMPORT_TARGET_FIELDS)[number];

export type ColumnMapping = Partial<Record<ImportTargetField, string>>;

/** Header aliases used to auto-guess column mapping by name similarity. */
const IMPORT_ALIASES: Record<ImportTargetField, string[]> = {
  name: ["name", "lead name", "full name", "customer", "customer name", "contact name"],
  mobile: ["mobile", "phone", "phone number", "contact number", "whatsapp"],
  email: ["email", "email address", "e-mail"],
  destination: ["destination", "dest", "location", "trip", "package"],
  pax: ["pax", "travellers", "travelers", "people", "group size", "no of pax"],
  startDate: ["travel date", "start date", "date", "departure date", "travel"],
  stage: ["stage", "status", "lead status", "pipeline stage"],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

/** Auto-maps source columns to Pumpkino fields by header-name similarity. */
export function guessColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));

  for (const field of IMPORT_TARGET_FIELDS) {
    const aliases = IMPORT_ALIASES[field];
    const match = normalized.find((h) => aliases.includes(h.norm));
    if (match) mapping[field] = match.raw;
  }
  return mapping;
}

/** Keyword-based stage guess for one distinct source status value. */
export function guessStageFor(value: string): LeadStage {
  const v = value.trim().toLowerCase();
  if (/paid|advance|payment/.test(v)) return "PAYMENT";
  if (/done|booked|complete/.test(v)) return "DONE";
  if (/confirm/.test(v)) return "CONFIRMED";
  if (/quote|dmc/.test(v)) return "DMC";
  if (/markup|invoice/.test(v)) return "MARKUP";
  if (/sent|itinerary/.test(v)) return "SENT";
  return "NEW";
}

/**
 * Minimal RFC4180-ish CSV parser — handles quoted fields containing commas,
 * newlines, and escaped quotes (""). Good enough for exports out of
 * Zoho/LeadSquared/Kapture/Excel/Sheets, the sources named in the migration
 * plan; not a general-purpose CSV library.
 */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim().length > 0));
  const [headers, ...dataRows] = nonEmpty;
  return { headers: (headers ?? []).map((h) => h.trim()), rows: dataRows };
}

/** Last-10-digits normalization for Indian mobile numbers — the most reliable dedup key. */
export function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  return digits.slice(-10);
}

export interface ParsedLeadRow {
  name: string;
  mobile: string | null;
  email: string | null;
  destination: string;
  pax: string | null;
  startDate: string | null; // ISO date or null; left as string for the preview step
  stage: LeadStage;
  importedNotes: string | null;
}

/** Applies a column mapping + stage lookup to one raw CSV row. */
export function mapRow(
  headers: string[],
  row: string[],
  mapping: ColumnMapping,
  stageMapping: Record<string, LeadStage>,
): ParsedLeadRow | null {
  const get = (field: ImportTargetField): string => {
    const header = mapping[field];
    if (!header) return "";
    const idx = headers.indexOf(header);
    return idx >= 0 ? (row[idx] ?? "").trim() : "";
  };

  const name = get("name");
  if (!name) return null; // missing-name rows are skipped (per the plan)

  const rawStage = get("stage");
  const stage = rawStage ? (stageMapping[rawStage] ?? guessStageFor(rawStage)) : "NEW";

  const mappedHeaders = new Set(Object.values(mapping));
  const unmapped = headers
    .map((h, i) => ({ h, v: row[i] }))
    .filter(({ h, v }) => !mappedHeaders.has(h) && v && v.trim().length > 0);
  const importedNotes =
    unmapped.length > 0 ? unmapped.map(({ h, v }) => `${h}: ${v!.trim()}`).join(" · ") : null;

  return {
    name,
    mobile: get("mobile") || null,
    email: get("email") || null,
    destination: get("destination") || "Not specified",
    pax: get("pax") || null,
    startDate: get("startDate") || null,
    stage,
    importedNotes,
  };
}

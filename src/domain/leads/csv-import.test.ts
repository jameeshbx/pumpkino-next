import { describe, it, expect } from "vitest";
import {
  parseCsv,
  guessColumnMapping,
  guessStageFor,
  normalizeMobile,
  mapRow,
} from "./csv-import";

describe("parseCsv", () => {
  it("parses a simple comma-separated file with a header row", () => {
    const { headers, rows } = parseCsv("Name,Mobile\nNandu,9845011223\nPriya,9000022334");
    expect(headers).toEqual(["Name", "Mobile"]);
    expect(rows).toEqual([
      ["Nandu", "9845011223"],
      ["Priya", "9000022334"],
    ]);
  });

  it("handles quoted fields containing commas", () => {
    const { rows } = parseCsv('Name,Notes\nNandu,"Munnar, Alleppey trip"');
    expect(rows[0]).toEqual(["Nandu", "Munnar, Alleppey trip"]);
  });

  it("handles escaped double quotes inside a quoted field", () => {
    const { rows } = parseCsv('Name,Notes\nNandu,"Said ""call me back"""');
    expect(rows[0]).toEqual(["Nandu", 'Said "call me back"']);
  });

  it("skips blank lines", () => {
    const { rows } = parseCsv("Name,Mobile\nNandu,123\n\n\nPriya,456");
    expect(rows).toHaveLength(2);
  });

  it("handles CRLF line endings (common from Excel/Windows exports)", () => {
    const { headers, rows } = parseCsv("Name,Mobile\r\nNandu,123\r\n");
    expect(headers).toEqual(["Name", "Mobile"]);
    expect(rows).toEqual([["Nandu", "123"]]);
  });
});

describe("guessColumnMapping", () => {
  it("maps common Zoho-style headers by alias", () => {
    const mapping = guessColumnMapping(["Lead Name", "Phone", "Email", "Lead Status"]);
    expect(mapping.name).toBe("Lead Name");
    expect(mapping.mobile).toBe("Phone");
    expect(mapping.email).toBe("Email");
    expect(mapping.stage).toBe("Lead Status");
  });

  it("is case- and separator-insensitive", () => {
    const mapping = guessColumnMapping(["FULL_NAME", "phone-number"]);
    expect(mapping.name).toBe("FULL_NAME");
    expect(mapping.mobile).toBe("phone-number");
  });

  it("leaves a field unmapped when no header matches", () => {
    const mapping = guessColumnMapping(["Some Random Column"]);
    expect(mapping.name).toBeUndefined();
  });
});

describe("guessStageFor", () => {
  it.each([
    ["Paid in full", "PAYMENT"],
    ["Advance received", "PAYMENT"],
    ["Booked", "DONE"],
    ["Trip Complete", "DONE"],
    ["Confirmed", "CONFIRMED"],
    ["DMC Quote received", "DMC"],
    ["Markup applied", "MARKUP"],
    ["Itinerary Sent", "SENT"],
    ["Something totally unrelated", "NEW"],
  ] as const)("guesses %s -> %s", (input, expected) => {
    expect(guessStageFor(input)).toBe(expected);
  });
});

describe("normalizeMobile", () => {
  it("keeps the last 10 digits, stripping country code and formatting", () => {
    expect(normalizeMobile("+91 98450 11223")).toBe("9845011223");
    expect(normalizeMobile("098450-11223")).toBe("9845011223");
    expect(normalizeMobile("9845011223")).toBe("9845011223");
  });
});

describe("mapRow", () => {
  const headers = ["Full Name", "Phone", "Status", "Lead Source"];
  const mapping = { name: "Full Name", mobile: "Phone", stage: "Status" };

  it("maps a row using the given column mapping", () => {
    const result = mapRow(headers, ["Nandu", "9845011223", "Paid", "Facebook Ad"], mapping, {});
    expect(result).toMatchObject({ name: "Nandu", mobile: "9845011223", stage: "PAYMENT" });
  });

  it("returns null for a row with no name (skipped, per the plan)", () => {
    const result = mapRow(headers, ["", "9845011223", "Paid", ""], mapping, {});
    expect(result).toBeNull();
  });

  it("prefers an explicit stage-mapping lookup over the keyword guess", () => {
    const result = mapRow(headers, ["Nandu", "123", "Weird Custom Status", ""], mapping, {
      "Weird Custom Status": "DONE",
    });
    expect(result?.stage).toBe("DONE");
  });

  it("concatenates unmapped columns into importedNotes, never silently dropping them", () => {
    const result = mapRow(headers, ["Nandu", "123", "New", "Facebook Ad"], mapping, {});
    expect(result?.importedNotes).toBe("Lead Source: Facebook Ad");
  });

  it("defaults destination to a placeholder when not mapped", () => {
    const result = mapRow(headers, ["Nandu", "123", "New", ""], mapping, {});
    expect(result?.destination).toBe("Not specified");
  });
});

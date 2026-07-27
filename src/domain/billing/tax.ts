import type { TaxAppliesTo } from "@prisma/client";

/**
 * Country-appropriate tax defaults (PRD Section 3 — "starting points, not
 * tax advice"; always editable, never enforced as the only option).
 */
export interface TaxDefault {
  schemeKey: string;
  label: string;
  rate: number;
  appliesTo: TaxAppliesTo;
  note: string;
}

export const TAX_DEFAULTS: Record<string, TaxDefault[]> = {
  India: [
    {
      schemeKey: "IN_GST_5_NO_ITC",
      label: "GST 5% (no ITC, presumptive tour-operator rate)",
      rate: 5,
      appliesTo: "TOTAL",
      note: "Applied to total package price.",
    },
    {
      schemeKey: "IN_GST_18_ITC",
      label: "GST 18% (with input tax credit)",
      rate: 18,
      appliesTo: "TOTAL",
      note: "Applied to total package price.",
    },
  ],
  UAE: [
    {
      schemeKey: "AE_VAT_TOMS",
      label: "VAT 5% — Tour Operator Margin Scheme",
      rate: 5,
      appliesTo: "MARGIN",
      note: "Applied to margin only; zero-rated on margin for international packages.",
    },
  ],
  Thailand: [
    {
      schemeKey: "TH_VAT_7",
      label: "VAT 7% (reduced rate)",
      rate: 7,
      appliesTo: "TOTAL",
      note: "Applied to total package price.",
    },
  ],
};

export const CUSTOM_TAX_SCHEME_KEY = "CUSTOM";

export function taxDefaultsForCountry(country: string): TaxDefault[] {
  return TAX_DEFAULTS[country] ?? [];
}

export const TAX_DISCLAIMER =
  "These defaults are starting points, not tax advice. Confirm the applicable scheme and rate with your accountant.";

import { describe, it, expect } from "vitest";
import {
  planDefinition,
  planCaps,
  priceForCycle,
  annualPriceInr,
  annualPriceUsd,
  isWithinAnnualRefundWindow,
  isPaidPlan,
  defaultGatewayForCountry,
  ANNUAL_REFUND_WINDOW_DAYS,
} from "./plans";

describe("plan caps", () => {
  it("Starter has the pricing page's advertised caps", () => {
    expect(planCaps("STARTER")).toEqual({ teamMembers: 3, leadsPerMonth: 50, dmcConnections: 5 });
  });

  it("Trial mirrors Growth's caps (full Growth-tier access), not unlimited", () => {
    expect(planCaps("TRIAL")).toEqual(planCaps("GROWTH"));
    expect(planCaps("TRIAL").teamMembers).toBe(10);
    expect(planCaps("TRIAL").leadsPerMonth).toBeNull();
  });

  it("Scale is fully unlimited", () => {
    expect(planCaps("SCALE")).toEqual({ teamMembers: null, leadsPerMonth: null, dmcConnections: null });
  });

  it("falls back to unlimited for a plan not in the catalogue (e.g. FREE, DMC-only)", () => {
    expect(planCaps("FREE")).toEqual({ teamMembers: null, leadsPerMonth: null, dmcConnections: null });
  });
});

describe("annual billing pricing", () => {
  it("charges exactly 10 months for annual (the advertised ~17% discount)", () => {
    const growth = planDefinition("GROWTH")!;
    expect(annualPriceInr(growth)).toBe(growth.priceInr * 10);
    expect(annualPriceUsd(growth)).toBe(growth.priceUsd * 10);
  });

  it("priceForCycle matches monthly price for MONTHLY cycle", () => {
    const starter = planDefinition("STARTER")!;
    expect(priceForCycle(starter, "MONTHLY", "INR")).toBe(starter.priceInr);
    expect(priceForCycle(starter, "MONTHLY", "USD")).toBe(starter.priceUsd);
  });

  it("priceForCycle matches the 10x annual price for ANNUAL cycle", () => {
    const scale = planDefinition("SCALE")!;
    expect(priceForCycle(scale, "ANNUAL", "INR")).toBe(scale.priceInr * 10);
  });
});

describe("annual refund window", () => {
  it("is never refundable for a MONTHLY subscription, regardless of age", () => {
    expect(isWithinAnnualRefundWindow("MONTHLY", new Date())).toBe(false);
  });

  it("is refundable for an ANNUAL subscription started today", () => {
    expect(isWithinAnnualRefundWindow("ANNUAL", new Date())).toBe(true);
  });

  it(`is refundable exactly at the ${ANNUAL_REFUND_WINDOW_DAYS}-day boundary`, () => {
    const startedAt = new Date(Date.now() - ANNUAL_REFUND_WINDOW_DAYS * 86_400_000);
    expect(isWithinAnnualRefundWindow("ANNUAL", startedAt)).toBe(true);
  });

  it("is not refundable one day past the window", () => {
    const startedAt = new Date(Date.now() - (ANNUAL_REFUND_WINDOW_DAYS + 1) * 86_400_000);
    expect(isWithinAnnualRefundWindow("ANNUAL", startedAt)).toBe(false);
  });
});

describe("plan tier checks", () => {
  it("trial is not a paid plan (marketplace identity stays gated)", () => {
    expect(isPaidPlan("TRIAL")).toBe(false);
  });

  it("starter/growth/scale are all paid", () => {
    expect(isPaidPlan("STARTER")).toBe(true);
    expect(isPaidPlan("GROWTH")).toBe(true);
    expect(isPaidPlan("SCALE")).toBe(true);
  });
});

describe("gateway routing by billing country", () => {
  it("routes India to Razorpay/INR", () => {
    expect(defaultGatewayForCountry("India")).toEqual({ gateway: "RAZORPAY", currency: "INR" });
  });

  it("is case/whitespace-insensitive", () => {
    expect(defaultGatewayForCountry("  india  ")).toEqual({ gateway: "RAZORPAY", currency: "INR" });
  });

  it("routes every other country to PayPal/USD", () => {
    expect(defaultGatewayForCountry("UAE")).toEqual({ gateway: "PAYPAL", currency: "USD" });
    expect(defaultGatewayForCountry("United States")).toEqual({ gateway: "PAYPAL", currency: "USD" });
  });
});

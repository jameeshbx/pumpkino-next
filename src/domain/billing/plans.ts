import type { Plan, GatewayKind } from "@prisma/client";

/**
 * Subscription plan catalogue (PRD Section 3). Agency-only; DMCs are always
 * on the FREE plan.
 */
export interface PlanDefinition {
  plan: Plan;
  name: string;
  priceInr: number; // per month
  priceUsd: number; // PayPal display price (PRD routes non-India via PayPal/USD)
  blurb: string;
  features: string[];
  paid: boolean;
}

export const PLAN_CATALOGUE: PlanDefinition[] = [
  {
    plan: "TRIAL",
    name: "Free trial",
    priceInr: 0,
    priceUsd: 0,
    blurb: "7 days, auto-granted on signup, no card required",
    features: ["Full CRM access", "Marketplace browsing (masked identity)", "3 directory results"],
    paid: false,
  },
  {
    plan: "STARTER",
    name: "Starter",
    priceInr: 1499,
    priceUsd: 19,
    blurb: "Solo agents / very small agencies",
    features: ["Everything in trial", "Full DMC identity", "Quote requests", "Uncapped search"],
    paid: true,
  },
  {
    plan: "GROWTH",
    name: "Growth",
    priceInr: 4999,
    priceUsd: 59,
    blurb: "Growing agencies — unlocks marketplace + automation",
    features: ["Everything in Starter", "Team roles", "Reports & exports", "Priority support"],
    paid: true,
  },
  {
    plan: "SCALE",
    name: "Scale",
    priceInr: 14999,
    priceUsd: 179,
    blurb: "Multi-branch agencies",
    features: ["Everything in Growth", "Multi-branch", "Dedicated manager"],
    paid: true,
  },
];

export const PAID_PLANS: Plan[] = ["STARTER", "GROWTH", "SCALE"];

/** Only paid plans (not trial) unlock full marketplace identity + quote requests. */
export function isPaidPlan(plan: Plan): boolean {
  return PAID_PLANS.includes(plan);
}

export function planDefinition(plan: Plan): PlanDefinition | undefined {
  return PLAN_CATALOGUE.find((p) => p.plan === plan);
}

/** Trial/unsubscribed marketplace search shows this many unmasked-count results. */
export const FREE_TIER_RESULT_CAP = 3;

export const TRIAL_LENGTH_DAYS = 7;

/**
 * Billing-country gateway routing (PRD Section 3): India → Razorpay (INR),
 * everywhere else → PayPal (USD). Manual override is always available at
 * checkout.
 */
export function defaultGatewayForCountry(country: string): {
  gateway: GatewayKind;
  currency: "INR" | "USD";
} {
  return country.trim().toLowerCase() === "india"
    ? { gateway: "RAZORPAY", currency: "INR" }
    : { gateway: "PAYPAL", currency: "USD" };
}

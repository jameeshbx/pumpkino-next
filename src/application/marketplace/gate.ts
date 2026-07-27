import "server-only";
import type { AuthContext } from "@/application/auth/session";
import { isPlatformStaff } from "@/application/auth/session";
import { isPaidPlan } from "@/domain/billing/plans";

/**
 * Marketplace paid gate (PRD Section 3): only paid agency plans — not trial —
 * unlock real DMC identity, exact location, uncapped results, and quote
 * requests. Everyone can browse.
 */
export interface MarketplaceAccess {
  unlocked: boolean;
  canSendQuoteRequests: boolean;
}

export function marketplaceAccess(ctx: AuthContext): MarketplaceAccess {
  if (isPlatformStaff(ctx)) return { unlocked: true, canSendQuoteRequests: false };
  const isPaidAgency = ctx.accountType === "AGENCY" && isPaidPlan(ctx.account?.plan ?? "TRIAL");
  return {
    unlocked: isPaidAgency,
    canSendQuoteRequests: isPaidAgency && ctx.permissions.has("marketplace:quote-request"),
  };
}

/** Masked display name for locked viewers (PRD: "✓ Verified DMC — Kerala"). */
export function maskedListingName(listing: {
  verified: boolean;
  destinations: string[];
  country: string;
}): string {
  const region = listing.destinations[0] ?? listing.country;
  return `${listing.verified ? "✓ Verified DMC" : "Unverified DMC"} — ${region}`;
}

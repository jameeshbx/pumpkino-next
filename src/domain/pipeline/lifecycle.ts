import type {
  CancelReason,
  LeadStage,
  LifecycleStatus,
  LostReason,
  PaymentStateAtExit,
  RefundStatus,
  RequestStage,
} from "@prisma/client";

/**
 * Lifecycle rules (PRD Section 3, "Lost / cancelled outcomes").
 * `stage` stays pure funnel position; `lifecycleStatus` carries the outcome.
 */

export const LEAD_STAGES: LeadStage[] = [
  "NEW",
  "SENT",
  "CONFIRMED",
  "DMC",
  "MARKUP",
  "PAYMENT",
  "DONE",
];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  NEW: "New inquiry",
  SENT: "Itinerary sent",
  CONFIRMED: "Customer confirmed",
  DMC: "DMC quote selected",
  MARKUP: "Markup & invoice",
  PAYMENT: "Payment pending",
  DONE: "Booked & paid",
};

export const REQUEST_STAGES: RequestStage[] = ["NEW", "REVIEW", "SENT", "PAYMENT", "DONE"];

export const REQUEST_STAGE_LABELS: Record<RequestStage, string> = {
  NEW: "New request",
  REVIEW: "In review",
  SENT: "Quote sent",
  PAYMENT: "Payment pending",
  DONE: "Booked & paid",
};

/** Pre-payment stages from which a lead can be marked lost. */
export const LEAD_LOSABLE_STAGES: LeadStage[] = ["NEW", "SENT", "CONFIRMED", "DMC", "MARKUP"];
/** Stages with money involved — cancellation flow instead of "mark lost". */
export const LEAD_CANCELLABLE_STAGES: LeadStage[] = ["PAYMENT", "DONE"];

export const REQUEST_LOSABLE_STAGES: RequestStage[] = ["NEW", "REVIEW", "SENT"];
export const REQUEST_CANCELLABLE_STAGES: RequestStage[] = ["PAYMENT", "DONE"];

/** Loss reasons available on the agency dashboard (customer-facing). */
export type AgencyLostReason = Extract<
  LostReason,
  "REJECTED_QUOTE" | "NO_RESPONSE_AFTER_REVISION" | "REJECTED_AFTER_PRICING" | "NO_RESPONSE_EXPIRED"
>;

export const AGENCY_LOST_REASONS: { value: AgencyLostReason; label: string }[] = [
  { value: "REJECTED_QUOTE", label: "Customer rejected the quote" },
  { value: "NO_RESPONSE_AFTER_REVISION", label: "No response after revised itinerary" },
  { value: "REJECTED_AFTER_PRICING", label: "Backed out after final pricing" },
  { value: "NO_RESPONSE_EXPIRED", label: "No response — quote went stale" },
];

/** Loss reasons available in the DMC portal (agency-facing). */
export type DmcLostReason = Extract<
  LostReason,
  "AGENCY_DECLINED" | "AGENCY_BOOKED_ELSEWHERE" | "NO_RESPONSE_EXPIRED"
>;

export const DMC_LOST_REASONS: { value: DmcLostReason; label: string }[] = [
  { value: "AGENCY_DECLINED", label: "Agency declined the quote" },
  { value: "AGENCY_BOOKED_ELSEWHERE", label: "Agency booked with another DMC" },
  { value: "NO_RESPONSE_EXPIRED", label: "No response — request went stale" },
];

export const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  CANCELLED_AFTER_ADVANCE: "Cancelled after advance paid",
  CANCELLED_AFTER_FULL_PAYMENT: "Cancelled after full payment",
};

export function cancelReasonFor(paymentState: PaymentStateAtExit): CancelReason {
  return paymentState === "FULLY_PAID"
    ? "CANCELLED_AFTER_FULL_PAYMENT"
    : "CANCELLED_AFTER_ADVANCE";
}

/** Money involved → refund tracking starts immediately (PRD rule). */
export function initialRefundStatus(paymentState: PaymentStateAtExit): RefundStatus {
  return paymentState === "NONE" ? "NOT_APPLICABLE" : "PENDING";
}

/**
 * Reopening a cancelled record whose refund is already processed requires an
 * explicit confirmation — the refund cannot be auto-reversed (PRD rule).
 */
export function reopenNeedsConfirmation(
  lifecycleStatus: LifecycleStatus,
  refundStatus: RefundStatus,
): boolean {
  return lifecycleStatus === "CANCELLED" && refundStatus === "PROCESSED";
}

/** Cancellation policy tiers (PRD: 100% / 50% / 0% by days before travel). */
export function refundTierFor(daysBeforeTravel: number): { pct: number; label: string } {
  if (daysBeforeTravel >= 30) return { pct: 100, label: "100% refund (30+ days before travel)" };
  if (daysBeforeTravel >= 7) return { pct: 50, label: "50% refund (7–29 days before travel)" };
  return { pct: 0, label: "No refund (under 7 days before travel)" };
}

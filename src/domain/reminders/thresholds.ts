/**
 * Reminder rule thresholds (AI Assistant Plan Section 4). Deterministic —
 * these fire the same way every time regardless of whether an LLM wording
 * layer is available. Numbers, not vibes: an agent needs to trust that
 * "quote pending 24h" always fires at 24h.
 */
export const TRIAL_REMINDER_DAYS = 2;
export const CUSTOMER_PAYMENT_PENDING_HOURS = 48;
export const DMC_PAYMENT_PENDING_HOURS = 48;
export const QUOTE_UNANSWERED_HOURS = 24;
export const VERIFICATION_STALE_DAYS = 5;
export const ITINERARY_SENT_NO_REPLY_DAYS = 3;

export function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export function daysAgo(days: number): Date {
  return hoursAgo(days * 24);
}

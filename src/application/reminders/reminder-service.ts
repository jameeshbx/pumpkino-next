import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import type { AuthContext } from "@/application/auth/session";
import { leadScopeWhere } from "@/application/leads/lead-scope";
import {
  CUSTOMER_PAYMENT_PENDING_HOURS,
  DMC_PAYMENT_PENDING_HOURS,
  ITINERARY_SENT_NO_REPLY_DAYS,
  QUOTE_UNANSWERED_HOURS,
  TRIAL_REMINDER_DAYS,
  VERIFICATION_STALE_DAYS,
  daysAgo,
  hoursAgo,
} from "@/domain/reminders/thresholds";

export interface Reminder {
  id: string;
  text: string;
  href: string;
}

/**
 * Deterministic reminders (AI Assistant Plan Section 4): "keep the trigger
 * logic deterministic, use the LLM only for wording." No LLM wording layer
 * exists yet (blocked on an API key) — these are the plain templated
 * strings the plan explicitly calls out as the required fallback, not a
 * placeholder for something better: "a mis-worded reminder is fine, a
 * missing reminder is not."
 */
export async function getAgencyReminders(ctx: AuthContext): Promise<Reminder[]> {
  const reminders: Reminder[] = [];
  const where = await leadScopeWhere(ctx);

  if (ctx.account?.plan === "TRIAL" && ctx.account.trialEndsAt) {
    const daysLeft = Math.ceil((ctx.account.trialEndsAt.getTime() - Date.now()) / 86_400_000);
    if (daysLeft <= TRIAL_REMINDER_DAYS && daysLeft >= 0) {
      reminders.push({
        id: "trial-ending",
        text:
          daysLeft === 0
            ? "Your trial ends today — pick a plan to keep full access."
            : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left on your trial — pick a plan to keep full access.`,
        href: "/dashboard/subscription",
      });
    }
  }

  const [paymentPending, itinerarySentStale, verificationStale] = await Promise.all([
    prisma.lead.count({
      where: { ...where, lifecycleStatus: "ACTIVE", stage: "PAYMENT", updatedAt: { lte: hoursAgo(CUSTOMER_PAYMENT_PENDING_HOURS) } },
    }),
    prisma.lead.count({
      where: { ...where, lifecycleStatus: "ACTIVE", stage: "SENT", updatedAt: { lte: daysAgo(ITINERARY_SENT_NO_REPLY_DAYS) } },
    }),
    ctx.accountId
      ? prisma.verificationSubmission.findFirst({
          where: { accountId: ctx.accountId, status: "SUBMITTED", submittedAt: { lte: daysAgo(VERIFICATION_STALE_DAYS) } },
        })
      : null,
  ]);

  if (paymentPending > 0) {
    reminders.push({
      id: "payment-pending",
      text: `${paymentPending} customer payment${paymentPending === 1 ? "" : "s"} pending for over ${CUSTOMER_PAYMENT_PENDING_HOURS}h.`,
      href: "/dashboard/leads",
    });
  }
  if (itinerarySentStale > 0) {
    reminders.push({
      id: "itinerary-stale",
      text: `${itinerarySentStale} itinerary${itinerarySentStale === 1 ? "" : "ies"} sent ${ITINERARY_SENT_NO_REPLY_DAYS}+ days ago with no customer reply yet — worth a follow-up.`,
      href: "/dashboard/leads",
    });
  }
  if (verificationStale) {
    reminders.push({
      id: "verification-stale",
      text: `Your business verification has been under review for ${VERIFICATION_STALE_DAYS}+ days.`,
      href: "/dashboard/profile",
    });
  }

  return reminders;
}

export async function getDmcReminders(ctx: AuthContext): Promise<Reminder[]> {
  const reminders: Reminder[] = [];
  if (!ctx.accountId) return reminders;

  const [unanswered, paymentPending, verificationStale] = await Promise.all([
    prisma.quoteRequest.count({
      where: {
        dmcAccountId: ctx.accountId,
        lifecycleStatus: "ACTIVE",
        stage: "NEW",
        createdAt: { lte: hoursAgo(QUOTE_UNANSWERED_HOURS) },
      },
    }),
    prisma.quoteRequest.count({
      where: {
        dmcAccountId: ctx.accountId,
        lifecycleStatus: "ACTIVE",
        stage: "PAYMENT",
        updatedAt: { lte: hoursAgo(DMC_PAYMENT_PENDING_HOURS) },
      },
    }),
    prisma.verificationSubmission.findFirst({
      where: { accountId: ctx.accountId, status: "SUBMITTED", submittedAt: { lte: daysAgo(VERIFICATION_STALE_DAYS) } },
    }),
  ]);

  if (unanswered > 0) {
    reminders.push({
      id: "unanswered",
      text: `${unanswered} quote request${unanswered === 1 ? "" : "s"} unanswered for over ${QUOTE_UNANSWERED_HOURS}h — keep response time low.`,
      href: "/dmc/requests",
    });
  }
  if (paymentPending > 0) {
    reminders.push({
      id: "payment-pending",
      text: `${paymentPending} payment${paymentPending === 1 ? "" : "s"} pending for over ${DMC_PAYMENT_PENDING_HOURS}h.`,
      href: "/dmc/requests",
    });
  }
  if (verificationStale) {
    reminders.push({
      id: "verification-stale",
      text: `Your business verification has been under review for ${VERIFICATION_STALE_DAYS}+ days.`,
      href: "/dmc/profile",
    });
  }

  return reminders;
}

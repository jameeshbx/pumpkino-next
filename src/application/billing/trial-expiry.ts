import "server-only";
import type { Plan } from "@prisma/client";
import { prisma } from "@/infrastructure/db/prisma";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";

/**
 * Lazy trial-expiry downgrade. The PRD (pricing/support/refund pages) is
 * explicit: a trial grants full Growth-tier access for 7 days, and on
 * expiry the account "softly" moves to Starter — nothing is blocked, no
 * data is touched, no card is charged (there isn't one on file).
 *
 * No cron/queue infrastructure exists yet (Build Roadmap: don't reach for
 * one until a real scheduled-job need exists), so this is checked lazily on
 * every session load — the write only actually fires once, on whichever
 * request happens to land first after `trialEndsAt` passes.
 */
export async function downgradeIfTrialExpired(account: {
  id: string;
  plan: Plan;
  trialEndsAt: Date | null;
}): Promise<Plan> {
  if (account.plan !== "TRIAL" || !account.trialEndsAt || account.trialEndsAt > new Date()) {
    return account.plan;
  }

  await prisma.account.update({
    where: { id: account.id },
    data: { plan: "STARTER" },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.SUBSCRIPTION_CHANGED,
    actorUserId: null, // system-initiated, not a user action
    accountId: account.id,
    metadata: { plan: "STARTER", reason: "trial_expired_auto_downgrade" },
  });

  return "STARTER";
}

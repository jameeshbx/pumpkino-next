import "server-only";
import type { BillingCycle, GatewayKind, Plan } from "@prisma/client";
import { prisma } from "@/infrastructure/db/prisma";
import { gatewayFor } from "@/infrastructure/payments/gateway";
import { nextDocumentId } from "@/infrastructure/sequences/document-sequence";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { NotFoundError, ValidationError } from "@/domain/errors";
import {
  defaultGatewayForCountry,
  planDefinition,
  priceForCycle,
  isWithinAnnualRefundWindow,
} from "@/domain/billing/plans";

/**
 * Subscription checkout (PRD "Subscription checkout" flow).
 * Gateway is mocked behind a port — the flow, records, and audit trail are
 * real; only the charge is simulated.
 */
export async function subscribeToPlan(params: {
  accountId: string;
  actorUserId: string;
  plan: Plan;
  billingCycle?: BillingCycle;
  gatewayOverride?: GatewayKind;
}): Promise<{ invoiceNumber: string }> {
  const { accountId, actorUserId, plan } = params;
  const billingCycle = params.billingCycle ?? "MONTHLY";

  const definition = planDefinition(plan);
  if (!definition || !definition.paid) {
    throw new ValidationError("Choose one of the paid plans (Starter, Growth, Scale).");
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { subscriptions: { where: { status: "ACTIVE" }, take: 1 } },
  });
  if (!account) throw new NotFoundError("Account");
  if (account.type !== "AGENCY") {
    throw new ValidationError("DMC accounts are free — no subscription needed.");
  }
  const activeSubscription = account.subscriptions[0];
  if (account.plan === plan && activeSubscription?.billingCycle === billingCycle) {
    throw new ValidationError(
      `You're already on the ${definition.name} plan (${billingCycle === "ANNUAL" ? "annual" : "monthly"}).`,
    );
  }

  const routed = defaultGatewayForCountry(account.country);
  const gateway = params.gatewayOverride ?? routed.gateway;
  const currency = gateway === "RAZORPAY" ? "INR" : "USD";
  const amount = priceForCycle(definition, billingCycle, currency);
  const cycleLabel = billingCycle === "ANNUAL" ? "annual" : "monthly";
  const periodDays = billingCycle === "ANNUAL" ? 365 : 30;
  // MRR always reflects the monthly-equivalent rate for admin reporting, even
  // when the account is actually billed annually up front.
  const monthlyEquivalent = priceForCycle(definition, "MONTHLY", currency);

  // Mock charge (real Razorpay/PayPal integration is explicitly deferred).
  await gatewayFor(gateway).charge({
    accountId,
    amount,
    currency,
    description: `${definition.name} plan — ${cycleLabel}`,
  });

  const invoiceNumber = await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { accountId, status: "ACTIVE" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    const subscription = await tx.subscription.create({
      data: {
        accountId,
        plan,
        billingCycle,
        gateway,
        currency,
        amount,
        currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
      },
    });

    const number = await nextDocumentId("INVOICE", tx);
    await tx.invoice.create({
      data: {
        number,
        accountId,
        subscriptionId: subscription.id,
        description: `${definition.name} plan — ${cycleLabel}`,
        amount,
        currency,
        gateway,
        status: "PAID",
      },
    });

    await tx.account.update({
      where: { id: accountId },
      data: {
        plan,
        mrr: currency === "INR" ? monthlyEquivalent : Math.round(monthlyEquivalent * 84),
        gateway,
      },
    });

    return number;
  });

  await recordAudit({
    action: AUDIT_ACTIONS.SUBSCRIPTION_CHANGED,
    actorUserId,
    accountId,
    metadata: { plan, billingCycle, gateway, amount, currency, invoiceNumber },
  });

  return { invoiceNumber };
}

/**
 * Cancels the active subscription.
 * Assumption (stated): access downgrades to the FREE tier immediately in this
 * build; pro-rated period-end handling belongs with the real gateway work.
 *
 * Refund policy (prototype pumpkino-refund-policy.html): monthly plans are
 * non-refundable mid-cycle. Annual plans cancelled within
 * ANNUAL_REFUND_WINDOW_DAYS of purchase get the matching invoice marked
 * REFUNDED (the actual money movement is mocked, same as checkout's charge —
 * a real gateway refund call is Phase 2 work, not this build).
 */
export async function cancelSubscription(params: {
  accountId: string;
  actorUserId: string;
}): Promise<{ refunded: boolean }> {
  const active = await prisma.subscription.findFirst({
    where: { accountId: params.accountId, status: "ACTIVE" },
  });
  if (!active) throw new ValidationError("There's no active subscription to cancel.");

  const refunded = isWithinAnnualRefundWindow(active.billingCycle, active.startedAt);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: active.id },
      data: { status: "CANCELLED", cancelledAt: now, refundedAt: refunded ? now : null },
    });
    await tx.account.update({
      where: { id: params.accountId },
      data: { plan: "FREE", mrr: 0 },
    });
    if (refunded) {
      await tx.invoice.updateMany({
        where: { subscriptionId: active.id, status: "PAID" },
        data: { status: "REFUNDED" },
      });
    }
  });

  await recordAudit({
    action: AUDIT_ACTIONS.SUBSCRIPTION_CHANGED,
    actorUserId: params.actorUserId,
    accountId: params.accountId,
    metadata: { plan: "FREE", cancelled: true, refunded },
  });

  return { refunded };
}

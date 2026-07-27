import "server-only";
import type { GatewayKind, Plan } from "@prisma/client";
import { prisma } from "@/infrastructure/db/prisma";
import { gatewayFor } from "@/infrastructure/payments/gateway";
import { nextDocumentId } from "@/infrastructure/sequences/document-sequence";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { NotFoundError, ValidationError } from "@/domain/errors";
import { defaultGatewayForCountry, planDefinition } from "@/domain/billing/plans";

/**
 * Subscription checkout (PRD "Subscription checkout" flow).
 * Gateway is mocked behind a port — the flow, records, and audit trail are
 * real; only the charge is simulated.
 */
export async function subscribeToPlan(params: {
  accountId: string;
  actorUserId: string;
  plan: Plan;
  gatewayOverride?: GatewayKind;
}): Promise<{ invoiceNumber: string }> {
  const { accountId, actorUserId, plan } = params;

  const definition = planDefinition(plan);
  if (!definition || !definition.paid) {
    throw new ValidationError("Choose one of the paid plans (Starter, Growth, Scale).");
  }

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new NotFoundError("Account");
  if (account.type !== "AGENCY") {
    throw new ValidationError("DMC accounts are free — no subscription needed.");
  }
  if (account.plan === plan) {
    throw new ValidationError(`You're already on the ${definition.name} plan.`);
  }

  const routed = defaultGatewayForCountry(account.country);
  const gateway = params.gatewayOverride ?? routed.gateway;
  const currency = gateway === "RAZORPAY" ? "INR" : "USD";
  const amount = currency === "INR" ? definition.priceInr : definition.priceUsd;

  // Mock charge (real Razorpay/PayPal integration is explicitly deferred).
  await gatewayFor(gateway).charge({
    accountId,
    amount,
    currency,
    description: `${definition.name} plan — monthly`,
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
        gateway,
        currency,
        amount,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const number = await nextDocumentId("INVOICE", tx);
    await tx.invoice.create({
      data: {
        number,
        accountId,
        subscriptionId: subscription.id,
        description: `${definition.name} plan — monthly`,
        amount,
        currency,
        gateway,
        status: "PAID",
      },
    });

    await tx.account.update({
      where: { id: accountId },
      data: { plan, mrr: currency === "INR" ? amount : Math.round(amount * 84), gateway },
    });

    return number;
  });

  await recordAudit({
    action: AUDIT_ACTIONS.SUBSCRIPTION_CHANGED,
    actorUserId,
    accountId,
    metadata: { plan, gateway, amount, currency, invoiceNumber },
  });

  return { invoiceNumber };
}

/**
 * Cancels the active subscription.
 * Assumption (stated): access downgrades to the FREE tier immediately in this
 * build; pro-rated period-end handling belongs with the real gateway work.
 */
export async function cancelSubscription(params: {
  accountId: string;
  actorUserId: string;
}): Promise<void> {
  const active = await prisma.subscription.findFirst({
    where: { accountId: params.accountId, status: "ACTIVE" },
  });
  if (!active) throw new ValidationError("There's no active subscription to cancel.");

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: active.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    }),
    prisma.account.update({
      where: { id: params.accountId },
      data: { plan: "FREE", mrr: 0 },
    }),
  ]);

  await recordAudit({
    action: AUDIT_ACTIONS.SUBSCRIPTION_CHANGED,
    actorUserId: params.actorUserId,
    accountId: params.accountId,
    metadata: { plan: "FREE", cancelled: true },
  });
}

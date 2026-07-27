"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/application/auth/session";
import { cancelSubscription, subscribeToPlan } from "@/application/billing/subscribe";
import { ValidationError } from "@/domain/errors";
import { subscribeSchema, type SubscribeInput } from "@/features/billing/schemas";
import { actionOk, toActionError, type ActionResult } from "@/shared/lib/action-result";
import { logger } from "@/shared/lib/logger";

export async function subscribeAction(
  input: SubscribeInput,
): Promise<ActionResult<{ invoiceNumber: string }>> {
  try {
    const ctx = await requirePermission("billing:manage");
    if (!ctx.accountId) throw new ValidationError("No business account attached to this user.");
    const parsed = subscribeSchema.parse(input);

    const result = await subscribeToPlan({
      accountId: ctx.accountId,
      actorUserId: ctx.userId,
      plan: parsed.plan,
      gatewayOverride: parsed.gateway,
    });

    revalidatePath("/dashboard/subscription");
    revalidatePath("/dashboard", "layout");
    return actionOk(result);
  } catch (error) {
    return toActionError(error, (e) => logger.error("subscribe_failed", { error: String(e) }));
  }
}

export async function cancelSubscriptionAction(): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requirePermission("billing:manage");
    if (!ctx.accountId) throw new ValidationError("No business account attached to this user.");

    await cancelSubscription({ accountId: ctx.accountId, actorUserId: ctx.userId });

    revalidatePath("/dashboard/subscription");
    revalidatePath("/dashboard", "layout");
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) =>
      logger.error("cancel_subscription_failed", { error: String(e) }),
    );
  }
}

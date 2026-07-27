"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/application/auth/session";
import {
  advanceLeadStage,
  cancelLeadBooking,
  createLead,
  markLeadLost,
  reopenLead,
  setLeadRefundStatus,
} from "@/application/leads/lead-service";
import {
  cancelBookingSchema,
  createLeadSchema,
  markLostSchema,
  refundStatusSchema,
  reopenLeadSchema,
  type CancelBookingInput,
  type CreateLeadInput,
  type MarkLostInput,
  type RefundStatusInput,
  type ReopenLeadInput,
} from "@/features/leads/schemas";
import { actionOk, toActionError, type ActionResult } from "@/shared/lib/action-result";
import { logger } from "@/shared/lib/logger";

function revalidateLeadViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/lost-cancelled");
  revalidatePath("/dashboard/upcoming");
}

export async function createLeadAction(input: CreateLeadInput): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requirePermission("leads:manage");
    const parsed = createLeadSchema.parse(input);
    await createLead(ctx, {
      ...parsed,
      assignedToId: parsed.assignedToId || undefined,
    });
    revalidateLeadViews();
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) => logger.error("create_lead_failed", { error: String(e) }));
  }
}

export async function advanceLeadAction(leadId: string): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requirePermission("leads:manage");
    await advanceLeadStage(ctx, leadId);
    revalidateLeadViews();
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) => logger.error("advance_lead_failed", { error: String(e) }));
  }
}

export async function markLostAction(input: MarkLostInput): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requirePermission("leads:manage");
    const parsed = markLostSchema.parse(input);
    await markLeadLost(ctx, parsed);
    revalidateLeadViews();
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) => logger.error("mark_lost_failed", { error: String(e) }));
  }
}

export async function cancelBookingAction(
  input: CancelBookingInput,
): Promise<ActionResult<{ refundStatus: string }>> {
  try {
    const ctx = await requirePermission("leads:manage");
    const parsed = cancelBookingSchema.parse(input);
    const result = await cancelLeadBooking(ctx, parsed);
    revalidateLeadViews();
    return actionOk({ refundStatus: result.refundStatus });
  } catch (error) {
    return toActionError(error, (e) => logger.error("cancel_booking_failed", { error: String(e) }));
  }
}

export async function reopenLeadAction(
  input: ReopenLeadInput,
): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  try {
    const ctx = await requirePermission("leads:manage");
    const parsed = reopenLeadSchema.parse(input);
    const result = await reopenLead(ctx, parsed);
    if (!result.needsConfirmation) revalidateLeadViews();
    return actionOk(result);
  } catch (error) {
    return toActionError(error, (e) => logger.error("reopen_lead_failed", { error: String(e) }));
  }
}

export async function setRefundStatusAction(
  input: RefundStatusInput,
): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requirePermission("leads:manage");
    const parsed = refundStatusSchema.parse(input);
    await setLeadRefundStatus(ctx, parsed);
    revalidateLeadViews();
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) =>
      logger.error("set_refund_status_failed", { error: String(e) }),
    );
  }
}

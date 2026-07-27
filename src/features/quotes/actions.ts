"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/application/auth/session";
import {
  cancelRequestBooking,
  confirmRequestBooking,
  markRequestAwaitingPayment,
  markRequestLost,
  reopenRequest,
  sendQuote,
  setRequestRefundStatus,
  startRequestReview,
} from "@/application/quotes/quote-service";
import { toActionResult, type ActionResult } from "@/shared/lib/action-result";
import {
  cancelRequestSchema,
  markRequestLostSchema,
  reopenRequestSchema,
  requestIdSchema,
  requestRefundStatusSchema,
  sendQuoteSchema,
  type CancelRequestInput,
  type MarkRequestLostInput,
  type SendQuoteInput,
} from "./schemas";

const DMC_PATHS = ["/dmc", "/dmc/requests", "/dmc/lost-cancelled"];

function revalidateDmc(): void {
  for (const p of DMC_PATHS) revalidatePath(p);
}

export async function startReviewAction(input: { requestId: string }): Promise<ActionResult<void>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("quotes:manage");
    const { requestId } = requestIdSchema.parse(input);
    await startRequestReview(ctx, requestId);
    revalidateDmc();
  });
}

export async function sendQuoteAction(
  input: SendQuoteInput,
): Promise<ActionResult<{ quoteId: string }>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("quotes:manage");
    const data = sendQuoteSchema.parse(input);
    const result = await sendQuote(ctx, data);
    revalidateDmc();
    return result;
  });
}

export async function awaitPaymentAction(input: { requestId: string }): Promise<ActionResult<void>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("quotes:manage");
    const { requestId } = requestIdSchema.parse(input);
    await markRequestAwaitingPayment(ctx, requestId);
    revalidateDmc();
  });
}

export async function confirmBookingAction(input: {
  requestId: string;
}): Promise<ActionResult<{ bookingId: string }>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("quotes:manage");
    const { requestId } = requestIdSchema.parse(input);
    const result = await confirmRequestBooking(ctx, requestId);
    revalidateDmc();
    return result;
  });
}

export async function markRequestLostAction(input: MarkRequestLostInput): Promise<ActionResult<void>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("quotes:manage");
    const data = markRequestLostSchema.parse(input);
    await markRequestLost(ctx, {
      requestId: data.requestId,
      reason: data.reason,
      initiatedBy: data.initiatedBy,
    });
    revalidateDmc();
  });
}

export async function cancelRequestAction(input: CancelRequestInput): Promise<ActionResult<void>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("quotes:manage");
    const data = cancelRequestSchema.parse(input);
    await cancelRequestBooking(ctx, {
      requestId: data.requestId,
      initiatedBy: data.initiatedBy,
    });
    revalidateDmc();
  });
}

export async function reopenRequestAction(input: {
  requestId: string;
  confirmedRefundWarning: boolean;
}): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("quotes:manage");
    const data = reopenRequestSchema.parse(input);
    const result = await reopenRequest(ctx, data);
    revalidateDmc();
    return result;
  });
}

export async function requestRefundStatusAction(input: {
  requestId: string;
  refundStatus: "PENDING" | "PROCESSED" | "DENIED";
}): Promise<ActionResult<void>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("quotes:manage");
    const data = requestRefundStatusSchema.parse(input);
    await setRequestRefundStatus(ctx, data);
    revalidateDmc();
  });
}

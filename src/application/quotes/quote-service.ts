import "server-only";
import type { InitiatedBy, LostReason, QuoteRequest, RefundStatus } from "@prisma/client";
import { prisma } from "@/infrastructure/db/prisma";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { NotFoundError, ValidationError } from "@/domain/errors";
import {
  REQUEST_CANCELLABLE_STAGES,
  REQUEST_LOSABLE_STAGES,
  cancelReasonFor,
  initialRefundStatus,
  reopenNeedsConfirmation,
} from "@/domain/pipeline/lifecycle";
import { nextDocumentId } from "@/infrastructure/sequences/document-sequence";
import type { AuthContext } from "@/application/auth/session";

/**
 * DMC quote request lifecycle (PRD Section 3).
 *
 * ID rules are strict:
 * - PMK-Q quote IDs exist only once a quote is actually sent (REVIEW → SENT),
 *   never at request creation.
 * - PMK-B booking IDs exist only once the booking is fully paid
 *   (PAYMENT → DONE), and stay traceable to their quote ID.
 */

async function ownRequest(ctx: AuthContext, requestId: string): Promise<QuoteRequest> {
  const request = await prisma.quoteRequest.findFirst({
    where: { id: requestId, dmcAccountId: ctx.accountId! },
  });
  if (!request) throw new NotFoundError("Quote request");
  return request;
}

/** NEW → REVIEW: the DMC starts working on the request. */
export async function startRequestReview(ctx: AuthContext, requestId: string): Promise<void> {
  const request = await ownRequest(ctx, requestId);
  if (request.lifecycleStatus !== "ACTIVE" || request.stage !== "NEW") {
    throw new ValidationError("Only new requests can be moved into review.");
  }
  await prisma.quoteRequest.update({
    where: { id: request.id },
    data: { stage: "REVIEW" },
  });
}

/** REVIEW → SENT: price is required; the PMK-Q quote ID is born here. */
export async function sendQuote(
  ctx: AuthContext,
  input: { requestId: string; quotedPrice: number },
): Promise<{ quoteId: string }> {
  const request = await ownRequest(ctx, input.requestId);
  if (request.lifecycleStatus !== "ACTIVE" || !["NEW", "REVIEW"].includes(request.stage)) {
    throw new ValidationError("A quote can only be sent while the request is new or in review.");
  }

  const quoteId = await prisma.$transaction(async (tx) => {
    const id = await nextDocumentId("QUOTE", tx);
    await tx.quoteRequest.update({
      where: { id: request.id },
      data: { stage: "SENT", quoteId: id, quotedPrice: input.quotedPrice },
    });
    return id;
  });

  await recordAudit({
    action: AUDIT_ACTIONS.QUOTE_SENT,
    actorUserId: ctx.userId,
    accountId: ctx.accountId,
    entityType: "QuoteRequest",
    entityId: request.id,
    metadata: { quoteId, quotedPrice: input.quotedPrice },
  });

  return { quoteId };
}

/** SENT → PAYMENT: the agency accepted; payment is being collected. */
export async function markRequestAwaitingPayment(
  ctx: AuthContext,
  requestId: string,
): Promise<void> {
  const request = await ownRequest(ctx, requestId);
  if (request.lifecycleStatus !== "ACTIVE" || request.stage !== "SENT") {
    throw new ValidationError("Send the quote first — then it can move to payment.");
  }
  await prisma.quoteRequest.update({
    where: { id: request.id },
    data: { stage: "PAYMENT" },
  });
}

/** PAYMENT → DONE: fully paid; the PMK-B booking ID is born here. */
export async function confirmRequestBooking(
  ctx: AuthContext,
  requestId: string,
): Promise<{ bookingId: string }> {
  const request = await ownRequest(ctx, requestId);
  if (request.lifecycleStatus !== "ACTIVE" || request.stage !== "PAYMENT") {
    throw new ValidationError("Only requests awaiting payment can be confirmed as booked.");
  }

  const bookingId = await prisma.$transaction(async (tx) => {
    const id = await nextDocumentId("BOOKING", tx);
    await tx.quoteRequest.update({
      where: { id: request.id },
      data: { stage: "DONE", bookingId: id },
    });
    return id;
  });

  await recordAudit({
    action: AUDIT_ACTIONS.BOOKING_CONFIRMED,
    actorUserId: ctx.userId,
    accountId: ctx.accountId,
    entityType: "QuoteRequest",
    entityId: request.id,
    metadata: { bookingId, quoteId: request.quoteId },
  });

  return { bookingId };
}

export async function markRequestLost(
  ctx: AuthContext,
  input: { requestId: string; reason: LostReason; initiatedBy: InitiatedBy },
): Promise<void> {
  const request = await ownRequest(ctx, input.requestId);
  if (request.lifecycleStatus !== "ACTIVE") {
    throw new ValidationError("This request already left the pipeline.");
  }
  if (!REQUEST_LOSABLE_STAGES.includes(request.stage)) {
    throw new ValidationError(
      "Money is involved at this stage — use “Cancel booking” instead of marking it lost.",
    );
  }

  await prisma.quoteRequest.update({
    where: { id: request.id },
    data: {
      lifecycleStatus: "LOST",
      exitedAtStage: request.stage,
      lostReason: input.reason,
      initiatedBy: input.initiatedBy,
      paymentStateAtExit: "NONE",
      refundStatus: "NOT_APPLICABLE",
    },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.LEAD_LOST,
    actorUserId: ctx.userId,
    accountId: ctx.accountId,
    entityType: "QuoteRequest",
    entityId: request.id,
    metadata: { reason: input.reason, exitedAtStage: request.stage },
  });
}

export async function cancelRequestBooking(
  ctx: AuthContext,
  input: { requestId: string; initiatedBy: InitiatedBy },
): Promise<{ refundStatus: RefundStatus }> {
  const request = await ownRequest(ctx, input.requestId);
  if (request.lifecycleStatus !== "ACTIVE") {
    throw new ValidationError("This request already left the pipeline.");
  }
  if (!REQUEST_CANCELLABLE_STAGES.includes(request.stage)) {
    throw new ValidationError("Nothing has been paid yet — use “Mark lost” instead.");
  }

  // Assumption (README): PAYMENT stage ⇒ advance paid, DONE ⇒ fully paid.
  const paymentState = request.stage === "DONE" ? "FULLY_PAID" : "ADVANCE_PAID";
  const refundStatus = initialRefundStatus(paymentState);

  await prisma.quoteRequest.update({
    where: { id: request.id },
    data: {
      lifecycleStatus: "CANCELLED",
      exitedAtStage: request.stage,
      cancelReason: cancelReasonFor(paymentState),
      initiatedBy: input.initiatedBy,
      paymentStateAtExit: paymentState,
      refundStatus,
    },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.LEAD_CANCELLED,
    actorUserId: ctx.userId,
    accountId: ctx.accountId,
    entityType: "QuoteRequest",
    entityId: request.id,
    metadata: { exitedAtStage: request.stage, paymentState },
  });

  return { refundStatus };
}

export async function reopenRequest(
  ctx: AuthContext,
  input: { requestId: string; confirmedRefundWarning: boolean },
): Promise<{ needsConfirmation: boolean }> {
  const request = await ownRequest(ctx, input.requestId);
  if (request.lifecycleStatus === "ACTIVE") {
    throw new ValidationError("This request is already active.");
  }

  if (
    reopenNeedsConfirmation(request.lifecycleStatus, request.refundStatus) &&
    !input.confirmedRefundWarning
  ) {
    return { needsConfirmation: true };
  }

  await prisma.quoteRequest.update({
    where: { id: request.id },
    data: {
      lifecycleStatus: "ACTIVE",
      stage: request.exitedAtStage ?? request.stage,
      exitedAtStage: null,
      lostReason: null,
      cancelReason: null,
      initiatedBy: null,
      paymentStateAtExit: null,
      refundStatus: "NOT_APPLICABLE",
    },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.LEAD_REOPENED,
    actorUserId: ctx.userId,
    accountId: ctx.accountId,
    entityType: "QuoteRequest",
    entityId: request.id,
    metadata: { refundStatusAtReopen: request.refundStatus },
  });

  return { needsConfirmation: false };
}

export async function setRequestRefundStatus(
  ctx: AuthContext,
  input: {
    requestId: string;
    refundStatus: Extract<RefundStatus, "PENDING" | "PROCESSED" | "DENIED">;
  },
): Promise<void> {
  const request = await ownRequest(ctx, input.requestId);
  if (request.lifecycleStatus !== "CANCELLED" || request.paymentStateAtExit === "NONE") {
    throw new ValidationError("Refund tracking only applies to cancelled bookings with payments.");
  }
  await prisma.quoteRequest.update({
    where: { id: request.id },
    data: { refundStatus: input.refundStatus },
  });
}
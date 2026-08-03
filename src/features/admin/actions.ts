"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/db/prisma";
import { requirePermission } from "@/application/auth/session";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { NotFoundError, ValidationError } from "@/domain/errors";
import {
  accountSuspensionSchema,
  disputeUpdateSchema,
  listingStatusSchema,
  logVerificationDocumentSchema,
  reviewVerificationSchema,
  OPS_DOCUMENT_TYPES,
  type AccountSuspensionInput,
  type DisputeUpdateInput,
  type ListingStatusInput,
  type LogVerificationDocumentInput,
  type ReviewVerificationInput,
} from "@/features/admin/schemas";
import { actionOk, toActionError, type ActionResult } from "@/shared/lib/action-result";
import { logger } from "@/shared/lib/logger";

/**
 * Verification review (PRD flow): Approve / Reject / Request more info.
 * "More info" returns the account to NOT_SUBMITTED so it can resubmit with
 * the reviewer's note visible.
 */
export async function reviewVerificationAction(
  input: ReviewVerificationInput,
): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requirePermission("platform:verification:review");
    const parsed = reviewVerificationSchema.parse(input);

    const submission = await prisma.verificationSubmission.findUnique({
      where: { id: parsed.submissionId },
    });
    if (!submission) throw new NotFoundError("Verification submission");
    if (submission.status !== "SUBMITTED") {
      throw new ValidationError("This submission has already been reviewed.");
    }
    if (parsed.decision === "MORE_INFO" && !parsed.note) {
      throw new ValidationError("Tell the business what extra information you need.");
    }

    const submissionStatus = parsed.decision === "APPROVED" ? "APPROVED" : "REJECTED";
    const accountStatus =
      parsed.decision === "APPROVED"
        ? "APPROVED"
        : parsed.decision === "REJECTED"
          ? "REJECTED"
          : "NOT_SUBMITTED"; // more info → account can resubmit

    await prisma.$transaction([
      prisma.verificationSubmission.update({
        where: { id: submission.id },
        data: {
          status: submissionStatus,
          reviewNote: parsed.note || null,
          reviewedById: ctx.userId,
          reviewedAt: new Date(),
        },
      }),
      prisma.account.update({
        where: { id: submission.accountId },
        data: { verificationStatus: accountStatus },
      }),
    ]);

    await recordAudit({
      action: AUDIT_ACTIONS.VERIFICATION_REVIEWED,
      actorUserId: ctx.userId,
      accountId: submission.accountId,
      entityType: "VerificationSubmission",
      entityId: submission.id,
      metadata: { decision: parsed.decision },
    });

    revalidatePath("/admin/verification");
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) =>
      logger.error("review_verification_failed", { error: String(e) }),
    );
  }
}

/**
 * Ops logs a document that arrived outside the app (email, courier, etc.) —
 * the prototype's "log a document received separately" flow. Logging a
 * document against a NOT_SUBMITTED account moves it into the actionable
 * queue (a lightweight submission is created so it surfaces there), the
 * same real-world case the prototype's Golden Route Holidays example shows:
 * an account that never used the self-serve Profile flow, but Ops still has
 * documents on file for it.
 */
export async function logVerificationDocumentAction(
  input: LogVerificationDocumentInput,
): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requirePermission("platform:verification:review");
    const parsed = logVerificationDocumentSchema.parse(input);

    const account = await prisma.account.findUnique({
      where: { id: parsed.accountId },
      select: { id: true, verificationStatus: true },
    });
    if (!account) throw new NotFoundError("Account");

    const typeLabel = OPS_DOCUMENT_TYPES.find((t) => t.key === parsed.documentType)!.label;

    await prisma.$transaction(async (tx) => {
      await tx.verificationDocument.create({
        data: {
          accountId: account.id,
          name: typeLabel,
          uploadedBy: "OPS",
          note: parsed.note || null,
        },
      });

      if (account.verificationStatus === "NOT_SUBMITTED") {
        await tx.verificationSubmission.create({
          data: {
            accountId: account.id,
            extra: `Document received outside the app and logged by Ops (${typeLabel}).`,
            fileAttached: true,
            status: "SUBMITTED",
          },
        });
        await tx.account.update({
          where: { id: account.id },
          data: { verificationStatus: "SUBMITTED" },
        });
      }
    });

    await recordAudit({
      action: AUDIT_ACTIONS.VERIFICATION_SUBMITTED,
      actorUserId: ctx.userId,
      accountId: account.id,
      metadata: { documentType: parsed.documentType, loggedByOps: true },
    });

    revalidatePath("/admin/verification");
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) =>
      logger.error("log_verification_document_failed", { error: String(e) }),
    );
  }
}

export async function setAccountSuspensionAction(
  input: AccountSuspensionInput,
): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requirePermission("platform:accounts:manage");
    const parsed = accountSuspensionSchema.parse(input);

    const account = await prisma.account.findUnique({ where: { id: parsed.accountId } });
    if (!account) throw new NotFoundError("Account");

    await prisma.account.update({
      where: { id: account.id },
      data: { suspended: parsed.suspend },
    });

    await recordAudit({
      action: parsed.suspend ? AUDIT_ACTIONS.ACCOUNT_SUSPENDED : AUDIT_ACTIONS.ACCOUNT_REACTIVATED,
      actorUserId: ctx.userId,
      accountId: account.id,
    });

    revalidatePath("/admin/accounts");
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) =>
      logger.error("set_account_suspension_failed", { error: String(e) }),
    );
  }
}

export async function updateDisputeAction(
  input: DisputeUpdateInput,
): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requirePermission("platform:disputes:manage");
    const parsed = disputeUpdateSchema.parse(input);

    const dispute = await prisma.dispute.findUnique({ where: { id: parsed.disputeId } });
    if (!dispute) throw new NotFoundError("Dispute");
    if (!parsed.status && !parsed.note) {
      throw new ValidationError("Nothing to update — add a note or change the status.");
    }

    await prisma.$transaction(async (tx) => {
      if (parsed.status && parsed.status !== dispute.status) {
        await tx.dispute.update({ where: { id: dispute.id }, data: { status: parsed.status } });
      }
      if (parsed.note) {
        await tx.disputeNote.create({
          data: { disputeId: dispute.id, author: ctx.name, body: parsed.note },
        });
      }
    });

    await recordAudit({
      action: AUDIT_ACTIONS.DISPUTE_UPDATED,
      actorUserId: ctx.userId,
      entityType: "Dispute",
      entityId: dispute.id,
      metadata: { status: parsed.status, notedAdded: Boolean(parsed.note) },
    });

    revalidatePath("/admin/disputes");
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) => logger.error("update_dispute_failed", { error: String(e) }));
  }
}

export async function setListingStatusAction(
  input: ListingStatusInput,
): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requirePermission("platform:listings:manage");
    const parsed = listingStatusSchema.parse(input);

    const listing = await prisma.dmcListing.findUnique({ where: { id: parsed.listingId } });
    if (!listing) throw new NotFoundError("Listing");

    await prisma.dmcListing.update({
      where: { id: listing.id },
      data: { status: parsed.status },
    });

    await recordAudit({
      action: AUDIT_ACTIONS.LISTING_UPDATED,
      actorUserId: ctx.userId,
      entityType: "DmcListing",
      entityId: listing.id,
      metadata: { status: parsed.status },
    });

    revalidatePath("/admin/listings");
    revalidatePath("/marketplace");
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) =>
      logger.error("set_listing_status_failed", { error: String(e) }),
    );
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/db/prisma";
import { requirePermission } from "@/application/auth/session";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { ConflictError, ValidationError } from "@/domain/errors";
import { verificationSchema, type VerificationInput } from "@/features/verification/schemas";
import { actionOk, toActionError, type ActionResult } from "@/shared/lib/action-result";
import { logger } from "@/shared/lib/logger";

/**
 * Self-serve verification submission (PRD: optional, non-blocking, from the
 * Profile page). Status: NOT_SUBMITTED → SUBMITTED → APPROVED/REJECTED.
 * A rejected account may re-submit.
 */
export async function submitVerificationAction(
  input: VerificationInput,
): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requirePermission("verification:submit");
    if (!ctx.accountId) throw new ValidationError("No business account attached to this user.");
    const parsed = verificationSchema.parse(input);

    const account = await prisma.account.findUniqueOrThrow({
      where: { id: ctx.accountId },
      select: { verificationStatus: true },
    });
    if (account.verificationStatus === "SUBMITTED") {
      throw new ConflictError("A submission is already under review.");
    }
    if (account.verificationStatus === "APPROVED") {
      throw new ConflictError("Your business is already verified.");
    }

    await prisma.$transaction([
      prisma.verificationSubmission.create({
        data: {
          accountId: ctx.accountId,
          gstin: parsed.gstin || null,
          iata: parsed.iata || null,
          bizReg: parsed.bizReg || null,
          extra: parsed.extra || null,
          fileAttached: parsed.fileAttached,
          status: "SUBMITTED",
        },
      }),
      prisma.account.update({
        where: { id: ctx.accountId },
        data: { verificationStatus: "SUBMITTED" },
      }),
    ]);

    await recordAudit({
      action: AUDIT_ACTIONS.VERIFICATION_SUBMITTED,
      actorUserId: ctx.userId,
      accountId: ctx.accountId,
    });

    revalidatePath("/dashboard/profile");
    revalidatePath("/dmc/profile");
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) =>
      logger.error("submit_verification_failed", { error: String(e) }),
    );
  }
}

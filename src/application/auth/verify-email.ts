import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import { hashToken } from "@/infrastructure/auth/tokens";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { ValidationError } from "@/domain/errors";

/**
 * Email verification (PRD: cosmetic — never blocks anything). Marks the
 * user's email verified for onboarding-checklist purposes.
 */
export async function verifyEmail(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!token || token.usedAt || token.expiresAt < new Date()) {
    throw new ValidationError("This verification link is invalid or has expired.");
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: token.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  await recordAudit({
    action: AUDIT_ACTIONS.EMAIL_VERIFIED,
    actorUserId: token.userId,
    accountId: token.user.accountId,
  });
}

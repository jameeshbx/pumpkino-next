import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import { generateToken, hashToken, EMAIL_VERIFICATION_TTL_MS } from "@/infrastructure/auth/tokens";
import { mailer } from "@/infrastructure/email/mailer";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { ValidationError } from "@/domain/errors";
import { env } from "@/shared/lib/env";

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

/**
 * Resend a verification link. Always behaves identically whether or not the
 * email exists / is already verified (no account enumeration) — mirrors
 * requestPasswordReset().
 */
export async function resendEmailVerification(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE" || user.emailVerifiedAt) return;

  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const { raw, hash } = generateToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    },
  });

  await mailer.send({
    to: user.email,
    subject: "Verify your Pumpkino email",
    text: `Confirm your email: ${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${raw}\n\nVerifying your email doesn't block anything — your account is already active.`,
  });

  await recordAudit({
    action: AUDIT_ACTIONS.EMAIL_VERIFICATION_RESENT,
    actorUserId: user.id,
    accountId: user.accountId,
  });
}

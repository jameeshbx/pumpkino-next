import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import { hashPassword } from "@/infrastructure/auth/password";
import { generateToken, hashToken, PASSWORD_RESET_TTL_MS } from "@/infrastructure/auth/tokens";
import { mailer } from "@/infrastructure/email/mailer";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { ValidationError } from "@/domain/errors";
import { env } from "@/shared/lib/env";

/**
 * Forgot-password flow. Always behaves identically whether or not the email
 * exists (no account enumeration). Tokens are single-use, hashed at rest,
 * and short-lived.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return; // indistinguishable from success

  // Invalidate any previous outstanding tokens.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const { raw, hash } = generateToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  await mailer.send({
    to: user.email,
    subject: "Reset your Pumpkino password",
    text: `Reset your password: ${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${raw}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore it.`,
  });

  await recordAudit({
    action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
    actorUserId: user.id,
    accountId: user.accountId,
  });
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!token || token.usedAt || token.expiresAt < new Date()) {
    throw new ValidationError("This reset link is invalid or has expired. Request a new one.");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: token.userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    }),
  ]);

  await recordAudit({
    action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
    actorUserId: token.userId,
    accountId: token.user.accountId,
  });
}

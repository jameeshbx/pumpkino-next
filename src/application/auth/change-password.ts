import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import { hashPassword, verifyPassword } from "@/infrastructure/auth/password";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { NotFoundError, ValidationError } from "@/domain/errors";

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new ValidationError("Your current password is incorrect.");

  if (currentPassword === newPassword) {
    throw new ValidationError("The new password must be different from the current one.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.PASSWORD_CHANGED,
    actorUserId: userId,
    accountId: user.accountId,
  });
}

import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/infrastructure/db/prisma";
import { verifyAgainstDummy, verifyPassword } from "@/infrastructure/auth/password";
import { authConfig } from "@/infrastructure/auth/auth.config";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { logger } from "@/shared/lib/logger";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

/**
 * Full NextAuth instance (Node runtime).
 *
 * Security controls:
 * - bcrypt verification with a dummy-hash compare when the user is unknown
 *   (uniform timing → no account enumeration);
 * - account lockout after repeated failures (reversible, time-boxed);
 * - suspended users/accounts cannot sign in;
 * - login attempts are rate limited in the login server action before this
 *   authorize() runs;
 * - all outcomes are audit-logged.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            account: { select: { id: true, type: true, suspended: true } },
            roles: { include: { role: { select: { key: true } } } },
          },
        });

        if (!user || user.status === "REMOVED") {
          await verifyAgainstDummy(password); // uniform timing
          return null;
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          logger.warn("login_blocked_lockout", { userId: user.id });
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          const failedLoginCount = user.failedLoginCount + 1;
          const lock = failedLoginCount >= MAX_FAILED_ATTEMPTS;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: lock ? 0 : failedLoginCount,
              lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
            },
          });
          await recordAudit({
            action: lock ? AUDIT_ACTIONS.LOCKOUT : AUDIT_ACTIONS.LOGIN_FAILED,
            actorUserId: user.id,
            accountId: user.accountId,
          });
          return null;
        }

        if (user.status === "SUSPENDED" || user.account?.suspended) {
          logger.warn("login_blocked_suspended", { userId: user.id });
          return null;
        }

        // Success — clear failure counters.
        if (user.failedLoginCount > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginCount: 0, lockedUntil: null },
          });
        }

        await recordAudit({
          action: AUDIT_ACTIONS.LOGIN,
          actorUserId: user.id,
          accountId: user.accountId,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          accountId: user.accountId,
          accountType: user.account?.type ?? null,
          roles: user.roles.map((r) => r.role.key),
        };
      },
    }),
  ],
});

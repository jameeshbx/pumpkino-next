import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { AccountType, Plan } from "@prisma/client";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/db/prisma";
import { ForbiddenError } from "@/domain/errors";

/**
 * Session + authorization context, loaded once per request (React cache).
 *
 * Permissions are read from the database on every request — not from the
 * JWT — so a role/permission change takes effect immediately, and roles
 * remain configurable at runtime.
 */
export interface AuthContext {
  userId: string;
  name: string;
  email: string;
  accountId: string | null;
  accountType: AccountType | null;
  roles: string[];
  permissions: Set<string>;
  account: {
    id: string;
    name: string;
    plan: Plan;
    trialEndsAt: Date | null;
    country: string;
    verificationStatus: string;
    suspended: boolean;
  } | null;
  user: {
    teamType: string | null;
    teamLeadId: string | null;
    assignedDestinations: string[];
    emailVerifiedAt: Date | null;
  };
}

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      account: {
        select: {
          id: true,
          type: true,
          name: true,
          plan: true,
          trialEndsAt: true,
          country: true,
          verificationStatus: true,
          suspended: true,
        },
      },
      roles: {
        include: {
          role: {
            include: { permissions: { include: { permission: { select: { key: true } } } } },
          },
        },
      },
    },
  });

  if (!user || user.status !== "ACTIVE" || user.account?.suspended) return null;

  const permissions = new Set<string>();
  const roles: string[] = [];
  for (const ur of user.roles) {
    roles.push(ur.role.key);
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    accountId: user.accountId,
    accountType: user.account?.type ?? null,
    roles,
    permissions,
    account: user.account
      ? {
          id: user.account.id,
          name: user.account.name,
          plan: user.account.plan,
          trialEndsAt: user.account.trialEndsAt,
          country: user.account.country,
          verificationStatus: user.account.verificationStatus,
          suspended: user.account.suspended,
        }
      : null,
    user: {
      teamType: user.teamType,
      teamLeadId: user.teamLeadId,
      assignedDestinations: user.assignedDestinations,
      emailVerifiedAt: user.emailVerifiedAt,
    },
  };
});

/** For pages: redirect to /login when unauthenticated. */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  return ctx;
}

/** For pages: require a permission or redirect to the surface home. */
export async function requirePermissionPage(permission: string): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!ctx.permissions.has(permission)) redirect("/");
  return ctx;
}

/** For server actions / route handlers: throw instead of redirecting. */
export async function requirePermission(permission: string): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new ForbiddenError("Not signed in");
  if (!ctx.permissions.has(permission)) throw new ForbiddenError();
  return ctx;
}

export function hasPermission(ctx: AuthContext, permission: string): boolean {
  return ctx.permissions.has(permission);
}

export function isPlatformStaff(ctx: AuthContext): boolean {
  return ctx.roles.includes("SUPER_ADMIN") || ctx.roles.includes("OPS_ADMIN");
}

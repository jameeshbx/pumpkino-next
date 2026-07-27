import "server-only";
import { randomBytes } from "crypto";
import { prisma } from "@/infrastructure/db/prisma";
import { hashPassword } from "@/infrastructure/auth/password";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/domain/errors";
import { canCreateRole, roleExtraField } from "@/domain/rbac/roles";
import type { AuthContext } from "@/application/auth/session";

/**
 * Agency/DMC team management (PRD Section 4 "User assignment / modification").
 * All the cascade rules live here: teamLeadId is an explicit reference that
 * is cleared — never left dangling — when the Team Lead stops being one.
 */

function actorManagementRole(ctx: AuthContext): string {
  // Highest-privilege role the actor holds that can manage users.
  for (const role of ["AGENCY_OWNER", "AGENCY_MANAGER", "DMC_OWNER"]) {
    if (ctx.roles.includes(role)) return role;
  }
  throw new ForbiddenError();
}

async function loadTargetUser(ctx: AuthContext, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, accountId: ctx.accountId!, status: { not: "REMOVED" } },
    include: { roles: { include: { role: { select: { key: true, id: true } } } } },
  });
  if (!user) throw new NotFoundError("User");
  return user;
}

function primaryRoleKey(user: { roles: { role: { key: string } }[] }): string {
  return user.roles[0]?.role.key ?? "";
}

async function assertNotLastOwner(accountId: string, userId: string, ownerRole: string) {
  const otherOwners = await prisma.user.count({
    where: {
      accountId,
      id: { not: userId },
      status: "ACTIVE",
      roles: { some: { role: { key: ownerRole } } },
    },
  });
  if (otherOwners === 0) {
    throw new ValidationError("This is the only admin on the account — add another admin first.");
  }
}

export interface UserExtras {
  teamType?: string;
  teamLeadId?: string;
  assignedDestinations?: string[];
}

function extrasForRole(roleKey: string, extras: UserExtras) {
  const field = roleExtraField(roleKey);
  return {
    teamType: field === "teamType" ? (extras.teamType?.trim() || null) : null,
    teamLeadId: field === "teamLead" ? (extras.teamLeadId || null) : null,
    assignedDestinations: field === "destinations" ? (extras.assignedDestinations ?? []) : [],
  };
}

async function validateTeamLead(accountId: string, teamLeadId: string | null) {
  if (!teamLeadId) return;
  const lead = await prisma.user.findFirst({
    where: {
      id: teamLeadId,
      accountId,
      status: "ACTIVE",
      roles: { some: { role: { key: "AGENCY_TEAM_LEAD" } } },
    },
  });
  if (!lead) throw new ValidationError("Pick an active Team Lead for this Executive to report to.");
}

export async function createAccountUser(
  ctx: AuthContext,
  input: { name: string; email: string; roleKey: string } & UserExtras,
): Promise<{ userId: string; temporaryPassword: string }> {
  const actorRole = actorManagementRole(ctx);
  if (!canCreateRole(actorRole, input.roleKey)) {
    throw new ForbiddenError(`You don't have permission to add a ${input.roleKey} user.`);
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError("A user with this email already exists.");

  const role = await prisma.role.findUnique({ where: { key: input.roleKey } });
  if (!role) throw new NotFoundError("Role");

  const extras = extrasForRole(input.roleKey, input);
  await validateTeamLead(ctx.accountId!, extras.teamLeadId);

  // Temporary password shown once to the admin (no email provider is wired).
  const temporaryPassword = `Pk-${randomBytes(9).toString("base64url")}`;
  const passwordHash = await hashPassword(temporaryPassword);

  const user = await prisma.user.create({
    data: {
      accountId: ctx.accountId!,
      name: input.name,
      email: input.email,
      passwordHash,
      ...extras,
      roles: { create: { roleId: role.id } },
    },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.USER_CREATED,
    actorUserId: ctx.userId,
    accountId: ctx.accountId,
    entityType: "User",
    entityId: user.id,
    metadata: { roleKey: input.roleKey },
  });

  return { userId: user.id, temporaryPassword };
}

export async function updateAccountUser(
  ctx: AuthContext,
  input: { userId: string; name: string; roleKey: string } & UserExtras,
): Promise<{ clearedReports: number }> {
  const actorRole = actorManagementRole(ctx);
  const target = await loadTargetUser(ctx, input.userId);
  const currentRole = primaryRoleKey(target);

  // Editing requires authority over both the current and the new role
  // (keeping the current role is always allowed so the form doesn't silently
  // change it — prototype behaviour).
  if (!canCreateRole(actorRole, currentRole) && currentRole !== input.roleKey) {
    throw new ForbiddenError("You can't change this user's role.");
  }
  if (input.roleKey !== currentRole && !canCreateRole(actorRole, input.roleKey)) {
    throw new ForbiddenError(`You don't have permission to assign ${input.roleKey}.`);
  }

  // Last-admin guard when moving someone off the owner role.
  if (currentRole === "AGENCY_OWNER" && input.roleKey !== "AGENCY_OWNER") {
    await assertNotLastOwner(ctx.accountId!, target.id, "AGENCY_OWNER");
  }

  const extras = extrasForRole(input.roleKey, input);
  await validateTeamLead(ctx.accountId!, extras.teamLeadId);

  const wasTeamLead = currentRole === "AGENCY_TEAM_LEAD";
  const staysTeamLead = input.roleKey === "AGENCY_TEAM_LEAD";

  const clearedReports = await prisma.$transaction(async (tx) => {
    let cleared = 0;
    // Role change away from Team Lead → reports become explicitly unassigned.
    if (wasTeamLead && !staysTeamLead) {
      const result = await tx.user.updateMany({
        where: { teamLeadId: target.id },
        data: { teamLeadId: null },
      });
      cleared = result.count;
    }

    if (input.roleKey !== currentRole) {
      const newRole = await tx.role.findUniqueOrThrow({ where: { key: input.roleKey } });
      await tx.userRole.deleteMany({ where: { userId: target.id } });
      await tx.userRole.create({ data: { userId: target.id, roleId: newRole.id } });
    }

    await tx.user.update({
      where: { id: target.id },
      data: { name: input.name, ...extras },
    });

    return cleared;
  });

  await recordAudit({
    action:
      input.roleKey !== currentRole ? AUDIT_ACTIONS.USER_ROLE_CHANGED : AUDIT_ACTIONS.USER_UPDATED,
    actorUserId: ctx.userId,
    accountId: ctx.accountId,
    entityType: "User",
    entityId: target.id,
    metadata: { from: currentRole, to: input.roleKey, clearedReports },
  });

  return { clearedReports };
}

export async function setUserSuspension(
  ctx: AuthContext,
  input: { userId: string; suspend: boolean },
): Promise<void> {
  actorManagementRole(ctx);
  const target = await loadTargetUser(ctx, input.userId);

  if (target.id === ctx.userId) throw new ValidationError("You can't suspend yourself.");
  const targetRole = primaryRoleKey(target);
  if (input.suspend && (targetRole === "AGENCY_OWNER" || targetRole === "DMC_OWNER")) {
    await assertNotLastOwner(ctx.accountId!, target.id, targetRole);
  }

  // Suspension is reversible and does NOT clear teamLeadId links (PRD rule) —
  // the UI surfaces how many reports are affected instead.
  await prisma.user.update({
    where: { id: target.id },
    data: { status: input.suspend ? "SUSPENDED" : "ACTIVE" },
  });

  await recordAudit({
    action: input.suspend ? AUDIT_ACTIONS.USER_SUSPENDED : AUDIT_ACTIONS.USER_REACTIVATED,
    actorUserId: ctx.userId,
    accountId: ctx.accountId,
    entityType: "User",
    entityId: target.id,
  });
}

export async function removeAccountUser(
  ctx: AuthContext,
  input: { userId: string },
): Promise<void> {
  actorManagementRole(ctx);
  const target = await loadTargetUser(ctx, input.userId);

  if (target.id === ctx.userId) throw new ValidationError("You can't remove yourself.");
  const targetRole = primaryRoleKey(target);
  if (targetRole === "AGENCY_OWNER" || targetRole === "DMC_OWNER") {
    await assertNotLastOwner(ctx.accountId!, target.id, targetRole);
  }

  // Removal (not reversible): leads unassigned, reports explicitly cleared.
  await prisma.$transaction([
    prisma.lead.updateMany({
      where: { assignedToId: target.id },
      data: { assignedToId: null },
    }),
    prisma.user.updateMany({
      where: { teamLeadId: target.id },
      data: { teamLeadId: null },
    }),
    prisma.user.update({
      where: { id: target.id },
      data: { status: "REMOVED", teamLeadId: null },
    }),
  ]);

  await recordAudit({
    action: AUDIT_ACTIONS.USER_REMOVED,
    actorUserId: ctx.userId,
    accountId: ctx.accountId,
    entityType: "User",
    entityId: target.id,
    metadata: { roleKey: targetRole },
  });
}

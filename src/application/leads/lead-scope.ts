import "server-only";
import type { Prisma } from "@prisma/client";
import type { AuthContext } from "@/application/auth/session";
import { LEAD_SCOPE, type LeadScope } from "@/domain/rbac/roles";
import { prisma } from "@/infrastructure/db/prisma";

/**
 * Lead visibility scoping (PRD Section 4, rule 6):
 * - all:          every lead on the account
 * - team:         leads assigned to the Team Lead themself or to Executives
 *                 whose teamLeadId === their id (explicit reference, never
 *                 label matching)
 * - destinations: leads whose destination matches assignedDestinations
 * - assigned:     leads assigned to or created by the user
 * - none:         nothing (e.g. Accounts role)
 */
export function scopeForRoles(roles: string[]): LeadScope {
  // A user can hold several roles; take the widest scope.
  const order: LeadScope[] = ["all", "team", "destinations", "assigned", "none"];
  let best: LeadScope = "none";
  for (const role of roles) {
    const scope = LEAD_SCOPE[role];
    if (scope && order.indexOf(scope) < order.indexOf(best)) best = scope;
  }
  return best;
}

export async function leadScopeWhere(ctx: AuthContext): Promise<Prisma.LeadWhereInput> {
  const base: Prisma.LeadWhereInput = { accountId: ctx.accountId! };
  const scope = scopeForRoles(ctx.roles);

  switch (scope) {
    case "all":
      return base;
    case "team": {
      const reports = await prisma.user.findMany({
        where: { teamLeadId: ctx.userId, status: { not: "REMOVED" } },
        select: { id: true },
      });
      const ids = [ctx.userId, ...reports.map((r) => r.id)];
      return { ...base, OR: [{ assignedToId: { in: ids } }, { createdById: { in: ids } }] };
    }
    case "destinations": {
      const destinations = ctx.user.assignedDestinations;
      if (destinations.length === 0) return { ...base, id: "__none__" };
      return {
        ...base,
        OR: destinations.map((d) => ({
          destination: { contains: d, mode: "insensitive" as const },
        })),
      };
    }
    case "assigned":
      return {
        ...base,
        OR: [{ assignedToId: ctx.userId }, { createdById: ctx.userId }],
      };
    case "none":
    default:
      return { ...base, id: "__none__" };
  }
}

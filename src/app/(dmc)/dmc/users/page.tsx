import type { Metadata } from "next";
import { Plus, Users } from "lucide-react";
import { requirePermissionPage } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
import {
  CAN_CREATE_ROLES,
  ROLE_DISPLAY_NAMES,
  roleExtraField,
  type RoleKey,
} from "@/domain/rbac/roles";
import { UserFormDialog, type RoleOption } from "@/features/team/components/user-form-dialog";
import { UserRowActions } from "@/features/team/components/user-row-actions";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

export const metadata: Metadata = { title: "Users & roles" };

/**
 * DMC-side team management — same generic user-service/RBAC machinery as
 * the agency dashboard's /dashboard/users (DMC_OWNER can create DMC_STAFF,
 * per CAN_CREATE_ROLES), just missing a page on this surface until now.
 */
export default async function DmcUsersPage() {
  const ctx = await requirePermissionPage("users:manage");

  const actorRole = ctx.roles.find((r) => (CAN_CREATE_ROLES[r] ?? []).length > 0);
  const creatableRoles = actorRole ? CAN_CREATE_ROLES[actorRole]! : [];

  const roleOptions: RoleOption[] = creatableRoles.map((key: RoleKey) => ({
    key,
    name: ROLE_DISPLAY_NAMES[key],
    extraField: roleExtraField(key),
  }));

  const users = await prisma.user.findMany({
    where: { accountId: ctx.accountId!, status: { not: "REMOVED" } },
    orderBy: { createdAt: "asc" },
    include: {
      roles: { include: { role: { select: { key: true, name: true } } } },
      teamLead: { select: { name: true } },
      _count: {
        select: {
          reports: { where: { status: "ACTIVE" } },
          assignedLeads: { where: { lifecycleStatus: "ACTIVE" } },
        },
      },
    },
  });

  const teamLeads = users
    .filter((u) => u.status === "ACTIVE" && u.roles.some((r) => r.role.key === "AGENCY_TEAM_LEAD"))
    .map((u) => ({ id: u.id, name: u.name }));

  const reportNamesFor = (userId: string): string[] =>
    users.filter((u) => u.teamLeadId === userId && u.status === "ACTIVE").map((u) => u.name);

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Add teammates and set what they can see."
        actions={
          roleOptions.length > 0 && (
            <UserFormDialog
              roleOptions={roleOptions}
              teamLeads={teamLeads}
              trigger={
                <Button>
                  <Plus className="mr-1 h-4 w-4" /> Add user
                </Button>
              }
            />
          )
        }
      />

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Add your first teammate to help manage quote requests."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const roleKey = u.roles[0]?.role.key ?? "";
              const roleName = u.roles[0]?.role.name ?? "—";
              const isSelf = u.id === ctx.userId;
              const editable =
                roleOptions.some((r) => r.key === roleKey) || (isSelf && Boolean(actorRole));

              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">
                      {u.name}
                      {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{roleName}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === "ACTIVE" ? "success" : "warning"}>
                      {u.status === "ACTIVE" ? "active" : "suspended"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {editable ? (
                      <UserRowActions
                        user={{
                          userId: u.id,
                          name: u.name,
                          email: u.email,
                          roleKey,
                          teamType: u.teamType ?? "",
                          teamLeadId: u.teamLeadId ?? "",
                          destinations: u.assignedDestinations.join(", "),
                          suspended: u.status === "SUSPENDED",
                        }}
                        roleOptions={roleOptions}
                        teamLeads={teamLeads.filter((tl) => tl.id !== u.id)}
                        reportNames={reportNamesFor(u.id)}
                        assignedLeadCount={u._count.assignedLeads}
                        isSelf={isSelf}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}

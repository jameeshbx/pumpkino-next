import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { requirePermissionPage } from "@/application/auth/session";
import { leadScopeWhere } from "@/application/leads/lead-scope";
import { prisma } from "@/infrastructure/db/prisma";
import { LEAD_STAGES, LEAD_STAGE_LABELS } from "@/domain/pipeline/lifecycle";
import { AddLeadDialog } from "@/features/leads/components/add-lead-dialog";
import { LeadCardActions } from "@/features/leads/components/lead-card-actions";
import { ROLE_DISPLAY_NAMES, type RoleKey } from "@/domain/rbac/roles";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { formatCurrency, formatDate } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "Leads & pipeline" };

/**
 * Pipeline board (prototype "Leads and pipeline"): one column per funnel
 * stage; lost/cancelled records are excluded (they live in their own list).
 * Visibility is scoped by role (all / team / destinations / assigned).
 */
export default async function LeadsPage() {
  const ctx = await requirePermissionPage("leads:read");
  const where = await leadScopeWhere(ctx);

  const [leads, teammates] = await Promise.all([
    prisma.lead.findMany({
      where: { ...where, lifecycleStatus: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      include: { assignedTo: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: {
        accountId: ctx.accountId!,
        status: "ACTIVE",
        roles: { none: { role: { key: "AGENCY_OWNER" } } },
      },
      select: { id: true, name: true, roles: { select: { role: { select: { key: true } } } } },
    }),
  ]);

  const canManage = ctx.permissions.has("leads:manage");
  const assignableUsers = teammates.map((t) => ({
    id: t.id,
    name: t.name,
    role: t.roles.map((r) => ROLE_DISPLAY_NAMES[r.role.key as RoleKey] ?? r.role.key).join(", "),
  }));

  return (
    <>
      <PageHeader
        title="Leads & pipeline"
        description={`${leads.length} active lead${leads.length === 1 ? "" : "s"} in your scope.`}
        actions={canManage ? <AddLeadDialog assignableUsers={assignableUsers} /> : undefined}
      />

      {leads.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No active leads"
          description="Add your first lead to start the pipeline. Lost and cancelled leads live in their own list."
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {LEAD_STAGES.map((stage) => {
            const column = leads.filter((l) => l.stage === stage);
            return (
              <section
                key={stage}
                aria-label={LEAD_STAGE_LABELS[stage]}
                className="w-64 shrink-0 rounded-xl bg-muted/50 p-3"
              >
                <header className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {LEAD_STAGE_LABELS[stage]}
                  </h2>
                  <Badge variant="muted">{column.length}</Badge>
                </header>
                <div className="space-y-2">
                  {column.map((lead) => (
                    <Card key={lead.id}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{lead.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {lead.destination}
                              {lead.pax ? ` · ${lead.pax}` : ""}
                            </p>
                          </div>
                          {canManage && (
                            <LeadCardActions
                              leadId={lead.id}
                              leadName={lead.name}
                              stage={lead.stage}
                            />
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          {lead.startDate && <span>🗓 {formatDate(lead.startDate)}</span>}
                          {(lead.finalPrice ?? lead.quotedPrice) && (
                            <span className="font-medium text-foreground">
                              {formatCurrency(lead.finalPrice ?? lead.quotedPrice ?? 0)}
                            </span>
                          )}
                          {lead.dmcName && <span>via {lead.dmcName}</span>}
                        </div>
                        {lead.assignedTo && (
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            → {lead.assignedTo.name}
                          </p>
                        )}
                        {lead.importedNotes && (
                          <p className="mt-1.5 rounded bg-muted px-1.5 py-1 text-[11px] text-muted-foreground">
                            {lead.importedNotes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {column.length === 0 && (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">Empty</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

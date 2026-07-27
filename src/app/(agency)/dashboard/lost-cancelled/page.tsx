import type { Metadata } from "next";
import { XCircle } from "lucide-react";
import { requirePermissionPage } from "@/application/auth/session";
import { leadScopeWhere } from "@/application/leads/lead-scope";
import { prisma } from "@/infrastructure/db/prisma";
import {
  AGENCY_LOST_REASONS,
  CANCEL_REASON_LABELS,
  LEAD_STAGE_LABELS,
} from "@/domain/pipeline/lifecycle";
import { LostCancelledActions } from "@/features/leads/components/lost-cancelled-actions";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatDate } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "Lost & cancelled" };

const REFUND_BADGE: Record<string, { label: string; variant: "muted" | "warning" | "success" | "destructive" }> = {
  NOT_APPLICABLE: { label: "n/a", variant: "muted" },
  PENDING: { label: "refund pending", variant: "warning" },
  PROCESSED: { label: "refund processed", variant: "success" },
  DENIED: { label: "refund denied", variant: "destructive" },
};

/**
 * Lost & cancelled list (PRD): a status, not a delete — searchable, refund-
 * trackable, and reopenable (with the processed-refund warning gate).
 */
export default async function LostCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requirePermissionPage("leads:read");
  const { q } = await searchParams;
  const where = await leadScopeWhere(ctx);

  const leads = await prisma.lead.findMany({
    where: {
      ...where,
      lifecycleStatus: { in: ["LOST", "CANCELLED"] },
      ...(q
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { destination: { contains: q, mode: "insensitive" } },
                ],
              },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { activities: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const canManage = ctx.permissions.has("leads:manage");

  const reasonLabel = (lead: (typeof leads)[number]): string => {
    if (lead.lostReason) {
      return (
        AGENCY_LOST_REASONS.find((r) => r.value === lead.lostReason)?.label ??
        lead.lostReason.toLowerCase().replaceAll("_", " ")
      );
    }
    if (lead.cancelReason) return CANCEL_REASON_LABELS[lead.cancelReason];
    return "—";
  };

  return (
    <>
      <PageHeader
        title="Lost & cancelled"
        description="Everything that left the active pipeline — with reasons, refund tracking, and reopen."
      />

      <form className="mb-4" action="/dashboard/lost-cancelled" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by customer or destination…"
          aria-label="Search lost and cancelled leads"
          className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {leads.length === 0 ? (
        <EmptyState
          icon={XCircle}
          title={q ? "No matches" : "Nothing here — good sign!"}
          description={
            q
              ? "Try a different search."
              : "Leads marked lost or bookings cancelled will appear here, reopenable at any time."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Exited at</TableHead>
              <TableHead>Refund</TableHead>
              <TableHead>Last activity</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const rb = REFUND_BADGE[lead.refundStatus] ?? REFUND_BADGE.NOT_APPLICABLE!;
              return (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="font-medium">{lead.name}</div>
                    <div className="text-xs text-muted-foreground">{lead.destination}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={lead.lifecycleStatus === "LOST" ? "muted" : "destructive"}>
                      {lead.lifecycleStatus.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-52 text-sm">{reasonLabel(lead)}</TableCell>
                  <TableCell className="text-sm">
                    {lead.exitedAtStage ? LEAD_STAGE_LABELS[lead.exitedAtStage] : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rb.variant}>{rb.label}</Badge>
                  </TableCell>
                  <TableCell className="max-w-64">
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.activities[0]
                        ? `${lead.activities[0].message} · ${formatDate(lead.activities[0].createdAt)}`
                        : formatDate(lead.updatedAt)}
                    </p>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <LostCancelledActions
                        leadId={lead.id}
                        leadName={lead.name}
                        refundStatus={lead.refundStatus}
                        refundEditable={lead.lifecycleStatus === "CANCELLED"}
                      />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}

import type { Metadata } from "next";
import { XCircle } from "lucide-react";
import { requirePermissionPage } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
import {
  CANCEL_REASON_LABELS,
  DMC_LOST_REASONS,
  REQUEST_STAGE_LABELS,
} from "@/domain/pipeline/lifecycle";
import { RequestLostActions } from "@/features/quotes/components/request-lost-actions";
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

export default async function DmcLostCancelledPage() {
  const ctx = await requirePermissionPage("quotes:read");

  const requests = await prisma.quoteRequest.findMany({
    where: { dmcAccountId: ctx.accountId!, lifecycleStatus: { in: ["LOST", "CANCELLED"] } },
    orderBy: { updatedAt: "desc" },
  });

  const canManage = ctx.permissions.has("quotes:manage");

  const reasonLabel = (r: (typeof requests)[number]): string => {
    if (r.lostReason) {
      return (
        DMC_LOST_REASONS.find((x) => x.value === r.lostReason)?.label ??
        r.lostReason.toLowerCase().replaceAll("_", " ")
      );
    }
    if (r.cancelReason) return CANCEL_REASON_LABELS[r.cancelReason];
    return "—";
  };

  return (
    <>
      <PageHeader
        title="Lost & cancelled"
        description="Requests that left the pipeline — reopenable, with refund tracking for cancelled bookings."
      />

      {requests.length === 0 ? (
        <EmptyState
          icon={XCircle}
          title="Nothing here"
          description="Requests marked lost or bookings cancelled will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agency</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Exited at</TableHead>
              <TableHead>IDs</TableHead>
              <TableHead>Refund</TableHead>
              <TableHead>Updated</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => {
              const rb = REFUND_BADGE[r.refundStatus] ?? REFUND_BADGE.NOT_APPLICABLE!;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.agencyName}</div>
                    <div className="text-xs text-muted-foreground">{r.destination}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.lifecycleStatus === "LOST" ? "muted" : "destructive"}>
                      {r.lifecycleStatus.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-52 text-sm">{reasonLabel(r)}</TableCell>
                  <TableCell className="text-sm">
                    {r.exitedAtStage ? REQUEST_STAGE_LABELS[r.exitedAtStage] : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {r.quoteId && <Badge variant="muted">{r.quoteId}</Badge>}
                      {r.bookingId && <Badge variant="muted">{r.bookingId}</Badge>}
                      {!r.quoteId && !r.bookingId && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rb.variant}>{rb.label}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(r.updatedAt)}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <RequestLostActions
                        requestId={r.id}
                        agencyName={r.agencyName}
                        refundStatus={r.refundStatus}
                        refundEditable={r.lifecycleStatus === "CANCELLED"}
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

import Link from "next/link";
import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { requirePermissionPage } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
import { REQUEST_STAGE_LABELS } from "@/domain/pipeline/lifecycle";
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
import { formatCurrency, formatDate } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "Quote requests" };

/**
 * Agency-side view of the shared quote_requests table: every request this
 * agency sent, with live DMC-side status. Nothing here updates on its own —
 * a quote appears only when the DMC actually sends one (PRD async rule).
 */
export default async function AgencyQuoteRequestsPage() {
  const ctx = await requirePermissionPage("leads:read");

  const requests = await prisma.quoteRequest.findMany({
    where: { agencyAccountId: ctx.accountId! },
    orderBy: { createdAt: "desc" },
    include: { listing: { select: { name: true, verified: true } } },
  });

  return (
    <>
      <PageHeader
        title="Quote requests"
        description="Requests you've sent to DMCs and their current status. DMCs reply on their own schedule."
        actions={
          <Button asChild variant="outline">
            <Link href="/marketplace">Find DMCs</Link>
          </Button>
        }
      />

      {requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No quote requests yet"
          description="Find a DMC in the marketplace and send your first request. Paid plans unlock quote requests."
          action={
            <Button asChild>
              <Link href="/marketplace">Browse marketplace</Link>
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>DMC</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Travellers</TableHead>
              <TableHead>Travel date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quote</TableHead>
              <TableHead>Sent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.listing?.name ?? "DMC"}</TableCell>
                <TableCell>{r.destination}</TableCell>
                <TableCell>{r.pax}</TableCell>
                <TableCell>{formatDate(r.startDate)}</TableCell>
                <TableCell>
                  {r.lifecycleStatus !== "ACTIVE" ? (
                    <Badge variant="destructive">{r.lifecycleStatus.toLowerCase()}</Badge>
                  ) : r.stage === "NEW" || r.stage === "REVIEW" ? (
                    <Badge variant="warning">Awaiting response</Badge>
                  ) : (
                    <Badge variant={r.stage === "DONE" ? "success" : "secondary"}>
                      {REQUEST_STAGE_LABELS[r.stage]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {r.quotedPrice ? (
                    <div>
                      <span className="font-medium tabular-nums">{formatCurrency(r.quotedPrice)}</span>
                      {r.quoteId && (
                        <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                          {r.quoteId}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

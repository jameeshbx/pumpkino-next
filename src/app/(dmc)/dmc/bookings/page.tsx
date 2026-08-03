import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { requirePermissionPage } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "@/shared/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatCurrency, formatDate } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "Confirmed bookings" };

/**
 * All fully-paid (DONE-stage) requests, regardless of travel date --
 * distinct from /dmc/upcoming, which only shows future-dated ones. Matches
 * the prototype's DMC portal nav, which lists these as two separate items.
 */
export default async function DmcConfirmedBookingsPage() {
  const ctx = await requirePermissionPage("quotes:read");

  const bookings = await prisma.quoteRequest.findMany({
    where: { dmcAccountId: ctx.accountId!, lifecycleStatus: "ACTIVE", stage: "DONE" },
    orderBy: { startDate: "desc" },
  });

  const totalValue = bookings.reduce((sum, b) => sum + (b.quotedPrice ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Confirmed bookings"
        description={`${bookings.length} fully-paid booking${bookings.length === 1 ? "" : "s"} · ${formatCurrency(totalValue)} total.`}
      />

      {bookings.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No confirmed bookings yet"
          description="Fully-paid requests show up here — see Upcoming trips for the ones still ahead of you."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agency</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Travel date</TableHead>
              <TableHead>Booking ID</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.agencyName}</TableCell>
                <TableCell>{b.destination}</TableCell>
                <TableCell>{b.startDate ? formatDate(b.startDate) : "—"}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {b.bookingId ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.quotedPrice ? formatCurrency(b.quotedPrice) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

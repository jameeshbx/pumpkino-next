import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { requirePermissionPage } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
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
import { formatCurrency, formatDate } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "Upcoming trips" };

/** Active requests (payment/done) with future travel dates — mirrors the agency dashboard's equivalent view. */
export default async function DmcUpcomingTripsPage() {
  const ctx = await requirePermissionPage("quotes:read");

  const trips = await prisma.quoteRequest.findMany({
    where: {
      dmcAccountId: ctx.accountId!,
      lifecycleStatus: "ACTIVE",
      stage: { in: ["PAYMENT", "DONE"] },
      startDate: { gte: new Date() },
    },
    orderBy: { startDate: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Upcoming trips"
        description="Confirmed and payment-pending bookings with future travel dates."
      />

      {trips.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No upcoming trips"
          description="Requests in the payment or booked stage with future travel dates show up here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agency</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Travel date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Booking ID</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trips.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.agencyName}</TableCell>
                <TableCell>{t.destination}</TableCell>
                <TableCell>{formatDate(t.startDate)}</TableCell>
                <TableCell>
                  <Badge variant={t.stage === "DONE" ? "success" : "warning"}>
                    {t.stage === "DONE" ? "Paid & booked" : "Payment pending"}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {t.bookingId ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {t.quotedPrice ? formatCurrency(t.quotedPrice) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

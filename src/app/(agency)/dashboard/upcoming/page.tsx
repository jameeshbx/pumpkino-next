import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { requirePermissionPage } from "@/application/auth/session";
import { leadScopeWhere } from "@/application/leads/lead-scope";
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

/** Active bookings (payment/done) with future travel dates. */
export default async function UpcomingTripsPage() {
  const ctx = await requirePermissionPage("leads:read");
  const where = await leadScopeWhere(ctx);

  const trips = await prisma.lead.findMany({
    where: {
      ...where,
      lifecycleStatus: "ACTIVE",
      stage: { in: ["PAYMENT", "DONE"] },
      startDate: { gte: new Date() },
    },
    orderBy: { startDate: "asc" },
    include: { assignedTo: { select: { name: true } } },
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
          description="Bookings in the payment or booked stage with future travel dates show up here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Travel date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>DMC</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trips.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{t.destination}</TableCell>
                <TableCell>{formatDate(t.startDate)}</TableCell>
                <TableCell>
                  <Badge variant={t.stage === "DONE" ? "success" : "warning"}>
                    {t.stage === "DONE" ? "Paid & booked" : "Payment pending"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.dmcName ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t.assignedTo?.name ?? "Unassigned"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {t.finalPrice ? formatCurrency(t.finalPrice) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { CalendarClock, ClipboardList, Hourglass, Wallet } from "lucide-react";
import { requireAuth } from "@/application/auth/session";
import { leadScopeWhere } from "@/application/leads/lead-scope";
import { prisma } from "@/infrastructure/db/prisma";
import { LEAD_STAGES, LEAD_STAGE_LABELS } from "@/domain/pipeline/lifecycle";
import { PageHeader } from "@/shared/components/page-header";
import { StatCard } from "@/shared/components/stat-card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AgencyDashboardPage() {
  const ctx = await requireAuth();
  const where = await leadScopeWhere(ctx);

  const [activeLeads, awaitingQuote, upcoming, bookedValue, byStage] = await Promise.all([
    prisma.lead.count({ where: { ...where, lifecycleStatus: "ACTIVE" } }),
    prisma.lead.count({ where: { ...where, lifecycleStatus: "ACTIVE", stage: "SENT" } }),
    prisma.lead.count({
      where: {
        ...where,
        lifecycleStatus: "ACTIVE",
        stage: { in: ["PAYMENT", "DONE"] },
        startDate: { gte: new Date() },
      },
    }),
    prisma.lead.aggregate({
      where: { ...where, lifecycleStatus: "ACTIVE", stage: "DONE" },
      _sum: { finalPrice: true },
    }),
    prisma.lead.groupBy({
      by: ["stage"],
      where: { ...where, lifecycleStatus: "ACTIVE" },
      _count: true,
    }),
  ]);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${ctx.name.split(" ")[0]}`}
        description={ctx.account?.name}
        actions={
          <Button asChild>
            <Link href="/dashboard/leads">Open pipeline</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active leads" value={activeLeads} icon={ClipboardList} />
        <StatCard label="Awaiting customer reply" value={awaitingQuote} icon={Hourglass} hint="itinerary sent" />
        <StatCard label="Upcoming trips" value={upcoming} icon={CalendarClock} />
        <StatCard
          label="Booked value"
          value={formatCurrency(bookedValue._sum.finalPrice ?? 0)}
          icon={Wallet}
          hint="fully paid bookings"
        />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Pipeline snapshot</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {LEAD_STAGES.map((stage) => {
            const count = byStage.find((s) => s.stage === stage)?._count ?? 0;
            return (
              <Link key={stage} href="/dashboard/leads">
                <Badge variant={count > 0 ? "secondary" : "muted"} className="px-3 py-1.5 text-sm">
                  {LEAD_STAGE_LABELS[stage]}: {count}
                </Badge>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}

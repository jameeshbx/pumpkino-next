import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Inbox, Send, Wallet } from "lucide-react";
import { requireAuth } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
import { REQUEST_STAGES, REQUEST_STAGE_LABELS } from "@/domain/pipeline/lifecycle";
import { PageHeader } from "@/shared/components/page-header";
import { StatCard } from "@/shared/components/stat-card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "DMC dashboard" };

export default async function DmcDashboardPage() {
  const ctx = await requireAuth();
  const accountId = ctx.accountId!;

  const [newRequests, quotesSent, booked, bookedValue, byStage] = await Promise.all([
    prisma.quoteRequest.count({
      where: { dmcAccountId: accountId, lifecycleStatus: "ACTIVE", stage: "NEW" },
    }),
    prisma.quoteRequest.count({
      where: { dmcAccountId: accountId, lifecycleStatus: "ACTIVE", stage: "SENT" },
    }),
    prisma.quoteRequest.count({
      where: { dmcAccountId: accountId, lifecycleStatus: "ACTIVE", stage: "DONE" },
    }),
    prisma.quoteRequest.aggregate({
      where: { dmcAccountId: accountId, lifecycleStatus: "ACTIVE", stage: "DONE" },
      _sum: { quotedPrice: true },
    }),
    prisma.quoteRequest.groupBy({
      by: ["stage"],
      where: { dmcAccountId: accountId, lifecycleStatus: "ACTIVE" },
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
            <Link href="/dmc/requests">Open request inbox</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New requests" value={newRequests} icon={Inbox} hint="awaiting first response" />
        <StatCard label="Quotes awaiting reply" value={quotesSent} icon={Send} />
        <StatCard label="Confirmed bookings" value={booked} icon={CheckCircle2} />
        <StatCard
          label="Booked value"
          value={formatCurrency(bookedValue._sum.quotedPrice ?? 0)}
          icon={Wallet}
          hint="fully paid bookings"
        />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Request pipeline</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {REQUEST_STAGES.map((stage) => {
            const count = byStage.find((s) => s.stage === stage)?._count ?? 0;
            return (
              <Link key={stage} href="/dmc/requests">
                <Badge variant={count > 0 ? "secondary" : "muted"} className="px-3 py-1.5 text-sm">
                  {REQUEST_STAGE_LABELS[stage]}: {count}
                </Badge>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}

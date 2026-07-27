import type { Metadata } from "next";
import { Banknote, Building2, Flag, ShieldCheck } from "lucide-react";
import { requireAuth } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
import { PageHeader } from "@/shared/components/page-header";
import { StatCard } from "@/shared/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatCurrency, formatDate } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "Ops overview" };

export default async function AdminOverviewPage() {
  await requireAuth(); // layout enforces platform staff

  const [agencies, dmcs, pendingVerifications, openDisputes, mrr, recentSignups] =
    await Promise.all([
      prisma.account.count({ where: { type: "AGENCY" } }),
      prisma.account.count({ where: { type: "DMC" } }),
      prisma.account.count({ where: { verificationStatus: "SUBMITTED" } }),
      prisma.dispute.count({ where: { status: "OPEN" } }),
      prisma.account.aggregate({ _sum: { mrr: true } }),
      prisma.account.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, name: true, type: true, plan: true, country: true, createdAt: true },
      }),
    ]);

  return (
    <>
      <PageHeader title="Overview" description="Platform health at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Agencies" value={agencies} icon={Building2} hint={`${dmcs} DMCs`} />
        <StatCard
          label="Verification queue"
          value={pendingVerifications}
          icon={ShieldCheck}
          hint="awaiting review"
        />
        <StatCard label="Open disputes" value={openDisputes} icon={Flag} />
        <StatCard
          label="MRR"
          value={formatCurrency(mrr._sum.mrr ?? 0)}
          icon={Banknote}
          hint="sum of active plans"
        />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent signups</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {recentSignups.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium">{a.name}</span>
                  <span className="ml-2 text-xs uppercase text-muted-foreground">{a.type}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {a.plan.toLowerCase()} · {a.country} · {formatDate(a.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

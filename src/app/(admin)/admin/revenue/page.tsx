import type { Metadata } from "next";
import { Banknote, CircleDollarSign, TrendingUp } from "lucide-react";
import { requirePermissionPage } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
import { PLAN_CATALOGUE } from "@/domain/billing/plans";
import { PageHeader } from "@/shared/components/page-header";
import { StatCard } from "@/shared/components/stat-card";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatCurrency, formatDate } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "Subscriptions & revenue" };

export default async function AdminRevenuePage() {
  await requirePermissionPage("platform:revenue:read");

  const [mrr, activeSubs, invoices, planBreakdown] = await Promise.all([
    prisma.account.aggregate({ _sum: { mrr: true } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.invoice.findMany({
      orderBy: { issuedAt: "desc" },
      take: 30,
      include: { account: { select: { name: true } } },
    }),
    prisma.account.groupBy({ by: ["plan"], _count: true, where: { type: "AGENCY" } }),
  ]);

  const totalInvoiced = invoices.reduce(
    (sum, inv) => sum + (inv.currency === "INR" ? inv.amount : inv.amount * 84),
    0,
  );

  return (
    <>
      <PageHeader title="Subscriptions & revenue" description="Recurring revenue and invoices." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="MRR" value={formatCurrency(mrr._sum.mrr ?? 0)} icon={Banknote} />
        <StatCard label="Active subscriptions" value={activeSubs} icon={TrendingUp} />
        <StatCard
          label="Recent invoiced (₹ equiv.)"
          value={formatCurrency(totalInvoiced)}
          icon={CircleDollarSign}
          hint="last 30 invoices"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Agencies by plan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {PLAN_CATALOGUE.map((p) => {
            const count = planBreakdown.find((b) => b.plan === p.plan)?._count ?? 0;
            return (
              <Badge key={p.plan} variant="secondary" className="px-3 py-1.5 text-sm">
                {p.name}: {count}
              </Badge>
            );
          })}
          <Badge variant="muted" className="px-3 py-1.5 text-sm">
            Free: {planBreakdown.find((b) => b.plan === "FREE")?._count ?? 0}
          </Badge>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Recent invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                  <TableCell>{inv.account.name}</TableCell>
                  <TableCell>{inv.description}</TableCell>
                  <TableCell className="capitalize">{inv.gateway.toLowerCase()}</TableCell>
                  <TableCell>{formatDate(inv.issuedAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(inv.amount, inv.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

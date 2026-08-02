import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { requirePermissionPage } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
import { defaultGatewayForCountry, planDefinition } from "@/domain/billing/plans";
import { PlanPicker } from "@/features/billing/components/plan-picker";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "@/shared/components/empty-state";
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

export const metadata: Metadata = { title: "Subscription & billing" };

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const ctx = await requirePermissionPage("billing:manage");
  const { plan: preselect } = await searchParams;

  const account = await prisma.account.findUniqueOrThrow({
    where: { id: ctx.accountId! },
    select: {
      plan: true,
      country: true,
      trialEndsAt: true,
      subscriptions: { where: { status: "ACTIVE" }, take: 1, select: { billingCycle: true } },
    },
  });
  const invoices = await prisma.invoice.findMany({
    where: { accountId: ctx.accountId! },
    orderBy: { issuedAt: "desc" },
    take: 24,
  });

  const currentDef = planDefinition(account.plan);
  const trialDaysLeft = account.trialEndsAt
    ? Math.max(0, Math.ceil((account.trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <>
      <PageHeader
        title="Subscription & billing"
        description="Manage your plan and download billing history."
        actions={
          <Badge variant="secondary" className="text-sm">
            Current: {currentDef?.name ?? account.plan}
            {account.plan === "TRIAL" && trialDaysLeft !== null && ` · ${trialDaysLeft}d left`}
          </Badge>
        }
      />

      <PlanPicker
        currentPlan={account.plan}
        currentBillingCycle={account.subscriptions[0]?.billingCycle ?? "MONTHLY"}
        defaultGateway={defaultGatewayForCountry(account.country).gateway}
        preselect={preselect}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Billing history</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices yet"
              description="Invoices appear here as soon as you subscribe to a paid plan."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                    <TableCell>{inv.description}</TableCell>
                    <TableCell className="capitalize">{inv.gateway.toLowerCase()}</TableCell>
                    <TableCell>{formatDate(inv.issuedAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(inv.amount, inv.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={inv.status === "PAID" ? "success" : "warning"}>
                        {inv.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

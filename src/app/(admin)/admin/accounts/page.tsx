import type { Metadata } from "next";
import { requirePermissionPage } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
import { AccountSuspensionButton } from "@/features/admin/components/account-suspension-button";
import { PageHeader } from "@/shared/components/page-header";
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

export const metadata: Metadata = { title: "Accounts" };

const VERIFICATION_BADGE: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "muted" }> = {
  APPROVED: { label: "verified", variant: "success" },
  SUBMITTED: { label: "in review", variant: "warning" },
  REJECTED: { label: "rejected", variant: "destructive" },
  NOT_SUBMITTED: { label: "not submitted", variant: "muted" },
};

export default async function AdminAccountsPage() {
  await requirePermissionPage("platform:accounts:manage");

  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true } } },
  });

  return (
    <>
      <PageHeader
        title="Accounts"
        description={`${accounts.length} customer accounts — agencies and DMCs.`}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Verification</TableHead>
            <TableHead>MRR</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((a) => {
            const vb = VERIFICATION_BADGE[a.verificationStatus] ?? VERIFICATION_BADGE.NOT_SUBMITTED!;
            return (
              <TableRow key={a.id} className={a.suspended ? "opacity-60" : undefined}>
                <TableCell>
                  <div className="font-medium">
                    {a.name}
                    {a.suspended && (
                      <Badge variant="destructive" className="ml-2">
                        suspended
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.email} · {[a.city, a.country].filter(Boolean).join(", ")}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="muted">{a.type}</Badge>
                </TableCell>
                <TableCell className="capitalize">{a.plan.toLowerCase()}</TableCell>
                <TableCell>
                  <Badge variant={vb.variant}>{vb.label}</Badge>
                </TableCell>
                <TableCell className="tabular-nums">{formatCurrency(a.mrr)}</TableCell>
                <TableCell>{a._count.users}</TableCell>
                <TableCell>{formatDate(a.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <AccountSuspensionButton
                    accountId={a.id}
                    accountName={a.name}
                    suspended={a.suspended}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}

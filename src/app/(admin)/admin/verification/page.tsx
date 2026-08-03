import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { requirePermissionPage } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
import { VerificationReviewDialog } from "@/features/admin/components/verification-review-dialog";
import { LogDocumentDialog } from "@/features/admin/components/log-document-dialog";
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
import { formatDate } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "Verification queue" };

/**
 * Verification queue (PRD): only SUBMITTED accounts are actionable;
 * NOT_SUBMITTED accounts are listed separately as informational.
 */
export default async function VerificationQueuePage() {
  await requirePermissionPage("platform:verification:review");

  const [queue, notSubmitted] = await Promise.all([
    prisma.verificationSubmission.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { submittedAt: "asc" },
      include: {
        account: {
          select: {
            name: true,
            type: true,
            country: true,
            email: true,
            verificationDocuments: { orderBy: { createdAt: "desc" } },
          },
        },
      },
    }),
    prisma.account.findMany({
      where: { verificationStatus: "NOT_SUBMITTED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        country: true,
        createdAt: true,
        verificationDocuments: { orderBy: { createdAt: "desc" } },
      },
      take: 20,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Verification queue"
        description="Review business verification submissions. Verification never gates product access."
      />

      {queue.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Queue is clear"
          description="No submissions awaiting review."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Docs</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-medium">{s.account.name}</div>
                  <div className="text-xs text-muted-foreground">{s.account.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="muted">{s.account.type}</Badge>
                </TableCell>
                <TableCell>{s.account.country}</TableCell>
                <TableCell>{formatDate(s.submittedAt)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {[s.gstin && "GSTIN", s.iata && "IATA", s.bizReg && "Biz reg", s.fileAttached && "Files"]
                    .filter(Boolean)
                    .join(" · ") || "Free text only"}
                </TableCell>
                <TableCell className="text-right">
                  <VerificationReviewDialog
                    submissionId={s.id}
                    accountId={s.accountId}
                    accountName={s.account.name}
                    details={[
                      { label: "GSTIN", value: s.gstin ?? "" },
                      { label: "IATA", value: s.iata ?? "" },
                      { label: "Business registration", value: s.bizReg ?? "" },
                      { label: "Extra", value: s.extra ?? "" },
                    ]}
                    documents={s.account.verificationDocuments}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Not yet submitted (informational)</CardTitle>
        </CardHeader>
        <CardContent>
          {notSubmitted.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every account has submitted or been reviewed.</p>
          ) : (
            <ul className="divide-y">
              {notSubmitted.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                  <span>
                    {a.name}
                    <span className="ml-2 text-xs uppercase text-muted-foreground">{a.type}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {a.country} · joined {formatDate(a.createdAt)}
                    </span>
                    <LogDocumentDialog
                      accountId={a.id}
                      accountName={a.name}
                      documents={a.verificationDocuments}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

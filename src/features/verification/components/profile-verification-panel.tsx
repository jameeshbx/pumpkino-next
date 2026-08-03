import { BadgeCheck, Clock, ShieldQuestion, XCircle } from "lucide-react";
import { prisma } from "@/infrastructure/db/prisma";
import type { AuthContext } from "@/application/auth/session";
import { VerificationForm } from "@/features/verification/components/verification-form";
import { DocumentList } from "@/features/admin/components/document-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { formatDate } from "@/shared/lib/utils";

/**
 * Shared profile + verification panel (agency & DMC surfaces).
 * Verification is decoupled from access — the copy reinforces that.
 */
export async function ProfileVerificationPanel({ ctx }: { ctx: AuthContext }) {
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: ctx.accountId! },
  });
  const latest = await prisma.verificationSubmission.findFirst({
    where: { accountId: account.id },
    orderBy: { submittedAt: "desc" },
  });
  const documents = await prisma.verificationDocument.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: "desc" },
  });

  const status = account.verificationStatus;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
          <CardDescription>Details captured at signup.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Company</dt>
              <dd className="font-medium">{account.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Contact</dt>
              <dd className="font-medium">{account.contactName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{account.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{account.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Location</dt>
              <dd className="font-medium">
                {[account.city, account.state, account.country].filter(Boolean).join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Member since</dt>
              <dd className="font-medium">{formatDate(account.createdAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Business verification</CardTitle>
            {status === "APPROVED" && (
              <Badge variant="success">
                <BadgeCheck className="mr-1 h-3.5 w-3.5" /> Verified
              </Badge>
            )}
            {status === "SUBMITTED" && (
              <Badge variant="warning">
                <Clock className="mr-1 h-3.5 w-3.5" /> Under review
              </Badge>
            )}
            {status === "REJECTED" && (
              <Badge variant="destructive">
                <XCircle className="mr-1 h-3.5 w-3.5" /> Rejected
              </Badge>
            )}
            {status === "NOT_SUBMITTED" && (
              <Badge variant="muted">
                <ShieldQuestion className="mr-1 h-3.5 w-3.5" /> Not submitted
              </Badge>
            )}
          </div>
          <CardDescription>
            Optional compliance layer for the verified badge. It never blocks your trial,
            subscription, or marketplace browsing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "APPROVED" && (
            <p className="text-sm text-muted-foreground">
              Your business is verified — the ✓ badge shows anywhere your company appears.
            </p>
          )}
          {status === "SUBMITTED" && latest && (
            <p className="text-sm text-muted-foreground">
              Submitted {formatDate(latest.submittedAt)}. Our ops team usually reviews within 2
              business days.
            </p>
          )}
          {status === "REJECTED" && (
            <div className="space-y-4">
              <p className="text-sm text-destructive">
                Your last submission was rejected
                {latest?.reviewNote ? ` — reviewer note: “${latest.reviewNote}”` : ""}. You can
                submit again with corrected details.
              </p>
              <VerificationForm />
            </div>
          )}
          {status === "NOT_SUBMITTED" && <VerificationForm />}

          {documents.length > 0 && (
            <div className="mt-5 space-y-1.5 border-t pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Documents on file
              </p>
              <DocumentList documents={documents} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
